// Book detail — progress, page updates, notes, vocabulary, per-book reading history.
import {
  getBook, updateBook, deleteBook,
  addBookNote, updateBookNote, deleteBookNote, bookNotes,
  addBookVocab, updateBookVocab, deleteBookVocab, bookVocab,
  getReadingLog, formatDate, dayKey,
} from '../store.js';
import {
  subHeader, icon, esc, progressBar, showSheet, confirmSheet,
  field, inputCls, primaryBtn, emptyState, rerender,
  clampedText, bindClampToggles, textBtn, pillBtn,
} from '../ui.js';
import { coverHtml } from './reading.js';
import { coverFromFile } from '../api/books.js';
import { lookupWord, pronunciationFor, WordNotFoundError } from '../api/dictionary.js';
import { nativeLens, openLens } from '../native/lens.js';

// Says the word out loud.
//
// A real recording is the point, so it wins. Where one isn't stored — every word
// saved before v1.3.0, and any the free dictionary had no recording for — we ask
// Merriam-Webster for it on the spot and keep it on the entry, so the word is only
// ever fetched once.
//
// The device voice is a genuine last resort, not a safety net: an Android WebView
// ships no speech-synthesis voices, so on the phone this branch is silence. That's
// exactly why the fetch above has to happen rather than falling straight through.
//
// The element is held at module scope for the same reason notify.js holds its
// chime: a local Audio can be collected mid-playback, and a second tap should
// replace the first rather than overlap it.
let wordAudio = null;

async function playAudio(url) {
  if (wordAudio) {
    wordAudio.pause();
    wordAudio.currentTime = 0;
  }
  wordAudio = new Audio(url);
  await wordAudio.play();
}

async function speak(entry, bookId = null) {
  let url = entry.audio;
  if (!url) {
    url = await pronunciationFor(entry.word);
    // Cache it against the saved word so the next tap is instant and offline.
    if (url && bookId && entry.id) {
      updateBookVocab(bookId, entry.id, { audio: url });
      entry.audio = url;
    }
  }
  if (url) {
    try {
      await playAudio(url);
      return;
    } catch { /* offline, a dead URL, or no gesture — try the device voice */ }
  }
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel(); // a second tap should replace the first, not queue behind it
  speechSynthesis.speak(new SpeechSynthesisUtterance(entry.word));
}

const speakBtn = (attrs, cls = 'text-[18px]') => `
  <button type="button" ${attrs} aria-label="Pronounce"
    class="p-2 -m-1 rounded-full text-accent-soft shrink-0 active:bg-accent-tint active:scale-90 transition-all">
    ${icon('speak', cls)}
  </button>`;

// A saved lookup, rendered in full: the dictionary sheet shows this for a fresh
// result, and the vocabulary list shows it again when you tap a word — off the
// stored copy, so re-reading an entry never needs the network.
function entryDetailHtml(entry) {
  return `
  <div class="flex items-center gap-2 mb-4">
    <h3 class="text-headline-md text-on-surface">${esc(entry.word)}</h3>
    ${entry.phonetic ? `<span class="text-body-sm text-secondary">${esc(entry.phonetic)}</span>` : ''}
    ${speakBtn('data-speak', 'text-[20px]')}
  </div>
  ${(entry.meanings || []).map((m) => `
  <div class="mb-4">
    ${m.partOfSpeech ? `<span class="text-label-sm uppercase tracking-wider text-accent-soft">${esc(m.partOfSpeech)}</span>` : ''}
    <ol class="list-decimal pl-5 mt-1 flex flex-col gap-2">
      ${(m.definitions || []).map((d) => `
      <li class="text-body-md text-on-surface">
        ${esc(d.definition)}
        ${d.example ? `<span class="block text-body-sm text-secondary italic mt-0.5">“${esc(d.example)}”</span>` : ''}
      </li>`).join('')}
    </ol>
  </div>`).join('')}
  ${(entry.synonyms || []).length ? `
  <div class="pt-3 border-t border-surface-container">
    <span class="text-label-sm uppercase tracking-wider text-secondary block mb-2">Synonyms</span>
    <div class="flex flex-wrap gap-2">
      ${entry.synonyms.slice(0, 12).map((s) => `
      <span class="synonym-chip px-3 py-1 rounded-full text-label-md">${esc(s)}</span>`).join('')}
    </div>
  </div>` : ''}`;
}

function noteCardHtml(n) {
  return `
  <div class="bg-surface-container-high border border-surface-container-highest rounded-xl p-4">
    ${clampedText(n.text, { clampCls: 'line-clamp-5', cls: 'text-body-md text-on-surface' })}
    <div class="flex justify-between items-center gap-2 mt-3 pt-3 border-t border-surface-container">
      <span class="text-label-sm text-secondary min-w-0 truncate">
        <span class="text-on-surface">p. ${n.page}</span>
        <span class="ml-1">· ${formatDate(n.at)}</span>
      </span>
      <span class="flex items-center gap-1 shrink-0">
        ${textBtn('Edit', `data-note-edit="${n.id}"`)}
        ${textBtn('Delete', `data-note-del="${n.id}"`, { tone: 'error' })}
      </span>
    </div>
  </div>`;
}

function vocabCardHtml(v) {
  const first = (v.meanings || [])[0];
  const gloss = first?.definitions?.[0]?.definition;
  const synonyms = v.synonyms || [];
  return `
  <div class="bg-surface-container-high border border-surface-container-highest rounded-xl p-4">
    <div class="flex items-start gap-2">
      <button data-vocab-open="${v.id}" class="text-left min-w-0 flex-grow active:opacity-70">
        <span class="text-body-lg font-semibold text-on-surface">${esc(v.word)}</span>
        ${v.phonetic ? `<span class="text-body-sm text-secondary ml-2">${esc(v.phonetic)}</span>` : ''}
        ${first?.partOfSpeech ? `<span class="block text-label-sm uppercase tracking-wider text-accent-soft mt-0.5">${esc(first.partOfSpeech)}</span>` : ''}
      </button>
      ${speakBtn(`data-vocab-speak="${v.id}"`)}
    </div>
    ${gloss ? `<div class="mt-2">${clampedText(gloss, { clampCls: 'line-clamp-2', cls: 'text-body-md text-on-surface' })}</div>` : ''}
    ${synonyms.length ? `
    <div class="flex flex-wrap gap-1.5 mt-3">
      ${synonyms.slice(0, 5).map((s) => `
      <span class="synonym-chip px-2 py-0.5 rounded-full text-label-sm">${esc(s)}</span>`).join('')}
    </div>` : ''}
    <div class="flex justify-between items-center gap-2 mt-3 pt-3 border-t border-surface-container">
      <span class="text-label-sm text-secondary min-w-0 truncate">
        <span class="text-on-surface">p. ${v.page}</span>
        <span class="ml-1">· ${formatDate(v.at)}</span>
      </span>
      <span class="flex items-center gap-1 shrink-0">
        ${textBtn('Edit page', `data-vocab-page="${v.id}"`)}
        ${textBtn('Remove', `data-vocab-del="${v.id}"`, { tone: 'error' })}
      </span>
    </div>
  </div>`;
}

// How far back the history chart looks. Two weeks is enough to see a rhythm —
// whether you read most days or in weekend bursts — without the bars going hairline.
const CHART_DAYS = 14;
// The reading list shows this many rows before folding the rest behind a button.
const LOG_PREVIEW = 5;

const pagesIn = (r) => Math.max(0, r.to - r.from);

// Buckets the log into one entry per day for the last CHART_DAYS, newest last.
// Keyed off `at` rather than `r.day`: rows written before that field existed
// don't have it, and a book read a year ago would silently bucket into nothing.
function chartDays(log) {
  const days = [];
  const cursor = new Date();
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    days.push({ key: dayKey(d), pages: 0 });
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const r of log) {
    const bucket = byKey.get(dayKey(r.at));
    if (bucket) bucket.pages += pagesIn(r);
  }
  return days;
}

function historyHtml(log) {
  if (!log.length) {
    return `
    <section class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md mb-stack-md">
      <h2 class="text-headline-md text-on-surface mb-stack-sm">Reading History</h2>
      <p class="text-body-sm text-secondary">Progress updates will appear here.</p>
    </section>`;
  }

  // The stats read the whole log; only the chart is windowed. "Best day" over two
  // weeks would quietly forget the afternoon you read 90 pages.
  const totalPages = log.reduce((s, r) => s + pagesIn(r), 0);
  const perDay = new Map();
  for (const r of log) {
    const k = dayKey(r.at);
    perDay.set(k, (perDay.get(k) || 0) + pagesIn(r));
  }
  const bestDay = Math.max(...perDay.values());

  const days = chartDays(log);
  const windowTotal = days.reduce((s, d) => s + d.pages, 0);
  const max = Math.max(1, ...days.map((d) => d.pages));

  const stat = (label, value) => `
    <div class="flex flex-col">
      <span class="text-label-md uppercase tracking-wider text-secondary">${label}</span>
      <span class="text-headline-md text-on-surface">${value}</span>
    </div>`;

  const chart = windowTotal
    ? `
    <div class="flex items-end justify-between gap-1 h-24 mb-2">
      ${days.map((d, i) => `
      <div class="flex-1 h-full flex items-end">
        <div class="rise w-full rounded-t ${d.pages ? 'bg-accent' : 'bg-surface-container-highest'}"
          style="height:${Math.max(4, Math.round((d.pages / max) * 100))}%; --rise-delay:${(i * 0.03).toFixed(2)}s"
          title="${d.pages} pages"></div>
      </div>`).join('')}
    </div>
    <div class="flex justify-between text-label-sm text-secondary mb-stack-md">
      <span>${CHART_DAYS} days ago</span>
      <span>Today</span>
    </div>`
    : '<p class="text-body-sm text-secondary mb-stack-md">No pages logged in the last 14 days.</p>';

  const rows = log.map((r, i) => `
    <div class="flex justify-between items-center py-3 border-b border-surface-container ${i >= LOG_PREVIEW ? 'hidden' : ''}" ${i >= LOG_PREVIEW ? 'data-log-extra' : ''}>
      <span class="text-body-md text-on-surface">${pagesIn(r)} pages</span>
      <span class="text-body-sm text-secondary flex items-center gap-1">p. ${r.from}${icon('forward', 'text-[11px] shrink-0')}${r.to} · ${formatDate(r.at)}</span>
    </div>`).join('');

  return `
  <section class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md mb-stack-md">
    <h2 class="text-headline-md text-on-surface mb-stack-sm">Reading History</h2>
    <div class="grid grid-cols-3 gap-2 mb-stack-md">
      ${stat('Pages', totalPages)}
      ${stat('Days read', perDay.size)}
      ${stat('Best day', bestDay)}
    </div>
    ${chart}
    <div class="flex flex-col">${rows}</div>
    ${log.length > LOG_PREVIEW
      ? `<div class="pt-2">${textBtn(`Show all ${log.length} updates`, 'data-log-expand')}</div>`
      : ''}
  </section>`;
}

// Which of the two lists is showing. Module scope, so it survives the render+mount
// cycle a rerender() runs — the module is a singleton. Scoped to a book id so
// opening a different one doesn't inherit the last one's tab.
let activeTab = 'notes';
let tabBookId = null;

export function render(id) {
  const book = getBook(id);
  if (!book) return `${subHeader('Book')}<main class="pt-page px-margin-mobile">${emptyState('error', 'Book not found', 'It may have been deleted.')}</main>`;
  if (tabBookId !== id) {
    tabBookId = id;
    activeTab = 'notes';
  }

  const pct = book.totalPages ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
  const log = getReadingLog().filter((r) => r.bookId === id).sort((a, b) => b.at - a.at);
  // Both lists run by page, deepest first — they're read against the book, so where
  // in the book a thing came from orders it better than when you happened to save
  // it. Ties break on recency, which is the order they used to be in.
  const byPage = (a, b) => (Number(b.page) || 0) - (Number(a.page) || 0) || (b.at || 0) - (a.at || 0);
  const notes = bookNotes(book).slice().sort(byPage);
  const vocab = bookVocab(book).slice().sort(byPage);

  return `
  ${subHeader(book.title, `
    <button data-action="edit" class="p-3 text-on-surface">${icon('edit')}</button>
    <button data-action="delete" class="p-3 text-error">${icon('delete')}</button>`)}
  <main class="pt-page pb-page-sub px-margin-mobile max-w-2xl mx-auto page-enter">

    <div class="flex gap-gutter items-center mb-stack-md">
      <button data-action="edit-cover" class="relative flex-shrink-0 rounded active:scale-[0.98] transition-transform" aria-label="Change cover">
        ${coverHtml(book, 'w-24 h-36')}
        <span class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-on-primary flex items-center justify-center border-2 border-surface">
          ${icon('camera', 'text-[14px]')}
        </span>
      </button>
      <div class="flex flex-col min-w-0">
        <h1 class="text-headline-md text-on-surface leading-tight mb-1">${esc(book.title)}</h1>
        <p class="text-body-sm text-secondary mb-3">${esc(book.author)}</p>
        ${book.finished
          ? `<span class="inline-flex items-center gap-1 text-label-md text-accent-soft bg-accent-tint rounded-full px-3 py-1 self-start">${icon('check', 'text-[14px]')} Finished ${book.finishedAt ? formatDate(book.finishedAt) : ''}</span>`
          : `<span class="text-body-sm text-secondary">Page ${book.currentPage} of ${book.totalPages}</span>`}
      </div>
    </div>

    <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md mb-stack-md">
      <div class="flex justify-between items-center mb-2">
        <span class="text-label-md uppercase tracking-wider text-secondary">Progress</span>
        <span class="text-label-md text-accent-soft">${pct}%</span>
      </div>
      ${progressBar(pct, 'mb-4')}
      ${book.finished ? `
      <button data-action="unfinish" class="w-full py-3 rounded-full border border-on-surface text-on-surface text-label-md">Move back to reading</button>
      ` : `
      <div class="flex gap-3">
        <button data-action="update-page" class="flex-1 py-3 rounded-full bg-accent text-on-primary text-label-md active:scale-[0.98] transition-transform">Update Page</button>
        <button data-action="finish" class="flex-1 py-3 rounded-full border border-on-surface text-on-surface text-label-md active:scale-[0.98] transition-transform">Mark Finished</button>
      </div>`}
    </div>

    ${book.synopsis ? `
    <section class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md mb-stack-md">
      <h2 class="text-label-md uppercase tracking-wider text-secondary mb-2">Synopsis</h2>
      ${clampedText(book.synopsis, { clampCls: 'line-clamp-4', cls: 'text-body-md text-on-surface' })}
    </section>` : ''}

    ${historyHtml(log)}

    <section>
      <div class="bg-surface-container-low rounded-full p-1 flex mb-stack-md">
        ${[['notes', `Notes (${notes.length})`], ['vocab', `Vocabulary (${vocab.length})`]].map(([key, label]) => `
        <button data-tab="${key}" class="flex-1 py-2 rounded-full text-label-md transition-colors
          ${activeTab === key ? 'bg-accent text-on-primary' : 'text-secondary'}">${label}</button>`).join('')}
      </div>

      <div class="flex justify-end mb-stack-sm">
        <span data-tab-pane="notes" class="${activeTab === 'notes' ? '' : 'hidden'}">${pillBtn('Add note', 'add', 'data-action="add-note"')}</span>
        <span data-tab-pane="vocab" class="${activeTab === 'vocab' ? '' : 'hidden'}">${pillBtn('Look up', 'dictionary', 'data-action="lookup"')}</span>
      </div>

      <div data-tab-pane="notes" class="flex flex-col gap-4 ${activeTab === 'notes' ? '' : 'hidden'}">
        ${notes.length
          ? notes.map(noteCardHtml).join('')
          : '<p class="text-body-sm text-secondary">No notes yet — capture a thought or a quote.</p>'}
      </div>

      <div data-tab-pane="vocab" class="flex flex-col gap-4 ${activeTab === 'vocab' ? '' : 'hidden'}">
        ${vocab.length
          ? vocab.map(vocabCardHtml).join('')
          : '<p class="text-body-sm text-secondary">Look up a word you hit while reading — it\'s saved here with its definition.</p>'}
      </div>
    </section>
  </main>`;
}

// The dictionary. Opens standalone from the Vocabulary section, and stacks on
// top of the note sheet when you hit a word mid-note — the note underneath keeps
// everything you'd typed.
function openDictionarySheet(bookId) {
  // Read the book fresh rather than trusting the caller's copy: mount() captured
  // its `book` when the screen rendered, so a sheet opened after an "Update Page"
  // would otherwise prefill the page you were on *before* that update.
  const book = getBook(bookId);
  if (!book) return;

  const { el } = showSheet(`
    <h2 class="text-headline-md text-on-surface mb-4">Dictionary</h2>
    <form data-form class="flex items-end gap-2 mb-4">
      <label class="flex-1 min-w-0">
        <span class="text-label-md uppercase tracking-wider text-secondary block mb-2">Word</span>
        <input data-word name="word" type="text" required autocomplete="off" autocapitalize="none"
          spellcheck="false" placeholder="Look up a word…" class="${inputCls}" />
      </label>
      <label class="w-[4.5rem] shrink-0">
        <span class="text-label-md uppercase tracking-wider text-secondary block mb-2">Page</span>
        <input data-page name="page" type="number" min="0" max="${book.totalPages}"
          value="${book.currentPage}" class="${inputCls} px-2 text-center" />
      </label>
      <button type="submit" class="px-5 py-3 rounded-lg bg-accent text-on-primary text-label-md shrink-0">Look up</button>
    </form>
    <div data-result></div>`);

  const input = el.querySelector('[data-word]');
  const pageInput = el.querySelector('[data-page]');
  const result = el.querySelector('[data-result]');
  const message = (text, cls = 'text-secondary') =>
    `<p class="text-body-md ${cls} py-2">${esc(text)}</p>`;

  el.querySelector('[data-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const word = input.value.trim();
    if (!word) return;
    result.innerHTML = message('Looking up…');
    try {
      const entry = await lookupWord(word);
      // Showing it and logging it are the same action — a lookup you made while
      // reading this book is worth keeping. The page comes from the field, which
      // starts at your saved progress but is yours to change: where you actually
      // are is rarely the last page you told the app about.
      const saved = addBookVocab(book.id, { ...entry, page: Number(pageInput.value) });
      result.innerHTML = `
        ${entryDetailHtml(entry)}
        ${entry.notice ? `<p class="text-label-sm text-error mt-3">${esc(entry.notice)}</p>` : ''}
        <p class="text-label-sm text-accent-soft flex items-center gap-1 mt-4 pt-3 border-t border-surface-container">
          ${icon('saved', 'text-[16px]')} Saved to this book's vocabulary at p. ${saved.page}
        </p>`;
      result.querySelector('[data-speak]')?.addEventListener('click', () => speak(entry));
      // Refresh the Vocabulary list behind the sheet. The sheets live on <body>,
      // outside the screen root, so re-rendering doesn't disturb them — a note
      // half-typed underneath this one survives.
      rerender();
    } catch (err) {
      result.innerHTML = message(
        err.message,
        err instanceof WordNotFoundError ? 'text-secondary' : 'text-error',
      );
    }
  });

  input.focus();
}

// Corrects the page on a word already saved — the counterpart to editing a note,
// and the safety net for a word looked up before you fixed the page field.
function openVocabPageSheet(bookId, entry) {
  const book = getBook(bookId);
  if (!book) return;

  const { el, close } = showSheet(`
    <h2 class="text-headline-md text-on-surface mb-1">${esc(entry.word)}</h2>
    <p class="text-body-sm text-secondary mb-4">Which page did you meet this word on?</p>
    <form data-form>
      ${field('Page', `<input name="page" type="number" min="0" max="${book.totalPages}"
        value="${entry.page}" required class="${inputCls}" autofocus />`)}
      ${primaryBtn('Save', 'type="submit"')}
    </form>`);

  el.querySelector('[data-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    updateBookVocab(bookId, entry.id, { page: Number(new FormData(e.target).get('page')) });
    close();
    rerender();
  });
}

// Insert rather than append: when a note is being edited the caret is wherever
// the user left it, and `value +=` would drop the scanned text at the end no
// matter where they were pointing.
function insertAtCaret(textarea, text) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  textarea.setRangeText(text, start, end, 'end');
  textarea.focus();
}

// The "Scan" pill and the trip back from Google Lens.
//
// Lens is one-way — Android has no "start Lens for result" — so the user copies
// the text over there, and coming back we *offer* to paste it. Offering rather
// than inserting on sight matters: the clipboard is just as likely to hold a URL
// they copied an hour ago as the quote they just scanned.
//
// The clipboard is only ever read from the tap on "Paste scanned text", never on
// the way back. Reading it on resume would fire Android 12+'s "ReFocus pasted
// from your clipboard" toast every single time, wanted or not.
function bindScan(el) {
  const pasteWrap = el.querySelector('[data-scan-paste]');
  const errorEl = el.querySelector('[data-scan-error]');
  const textarea = el.querySelector('textarea');
  let handle = null;

  const fail = (msg) => {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  };
  const clearError = () => errorEl.classList.add('hidden');

  el.querySelector('[data-action="scan"]').addEventListener('click', async () => {
    clearError();
    let opened = false;
    try {
      opened = await openLens();
    } catch { /* the bridge is gone; same dead end as Lens not being installed */ }
    if (!opened) {
      fail("Google Lens isn't available on this device.");
      return;
    }
    // At most one listener, and it takes itself off on the first foreground
    // event either way — a sheet dismissed while we were in Lens would otherwise
    // leave a listener behind holding a detached textarea, one per note opened.
    await handle?.remove();
    const { App } = await import('@capacitor/app');
    handle = await App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      handle?.remove();
      handle = null;
      if (textarea.isConnected) pasteWrap.classList.remove('hidden');
    });
  });

  el.querySelector('[data-action="paste-scan"]').addEventListener('click', async () => {
    clearError();
    let text = '';
    try {
      const { Clipboard } = await import('@capacitor/clipboard');
      const read = await Clipboard.read();
      if (read?.type?.startsWith('text')) text = String(read.value || '').trim();
    } catch { /* nothing readable there — handled as an empty clipboard below */ }
    if (!text) {
      fail('Nothing to paste — copy the text in Google Lens first.');
      return;
    }
    insertAtCaret(textarea, text);
    pasteWrap.classList.add('hidden');
  });
}

// One sheet for both adding and editing — `note` absent means add.
function openNoteSheet(book, note = null) {
  const editing = !!note;
  const { el, close } = showSheet(`
    <div class="flex justify-between items-center gap-2 mb-4">
      <h2 class="text-headline-md text-on-surface">${editing ? 'Edit Note' : 'Add Note'}</h2>
      <span class="flex items-center gap-1.5 shrink-0">
        ${nativeLens ? pillBtn('Scan', 'camera', 'data-action="scan"') : ''}
        ${pillBtn('Look up', 'dictionary', 'data-action="lookup"')}
      </span>
    </div>
    <p data-scan-error class="hidden text-label-sm text-error mb-3"></p>
    <div data-scan-paste class="hidden mb-3">
      ${textBtn('Paste scanned text', 'data-action="paste-scan"')}
    </div>
    <form data-form>
      ${field('Note or quote', `<textarea name="text" rows="6" required
        class="${inputCls} resize-none max-h-[40vh] overflow-y-auto"
        placeholder="Write it down…">${esc(note?.text || '')}</textarea>`)}
      ${field('Page', `<input name="page" type="number" min="0" max="${book.totalPages}"
        value="${editing ? note.page : book.currentPage}" class="${inputCls}" />`)}
      ${primaryBtn(editing ? 'Save Changes' : 'Save Note', 'type="submit"')}
    </form>`);

  el.querySelector('[data-action="lookup"]').addEventListener('click', () => openDictionarySheet(book.id));
  if (nativeLens) bindScan(el);

  el.querySelector('[data-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const text = String(f.get('text')).trim();
    const page = Number(f.get('page'));
    if (editing) updateBookNote(book.id, note.id, { text, page });
    else addBookNote(book.id, text, page);
    close();
    rerender();
  });

  const textarea = el.querySelector('textarea');
  textarea.focus();
  // Put the caret at the end rather than the start when re-opening a note.
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

export function mount(root, id) {
  const book = getBook(id);
  if (!book) return;

  bindClampToggles(root);

  // --- tabs ---
  // Both panes are always in the DOM and one is hidden, rather than rendering only
  // the active one: the handlers further down query for [data-action="add-note"]
  // and [data-action="lookup"] unconditionally, and a tab that omitted one would
  // throw mid-mount and silently kill every listener after it.
  //
  // Switching toggles `hidden` instead of calling rerender(), which scrolls to top
  // — the tabs sit well down the page and every tap would fling you back up.
  root.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.getAttribute('data-tab');
      root.querySelectorAll('[data-tab]').forEach((b) => {
        const on = b.getAttribute('data-tab') === activeTab;
        b.classList.toggle('bg-accent', on);
        b.classList.toggle('text-on-primary', on);
        b.classList.toggle('text-secondary', !on);
      });
      root.querySelectorAll('[data-tab-pane]').forEach((pane) => {
        pane.classList.toggle('hidden', pane.getAttribute('data-tab-pane') !== activeTab);
      });
      // Clamped text in a hidden pane measured 0x0 and lost its toggle; now that
      // it has a size, let it decide again.
      bindClampToggles(root);
    });
  });

  root.querySelector('[data-log-expand]')?.addEventListener('click', (e) => {
    root.querySelectorAll('[data-log-extra]').forEach((row) => row.classList.remove('hidden'));
    e.target.closest('button').remove();
  });

  root.querySelector('[data-action="update-page"]')?.addEventListener('click', () => {
    // The slider starts at 0, not at the current page: dragging is also how you
    // walk back an over-typed number. Nothing is logged when the page moves
    // backwards (updateBook only logs an advance), so the history stays honest.
    const { el, close } = showSheet(`
      <h2 class="text-headline-md text-on-surface mb-4">Update Progress</h2>
      <form data-form>
        <p class="text-center mb-1">
          <span data-page-readout class="text-headline-md text-on-surface"></span>
        </p>
        <p data-page-pct class="text-label-md text-accent-soft text-center mb-4"></p>
        <div class="flex items-center gap-3 mb-6">
          <button type="button" data-step="-1" aria-label="Previous page"
            class="w-10 h-10 shrink-0 rounded-full border border-surface-container-highest text-on-surface flex items-center justify-center active:scale-90 transition-transform">${icon('remove')}</button>
          <input data-page-range name="page" type="range" min="0" max="${book.totalPages}" step="1"
            value="${book.currentPage}" class="page-slider flex-grow" />
          <button type="button" data-step="1" aria-label="Next page"
            class="w-10 h-10 shrink-0 rounded-full border border-surface-container-highest text-on-surface flex items-center justify-center active:scale-90 transition-transform">${icon('add')}</button>
        </div>
        ${primaryBtn('Save', 'type="submit"')}
      </form>`);

    const range = el.querySelector('[data-page-range]');
    const readout = el.querySelector('[data-page-readout]');
    const pct = el.querySelector('[data-page-pct]');

    const paint = () => {
      const page = Number(range.value);
      const p = book.totalPages ? Math.round((page / book.totalPages) * 100) : 0;
      readout.textContent = `${page} of ${book.totalPages}`;
      pct.textContent = `${p}%`;
      range.style.setProperty('--fill', `${p}%`);
    };
    range.addEventListener('input', paint);
    paint();

    // The −/+ buttons drive the range and let its own `input` handler do the
    // painting, so there is only ever one place the readout is written.
    el.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = Number(range.value) + Number(btn.getAttribute('data-step'));
        range.value = String(Math.max(0, Math.min(book.totalPages, next)));
        range.dispatchEvent(new Event('input'));
      });
    });

    el.querySelector('[data-form]').addEventListener('submit', (e) => {
      e.preventDefault();
      const page = Math.min(book.totalPages, Number(new FormData(e.target).get('page')) || 0);
      updateBook(id, { currentPage: page, ...(page >= book.totalPages ? { finished: true, finishedAt: Date.now() } : {}) });
      close();
      rerender();
    });
  });

  root.querySelector('[data-action="finish"]')?.addEventListener('click', () => {
    updateBook(id, { finished: true, finishedAt: Date.now(), currentPage: book.totalPages });
    rerender();
  });
  root.querySelector('[data-action="unfinish"]')?.addEventListener('click', () => {
    updateBook(id, { finished: false, finishedAt: null });
    rerender();
  });

  root.querySelector('[data-action="edit-cover"]').addEventListener('click', () => {
    const { el, close } = showSheet(`
      <h2 class="text-headline-md text-on-surface mb-4">Book cover</h2>
      <div class="flex justify-center mb-stack-md">${coverHtml(book, 'w-28 h-42')}</div>
      <input data-file type="file" accept="image/*" class="hidden" />
      ${primaryBtn('Choose image', 'data-action="choose"')}
      <button data-action="remove" class="w-full py-3 mt-2 text-label-md text-error ${book.cover ? '' : 'hidden'}">Remove cover</button>
      <p data-cover-status class="text-body-sm text-secondary text-center mt-2 hidden"></p>`);

    const fileInput = el.querySelector('[data-file]');
    const statusEl = el.querySelector('[data-cover-status]');
    el.querySelector('[data-action="choose"]').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      statusEl.textContent = 'Resizing…';
      statusEl.classList.remove('hidden');
      try {
        updateBook(id, { cover: await coverFromFile(file) });
        close();
        rerender();
      } catch (err) {
        statusEl.textContent = err.message || 'Could not use that image.';
      }
    });

    el.querySelector('[data-action="remove"]').addEventListener('click', () => {
      updateBook(id, { cover: null });
      close();
      rerender();
    });
  });

  root.querySelector('[data-action="edit"]').addEventListener('click', () => {
    const { el, close } = showSheet(`
      <h2 class="text-headline-md text-on-surface mb-4">Edit Book</h2>
      <form data-form>
        ${field('Title', `<input name="title" type="text" required value="${esc(book.title)}" class="${inputCls}" />`)}
        ${field('Author', `<input name="author" type="text" value="${esc(book.author)}" class="${inputCls}" />`)}
        ${field('Total pages', `<input name="totalPages" type="number" min="1" value="${book.totalPages}" required class="${inputCls}" />`)}
        ${primaryBtn('Save', 'type="submit"')}
      </form>`);
    el.querySelector('[data-form]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      updateBook(id, {
        title: String(f.get('title')).trim(),
        author: String(f.get('author')).trim(),
        totalPages: Number(f.get('totalPages')),
      });
      close();
      rerender();
    });
  });

  root.querySelector('[data-action="delete"]').addEventListener('click', () => {
    confirmSheet({
      title: 'Delete book?',
      message: `"${book.title}", its notes and its saved words will be removed.`,
      onConfirm: () => { deleteBook(id); location.hash = '#/reading'; },
    });
  });

  // --- notes ---
  root.querySelector('[data-action="add-note"]').addEventListener('click', () => openNoteSheet(book));

  root.querySelectorAll('[data-note-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const note = bookNotes(getBook(id)).find((n) => n.id === btn.getAttribute('data-note-edit'));
      if (note) openNoteSheet(book, note);
    });
  });

  root.querySelectorAll('[data-note-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      confirmSheet({
        title: 'Delete note?',
        message: 'This note will be removed from the book.',
        onConfirm: () => { deleteBookNote(id, btn.getAttribute('data-note-del')); rerender(); },
      });
    });
  });

  // --- vocabulary ---
  const vocabEntry = (btn, attr) =>
    bookVocab(getBook(id)).find((v) => v.id === btn.getAttribute(attr));

  root.querySelector('[data-action="lookup"]').addEventListener('click', () => openDictionarySheet(id));

  root.querySelectorAll('[data-vocab-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const entry = vocabEntry(btn, 'data-vocab-open');
      if (!entry) return;
      const { el } = showSheet(entryDetailHtml(entry));
      el.querySelector('[data-speak]')?.addEventListener('click', () => speak(entry, id));
    });
  });

  root.querySelectorAll('[data-vocab-speak]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const entry = vocabEntry(btn, 'data-vocab-speak');
      if (entry) speak(entry, id);
    });
  });

  root.querySelectorAll('[data-vocab-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const entry = vocabEntry(btn, 'data-vocab-page');
      if (entry) openVocabPageSheet(id, entry);
    });
  });

  root.querySelectorAll('[data-vocab-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const entry = vocabEntry(btn, 'data-vocab-del');
      confirmSheet({
        title: 'Remove word?',
        message: `"${entry ? entry.word : 'This word'}" will be removed from this book's vocabulary.`,
        confirmLabel: 'Remove',
        onConfirm: () => { deleteBookVocab(id, btn.getAttribute('data-vocab-del')); rerender(); },
      });
    });
  });
}
