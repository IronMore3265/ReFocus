// Data layer — everything persists to localStorage under the "fs." prefix.

const PREFIX = 'fs.';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
  // Anything watching derived state (e.g. achievement unlocks) listens here.
  window.dispatchEvent(new CustomEvent('fs:changed', { detail: { key } }));
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- dates ----------
export function dayKey(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function todayKey() {
  return dayKey(new Date());
}

export function formatDate(d = new Date()) {
  return (d instanceof Date ? d : new Date(d)).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export function formatTime(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Due-date label: Today / Tomorrow / Overdue-aware short date
export function dueLabel(task) {
  if (task.done) return { text: 'Completed', cls: 'text-secondary' };
  if (!task.due) return { text: 'No due date', cls: 'text-secondary' };
  const now = new Date();
  const due = new Date(task.due);
  if (due < now) return { text: 'Overdue', cls: 'text-error' };
  const today = todayKey();
  const dueDay = dayKey(due);
  const tomorrow = dayKey(new Date(now.getTime() + 86400000));
  if (dueDay === today) return { text: `Due ${formatTime(due)}`, cls: 'text-secondary' };
  if (dueDay === tomorrow) return { text: 'Tomorrow', cls: 'text-secondary' };
  return {
    text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    cls: 'text-secondary',
  };
}

// ---------- settings & profile ----------
const DEFAULT_SETTINGS = {
  focusMin: 25,
  breakMin: 5,
  sessionsPerRound: 4,
  sound: true,
  vibration: true,
  dailyGoalMin: 120,
  theme: 'system', // 'light' | 'dark' | 'system'
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...load('settings', {}) };
}
export function setSettings(patch) {
  save('settings', { ...getSettings(), ...patch });
}

// ---------- timer presets ----------
// preset: { id, name, focusMin, breakMin, sessionsPerRound, custom? }
// Built-ins are constants (not stored, not deletable); user presets persist under fs.presets.
export const BUILTIN_PRESETS = [
  { id: 'classic', name: 'Classic', focusMin: 25, breakMin: 5, sessionsPerRound: 4 },
  { id: 'deep', name: 'Deep Work', focusMin: 50, breakMin: 10, sessionsPerRound: 2 },
  { id: 'quick', name: 'Quick', focusMin: 15, breakMin: 3, sessionsPerRound: 4 },
];
export function getPresets() {
  return [...BUILTIN_PRESETS, ...load('presets', [])];
}
export function addPreset({ name, focusMin, breakMin, sessionsPerRound }) {
  const custom = load('presets', []);
  const preset = { id: uid(), name, focusMin, breakMin, sessionsPerRound, custom: true };
  custom.push(preset);
  save('presets', custom);
  return preset;
}
export function deletePreset(id) {
  save('presets', load('presets', []).filter((p) => p.id !== id));
}

export function getProfile() {
  return { name: '', picture: '', onboarded: false, ...load('profile', {}) };
}
export function setProfile(patch) {
  save('profile', { ...getProfile(), ...patch });
}

// Apify API token — lets book search fall back to the Goodreads scraper.
export function getApifyToken() {
  return load('apifyToken', '');
}
export function setApifyToken(token) {
  if (!token) localStorage.removeItem(PREFIX + 'apifyToken');
  else save('apifyToken', token);
}

// ---------- books ----------
// book: { id, title, author, totalPages, currentPage, cover (data URI/URL | null),
//         synopsis, notes: [{id, text, page, at, updatedAt?}],
//         vocab: [{id, word, phonetic, audio, meanings, synonyms, page, at}],
//         finished: bool, finishedAt, createdAt, updatedAt }
// `notes` and `vocab` are nested in the book rather than being collections of
// their own — they're only ever read through their book.
export function getBooks() {
  return load('books', []);
}
function saveBooks(books) {
  save('books', books);
}
export function getBook(id) {
  return getBooks().find((b) => b.id === id);
}
export function addBook({ title, author, totalPages, currentPage = 0, cover = null, synopsis = '' }) {
  const books = getBooks();
  const book = {
    id: uid(), title, author, totalPages: Number(totalPages) || 0,
    currentPage: Number(currentPage) || 0, cover, synopsis, notes: [], vocab: [], finished: false,
    finishedAt: null, createdAt: Date.now(), updatedAt: Date.now(),
  };
  books.push(book);
  saveBooks(books);
  return book;
}
export function updateBook(id, patch) {
  const books = getBooks();
  const i = books.findIndex((b) => b.id === id);
  if (i === -1) return null;
  const prev = books[i];
  const next = { ...prev, ...patch, updatedAt: Date.now() };
  // log pages read whenever currentPage advances
  if (patch.currentPage !== undefined && Number(patch.currentPage) > prev.currentPage) {
    logReading(id, prev.currentPage, Number(patch.currentPage));
  }
  books[i] = next;
  saveBooks(books);
  return next;
}
export function deleteBook(id) {
  saveBooks(getBooks().filter((b) => b.id !== id));
}
// ---------- book notes ----------
// Books saved before notes/vocab existed have neither key — read them through these.
export function bookNotes(book) {
  return book?.notes || [];
}
export function bookVocab(book) {
  return book?.vocab || [];
}

export function addBookNote(id, text, page) {
  const book = getBook(id);
  if (!book) return;
  // Page 0 is a real page (a foreword, an epigraph), so only an absent page
  // falls back to where the reader is.
  const at = Number.isFinite(Number(page)) ? Number(page) : book.currentPage;
  updateBook(id, { notes: [...bookNotes(book), { id: uid(), text, page: at, at: Date.now() }] });
}
export function updateBookNote(bookId, noteId, patch) {
  const book = getBook(bookId);
  if (!book) return;
  updateBook(bookId, {
    notes: bookNotes(book).map((n) => (n.id === noteId ? { ...n, ...patch, updatedAt: Date.now() } : n)),
  });
}
export function deleteBookNote(bookId, noteId) {
  const book = getBook(bookId);
  if (!book) return;
  updateBook(bookId, { notes: bookNotes(book).filter((n) => n.id !== noteId) });
}

// ---------- book vocabulary ----------
// Every dictionary lookup is logged against the book it was made from. Looking
// the same word up twice refreshes the existing entry instead of stacking a
// duplicate, and moves it back to the top of the list.
export function addBookVocab(bookId, { word, phonetic = '', audio = '', meanings = [], synonyms = [], page }) {
  const book = getBook(bookId);
  if (!book) return null;
  const key = String(word).trim().toLowerCase();
  const existing = bookVocab(book).find((v) => v.word.toLowerCase() === key);
  const entry = {
    id: existing?.id || uid(),
    word, phonetic, audio, meanings, synonyms,
    page: Number.isFinite(Number(page)) ? Number(page) : book.currentPage,
    at: Date.now(),
  };
  updateBook(bookId, {
    vocab: [...bookVocab(book).filter((v) => v.id !== entry.id), entry],
  });
  return entry;
}
// Corrects a saved word after the fact — the page you met it on, mostly.
export function updateBookVocab(bookId, vocabId, patch) {
  const book = getBook(bookId);
  if (!book) return;
  updateBook(bookId, {
    vocab: bookVocab(book).map((v) => (v.id === vocabId ? { ...v, ...patch } : v)),
  });
}
export function deleteBookVocab(bookId, vocabId) {
  const book = getBook(bookId);
  if (!book) return;
  updateBook(bookId, { vocab: bookVocab(book).filter((v) => v.id !== vocabId) });
}
export function currentlyReading() {
  return getBooks()
    .filter((b) => !b.finished)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
export function finishedBooks() {
  return getBooks()
    .filter((b) => b.finished)
    .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));
}

// reading log: { id, bookId, day, from, to, at }
export function getReadingLog() {
  return load('readingLog', []);
}
function logReading(bookId, from, to) {
  const log = getReadingLog();
  log.push({ id: uid(), bookId, day: todayKey(), from, to, at: Date.now() });
  save('readingLog', log);
}

// ---------- tasks ----------
// task: { id, title, description, due (ISO or null), priority: 'low'|'medium'|'high',
//         subtasks: [{id, title, done}], done, completedAt, createdAt }
export function getTasks() {
  return load('tasks', []);
}
function saveTasks(tasks) {
  save('tasks', tasks);
}
export function getTask(id) {
  return getTasks().find((t) => t.id === id);
}
export function addTask({ title, description = '', due = null, priority = 'medium' }) {
  const tasks = getTasks();
  const task = {
    id: uid(), title, description, due, priority,
    subtasks: [], done: false, completedAt: null, createdAt: Date.now(),
  };
  tasks.push(task);
  saveTasks(tasks);
  return task;
}
export function updateTask(id, patch) {
  const tasks = getTasks();
  const i = tasks.findIndex((t) => t.id === id);
  if (i === -1) return null;
  tasks[i] = { ...tasks[i], ...patch };
  saveTasks(tasks);
  return tasks[i];
}
export function toggleTask(id) {
  const task = getTask(id);
  if (!task) return null;
  return updateTask(id, {
    done: !task.done,
    completedAt: !task.done ? Date.now() : null,
  });
}
export function deleteTask(id) {
  saveTasks(getTasks().filter((t) => t.id !== id));
}
export function openTasks() {
  return getTasks().filter((t) => !t.done);
}
export function nextTask() {
  const open = openTasks();
  const withDue = open.filter((t) => t.due).sort((a, b) => new Date(a.due) - new Date(b.due));
  return withDue[0] || open.sort((a, b) => a.createdAt - b.createdAt)[0] || null;
}

// ---------- focus session log ----------
// session: { id, day, startedAt, endedAt, minutes, note }
export function getSessions() {
  return load('sessions', []);
}
export function logSession({ startedAt, endedAt, minutes, note = '' }) {
  const sessions = getSessions();
  const s = { id: uid(), day: todayKey(new Date(endedAt)), startedAt, endedAt, minutes, note };
  sessions.push(s);
  save('sessions', sessions);
  return s;
}
export function updateSession(id, patch) {
  const sessions = getSessions();
  const i = sessions.findIndex((s) => s.id === id);
  if (i === -1) return;
  sessions[i] = { ...sessions[i], ...patch };
  save('sessions', sessions);
}

// Deleting a session really does take those minutes back out of the totals the
// streak and the achievement tracks are computed from — History warns about it.
export function deleteSession(id) {
  save('sessions', getSessions().filter((s) => s.id !== id));
}
export function deleteReadingLogEntry(id) {
  save('readingLog', getReadingLog().filter((r) => r.id !== id));
}

export function sessionsOn(day) {
  return getSessions().filter((s) => s.day === day);
}
export function focusMinutesOn(day) {
  return sessionsOn(day).reduce((sum, s) => sum + s.minutes, 0);
}

// Streak: consecutive days with >= 1 focus session, counting back from today
// (or yesterday, so an unfinished today doesn't break it).
export function currentStreak() {
  const days = new Set(getSessions().map((s) => s.day));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Weekly bars: minutes per day, Monday..Sunday of the current week
export function weeklyActivity() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    out.push({ label: 'MTWTFSS'[i], day: dayKey(d), minutes: focusMinutesOn(dayKey(d)) });
  }
  return out;
}

// ---------- tiered achievements ----------
// Every track levels up through the same 7 tiers; each tier has its own
// threshold per track. Level 0 = unranked.
export const TIERS = [
  { id: 'bronze', name: 'Bronze', color: '#e07b39' },
  { id: 'silver', name: 'Silver', color: '#a8b8c8' },
  { id: 'gold', name: 'Gold', color: '#f5b301' },
  { id: 'pearl', name: 'Pearl', color: '#d98ad9' },
  { id: 'ruby', name: 'Ruby', color: '#f0125f' },
  { id: 'sapphire', name: 'Sapphire', color: '#2563eb' },
  { id: 'diamond', name: 'Diamond', color: '#22d3ee' },
];

// Longest run of consecutive days with at least one focus session.
export function longestStreak() {
  const days = [...new Set(getSessions().map((s) => s.day))].sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) {
    if (prev !== null) {
      const next = new Date(`${prev}T12:00`);
      next.setDate(next.getDate() + 1);
      run = dayKey(next) === d ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

// Each track pairs a threshold with a title per tier (Bronze → Diamond).
export const ACHIEVEMENT_TRACKS = [
  {
    id: 'sessions', icon: 'timer', title: 'Focus Sessions', unit: 'sessions',
    thresholds: [5, 25, 60, 120, 250, 500, 1000],
    titles: ['First Focus', 'Getting Steady', 'Session Regular', 'Focus Fixture', 'Century Mind', 'Relentless', 'Unshakable'],
    metric: () => getSessions().length,
  },
  {
    id: 'hours', icon: 'clock', title: 'Focus Hours', unit: 'hours',
    thresholds: [3, 15, 40, 100, 250, 600, 1200],
    titles: ['Warmed Up', 'Deep Diver', 'Hour Collector', 'Time Sculptor', 'Flow Master', 'Marathon Mind', 'Keeper of Hours'],
    metric: () => Math.floor(getSessions().reduce((s, x) => s + x.minutes, 0) / 60),
  },
  {
    id: 'streak', icon: 'streak', title: 'Best Streak', unit: 'days',
    thresholds: [5, 14, 30, 60, 120, 250, 500],
    titles: ['Spark', 'Week Walker', 'Month of Fire', 'Habit Forged', 'Season of Focus', 'Unbroken', 'Eternal Flame'],
    metric: longestStreak,
  },
  {
    id: 'tasks', icon: 'task-done', title: 'Tasks Completed', unit: 'tasks',
    thresholds: [15, 60, 150, 300, 600, 1200, 2000],
    titles: ['List Starter', 'Box Checker', 'Task Tamer', 'Steady Finisher', 'Execution Engine', 'Master of Done', 'Legend of Lists'],
    metric: () => getTasks().filter((t) => t.done).length,
  },
  {
    id: 'pages', icon: 'book', title: 'Pages Read', unit: 'pages',
    thresholds: [150, 500, 1200, 2500, 5000, 10000, 20000],
    titles: ['Page Turner', 'Chapter Chaser', 'Bookworm', 'Story Devourer', 'Tome Traveler', 'Sage of Pages', 'Living Library'],
    metric: () => getReadingLog().reduce((sum, r) => sum + (r.to - r.from), 0),
  },
  {
    id: 'books', icon: 'shelf', title: 'Books Finished', unit: 'books',
    thresholds: [3, 8, 15, 30, 60, 100, 200],
    titles: ['First Finish', 'Shelf Builder', 'Book Collector', 'Reading Machine', 'Bibliophile', 'Curator', 'Grand Librarian'],
    metric: () => finishedBooks().length,
  },
];

// → { track, value, level (0..7), tier (TIERS entry | null), title (earned | null),
//     next (threshold | null), nextTitle (title | null), progress (0..1 toward next) }
export function trackStatus(track) {
  const value = track.metric();
  let level = 0;
  while (level < track.thresholds.length && value >= track.thresholds[level]) level++;
  const tier = level > 0 ? TIERS[level - 1] : null;
  const title = level > 0 ? track.titles[level - 1] : null;
  const next = level < track.thresholds.length ? track.thresholds[level] : null;
  const nextTitle = next !== null ? track.titles[level] : null;
  const prev = level > 0 ? track.thresholds[level - 1] : 0;
  const progress = next === null ? 1 : Math.min(1, (value - prev) / (next - prev));
  return { track, value, level, tier, title, next, nextTitle, progress };
}

export function allTrackStatuses() {
  return ACHIEVEMENT_TRACKS.map(trackStatus);
}

// Snapshot of per-track levels the user has already been congratulated for —
// celebrate.js compares against it to detect fresh unlocks.
export function currentAchievementLevels() {
  return Object.fromEntries(allTrackStatuses().map(({ track, level }) => [track.id, level]));
}
export function getSeenAchievementLevels() {
  return load('achievementLevels', null);
}
export function setSeenAchievementLevels(levels) {
  save('achievementLevels', levels);
}

// ---------- lifetime totals (profile page) ----------
export function lifetimeStats() {
  const sessions = getSessions();
  return {
    focusMinutes: sessions.reduce((s, x) => s + x.minutes, 0),
    sessions: sessions.length,
    tasksDone: getTasks().filter((t) => t.done).length,
    booksFinished: finishedBooks().length,
    pagesRead: getReadingLog().reduce((sum, r) => sum + (r.to - r.from), 0),
  };
}

// Full restore used by CSV import — wipes fs.* then writes the given collections.
// Reseeds the achievement snapshot so restored progress doesn't fire a celebration storm.
export function restoreAll({ books = [], tasks = [], sessions = [], readingLog = [], presets = [], settings = [], profile = [] } = {}) {
  resetAllData();
  save('books', books);
  save('tasks', tasks);
  save('sessions', sessions);
  save('readingLog', readingLog);
  save('presets', presets);
  if (settings[0]) save('settings', settings[0]);
  save('profile', { ...getProfile(), ...(profile[0] || {}), onboarded: true });
  setSeenAchievementLevels(currentAchievementLevels());
}

// ---------- danger zone ----------
export function resetAllData() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}
