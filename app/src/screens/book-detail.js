// Book detail — progress, page updates, notes, vocabulary, per-book reading history.
import {
  getBook, updateBook, deleteBook,
  addBookNote, updateBookNote, deleteBookNote, bookNotes,
  addBookVocab, deleteBookVocab, bookVocab,
  getReadingLog, formatDate,
} from '../store.js';
import {
  subHeader, icon, esc, progressBar, showSheet, confirmSheet,
  field, inputCls, primaryBtn, emptyState, rerender,
  clampedText, bindClampToggles,
} from '../ui.js';
import { coverHtml } from './reading.js';
import { coverFromFile } from '../api/books.js';
import { lookupWord, WordNotFoundError } from '../api/dictionary.js';

// A saved lookup, rendered in full: the dictionary sheet shows this for a fresh
// result, and the vocabulary list shows it again when you tap a word — off the
// stored copy, so re-reading an entry never needs the network.
function entryDetailHtml(entry) {
  return `
  <div class="flex items-baseline gap-2 mb-4">
    <h3 class="text-headline-md text-on-surface">${esc(entry.word)}</h3>
    ${entry.phonetic ? `<span class="text-body-sm text-secondary">${esc(entry.phonetic)}</span>` : ''}
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
      <span class="px-3 py-1 rounded-full bg-surface-container text-label-md text-on-surface">${esc(s)}</span>`).join('')}
    </div>
  </div>` : ''}`;
}

function noteCardHtml(n) {
  return `
  <div class="bg-surface-container-low border border-surface-container-high border-l-4 border-l-accent-soft rounded-xl p-4">
    ${clampedText(n.text, { clampCls: 'line-clamp-5', cls: 'text-body-md text-on-surface' })}
    <div class="flex justify-between items-center gap-2 mt-3 pt-3 border-t border-surface-container">
      <span class="text-label-sm text-secondary min-w-0 truncate">
        <span class="px-2 py-0.5 rounded-full bg-surface-container text-on-surface">p. ${n.page}</span>
        <span class="ml-1">${formatDate(n.at)}</span>
      </span>
      <span class="flex items-center shrink-0">
        <button data-note-edit="${n.id}" aria-label="Edit note" class="p-2 text-secondary active:opacity-70">${icon('edit', 'text-[18px]')}</button>
        <button data-note-del="${n.id}" aria-label="Delete note" class="p-2 text-secondary active:opacity-70">${icon('delete', 'text-[18px]')}</button>
      </span>
    </div>
  </div>`;
}

function vocabCardHtml(v) {
  const first = (v.meanings || [])[0];
  const gloss = first?.definitions?.[0]?.definition;
  const synonyms = v.synonyms || [];
  return `
  <div class="bg-surface-container-low border border-surface-container-high rounded-xl p-4">
    <div class="flex justify-between items-start gap-2">
      <button data-vocab-open="${v.id}" class="text-left min-w-0 flex-grow active:opacity-70">
        <span class="text-body-lg font-semibold text-on-surface">${esc(v.word)}</span>
        ${v.phonetic ? `<span class="text-body-sm text-secondary ml-2">${esc(v.phonetic)}</span>` : ''}
        ${first?.partOfSpeech ? `<span class="block text-label-sm uppercase tracking-wider text-accent-soft mt-0.5">${esc(first.partOfSpeech)}</span>` : ''}
      </button>
      <button data-vocab-del="${v.id}" aria-label="Remove ${esc(v.word)}" class="p-2 -m-1 text-secondary shrink-0 active:opacity-70">${icon('delete', 'text-[18px]')}</button>
    </div>
    ${gloss ? `<div class="mt-2">${clampedText(gloss, { clampCls: 'line-clamp-2', cls: 'text-body-md text-on-surface' })}</div>` : ''}
    ${synonyms.length ? `
    <div class="flex flex-wrap gap-1.5 mt-3">
      ${synonyms.slice(0, 5).map((s) => `
      <span class="px-2 py-0.5 rounded-full bg-surface-container text-label-sm text-secondary">${esc(s)}</span>`).join('')}
    </div>` : ''}
    <span class="block text-label-sm text-secondary mt-3">p. ${v.page} · ${formatDate(v.at)}</span>
  </div>`;
}

export function render(id) {
  const book = getBook(id);
  if (!book) return `${subHeader('Book')}<main class="pt-page px-margin-mobile">${emptyState('error', 'Book not found', 'It may have been deleted.')}</main>`;

  const pct = book.totalPages ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
  const log = getReadingLog().filter((r) => r.bookId === id).sort((a, b) => b.at - a.at);
  const notes = bookNotes(book).slice().reverse();
  const vocab = bookVocab(book).slice().reverse();

  return `
  ${subHeader(book.title, `
    <button data-action="edit" class="p-3 text-on-surface">${icon('edit')}</button>
    <button data-action="delete" class="p-3 text-error">${icon('delete')}</button>`)}
  <main class="pt-page pb-page-sub px-margin-mobile max-w-2xl mx-auto page-enter">

    <div class="flex gap-gutter items-center mb-stack-md">
      <button data-action="edit-cover" class="relative flex-shrink-0 rounded active:scale-[0.98] transition-transform" aria-label="Change cover">
        ${coverHtml(book, 'w-24 h-36')}
        <span class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-on-primary flex items-center justify-center border-2 border-surface">
          ${icon('photo_camera', 'text-[14px]')}
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

    <section class="mb-stack-md">
      <div class="flex justify-between items-center mb-stack-sm">
        <h2 class="text-headline-md text-on-surface">Notes &amp; Quotes</h2>
        <button data-action="add-note" aria-label="Add note" class="p-2 text-accent-soft">${icon('add_circle')}</button>
      </div>
      <div class="flex flex-col gap-4">
        ${notes.length
          ? notes.map(noteCardHtml).join('')
          : '<p class="text-body-sm text-secondary">No notes yet — capture a thought or a quote.</p>'}
      </div>
    </section>

    <section class="mb-stack-md">
      <div class="flex justify-between items-center mb-stack-sm">
        <h2 class="text-headline-md text-on-surface">Vocabulary</h2>
        <button data-action="lookup" aria-label="Look up a word" class="p-2 text-accent-soft">${icon('search')}</button>
      </div>
      <div class="flex flex-col gap-4">
        ${vocab.length
          ? vocab.map(vocabCardHtml).join('')
          : '<p class="text-body-sm text-secondary">Look up a word you hit while reading — it\'s saved here with its definition.</p>'}
      </div>
    </section>

    <section>
      <h2 class="text-headline-md text-on-surface mb-stack-sm">Reading History</h2>
      <div class="flex flex-col">
        ${log.length ? log.map((r) => `
        <div class="flex justify-between items-center py-3 border-b border-surface-container">
          <span class="text-body-md text-on-surface">${r.to - r.from} pages</span>
          <span class="text-body-sm text-secondary">p. ${r.from} → ${r.to} · ${formatDate(r.at)}</span>
        </div>`).join('') : '<p class="text-body-sm text-secondary">Progress updates will appear here.</p>'}
      </div>
    </section>
  </main>`;
}

// The dictionary. Opens standalone from the Vocabulary section, and stacks on
// top of the note sheet when you hit a word mid-note — the note underneath keeps
// everything you'd typed.
function openDictionarySheet(book) {
  const { el } = showSheet(`
    <h2 class="text-headline-md text-on-surface mb-4">Dictionary</h2>
    <form data-form class="flex gap-2 mb-4">
      <input data-word name="word" type="text" required autocomplete="off" autocapitalize="none"
        spellcheck="false" placeholder="Look up a word…" class="${inputCls} flex-1" />
      <button type="submit" class="px-5 rounded-lg bg-accent text-on-primary text-label-md shrink-0">Look up</button>
    </form>
    <div data-result></div>`);

  const input = el.querySelector('[data-word]');
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
      // reading this book is worth keeping.
      addBookVocab(book.id, { ...entry, page: book.currentPage });
      result.innerHTML = `
        ${entryDetailHtml(entry)}
        <p class="text-label-sm text-accent-soft flex items-center gap-1 mt-4 pt-3 border-t border-surface-container">
          ${icon('bookmark_added', 'text-[16px]')} Saved to this book's vocabulary
        </p>`;
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

// One sheet for both adding and editing — `note` absent means add.
function openNoteSheet(book, note = null) {
  const editing = !!note;
  const { el, close } = showSheet(`
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-headline-md text-on-surface">${editing ? 'Edit Note' : 'Add Note'}</h2>
      <button type="button" data-action="lookup" aria-label="Look up a word"
        class="p-2 rounded-full border border-surface-container-highest text-accent-soft active:scale-95 transition-transform">
        ${icon('search', 'text-[20px]')}
      </button>
    </div>
    <form data-form>
      ${field('Note or quote', `<textarea name="text" rows="6" required
        class="${inputCls} resize-none max-h-[40vh] overflow-y-auto"
        placeholder="Write it down…">${esc(note?.text || '')}</textarea>`)}
      ${field('Page', `<input name="page" type="number" min="0" max="${book.totalPages}"
        value="${editing ? note.page : book.currentPage}" class="${inputCls}" />`)}
      ${primaryBtn(editing ? 'Save Changes' : 'Save Note', 'type="submit"')}
    </form>`);

  el.querySelector('[data-action="lookup"]').addEventListener('click', () => openDictionarySheet(book));

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

  root.querySelector('[data-action="update-page"]')?.addEventListener('click', () => {
    const { el, close } = showSheet(`
      <h2 class="text-headline-md text-on-surface mb-4">Update Progress</h2>
      <form data-form>
        ${field(`Current page (of ${book.totalPages})`, `<input name="page" type="number" min="${book.currentPage}" max="${book.totalPages}" value="${book.currentPage}" required class="${inputCls}" autofocus />`)}
        ${primaryBtn('Save', 'type="submit"')}
      </form>`);
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
  root.querySelector('[data-action="lookup"]').addEventListener('click', () => openDictionarySheet(book));

  root.querySelectorAll('[data-vocab-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const entry = bookVocab(getBook(id)).find((v) => v.id === btn.getAttribute('data-vocab-open'));
      if (entry) showSheet(entryDetailHtml(entry));
    });
  });

  root.querySelectorAll('[data-vocab-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteBookVocab(id, btn.getAttribute('data-vocab-del'));
      rerender();
    });
  });
}
