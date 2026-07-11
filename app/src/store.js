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
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...load('settings', {}) };
}
export function setSettings(patch) {
  save('settings', { ...getSettings(), ...patch });
}

export function getProfile() {
  return { name: '', onboarded: false, ...load('profile', {}) };
}
export function setProfile(patch) {
  save('profile', { ...getProfile(), ...patch });
}

// ---------- books ----------
// book: { id, title, author, totalPages, currentPage, notes: [{id, text, page, at}],
//         finished: bool, finishedAt, createdAt, updatedAt }
export function getBooks() {
  return load('books', []);
}
function saveBooks(books) {
  save('books', books);
}
export function getBook(id) {
  return getBooks().find((b) => b.id === id);
}
export function addBook({ title, author, totalPages, currentPage = 0 }) {
  const books = getBooks();
  const book = {
    id: uid(), title, author, totalPages: Number(totalPages) || 0,
    currentPage: Number(currentPage) || 0, notes: [], finished: false,
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
export function addBookNote(id, text, page) {
  const book = getBook(id);
  if (!book) return;
  book.notes.push({ id: uid(), text, page: page || book.currentPage, at: Date.now() });
  updateBook(id, { notes: book.notes });
}
export function deleteBookNote(bookId, noteId) {
  const book = getBook(bookId);
  if (!book) return;
  updateBook(bookId, { notes: book.notes.filter((n) => n.id !== noteId) });
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

// ---------- achievements ----------
export const ACHIEVEMENTS = [
  { id: 'first-focus', icon: 'flag', title: 'First Steps', desc: 'Complete your first focus session' },
  { id: 'deep-focus', icon: 'star', title: 'Deep Focus Master', desc: '3 hours of focus in one day' },
  { id: 'task-crusher', icon: 'task_alt', title: 'Task Crusher', desc: 'Complete 10 tasks in one day' },
  { id: 'week-streak', icon: 'local_fire_department', title: 'Week of Focus', desc: 'Keep a 7-day streak' },
  { id: 'bookworm', icon: 'auto_stories', title: 'Bookworm', desc: 'Finish your first book' },
  { id: 'page-turner', icon: 'menu_book', title: 'Page Turner', desc: 'Read 100 pages in total' },
  { id: 'early-bird', icon: 'wb_sunny', title: 'Early Bird', desc: 'Start a session before 7 AM' },
  { id: 'night-owl', icon: 'dark_mode', title: 'Night Owl', desc: 'Start a session after 10 PM' },
  { id: 'marathon', icon: 'directions_run', title: 'Marathon', desc: 'Complete 25 focus sessions' },
  { id: 'librarian', icon: 'collections_bookmark', title: 'Librarian', desc: 'Finish 3 books' },
];

export function unlockedAchievements() {
  const sessions = getSessions();
  const tasks = getTasks();
  const unlocked = new Set();

  if (sessions.length >= 1) unlocked.add('first-focus');
  if (sessions.length >= 25) unlocked.add('marathon');

  const byDay = {};
  for (const s of sessions) byDay[s.day] = (byDay[s.day] || 0) + s.minutes;
  if (Object.values(byDay).some((m) => m >= 180)) unlocked.add('deep-focus');

  const doneByDay = {};
  for (const t of tasks) {
    if (t.done && t.completedAt) {
      const d = dayKey(new Date(t.completedAt));
      doneByDay[d] = (doneByDay[d] || 0) + 1;
    }
  }
  if (Object.values(doneByDay).some((n) => n >= 10)) unlocked.add('task-crusher');

  if (currentStreak() >= 7) unlocked.add('week-streak');

  const finished = finishedBooks().length;
  if (finished >= 1) unlocked.add('bookworm');
  if (finished >= 3) unlocked.add('librarian');

  const pagesRead = getReadingLog().reduce((sum, r) => sum + (r.to - r.from), 0);
  if (pagesRead >= 100) unlocked.add('page-turner');

  for (const s of sessions) {
    const h = new Date(s.startedAt).getHours();
    if (h < 7) unlocked.add('early-bird');
    if (h >= 22) unlocked.add('night-owl');
  }
  return unlocked;
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

// ---------- danger zone ----------
export function resetAllData() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}
