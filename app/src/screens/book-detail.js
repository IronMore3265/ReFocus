// Book detail — progress, page updates, notes, per-book reading history.
import {
  getBook, updateBook, deleteBook, addBookNote, deleteBookNote,
  getReadingLog, formatDate,
} from '../store.js';
import {
  subHeader, icon, esc, progressBar, showSheet, confirmSheet,
  field, inputCls, primaryBtn, emptyState, rerender,
} from '../ui.js';
import { coverHtml } from './reading.js';

export function render(id) {
  const book = getBook(id);
  if (!book) return `${subHeader('Book')}<main class="pt-24 px-margin-mobile">${emptyState('error', 'Book not found', 'It may have been deleted.')}</main>`;

  const pct = book.totalPages ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
  const log = getReadingLog().filter((r) => r.bookId === id).sort((a, b) => b.at - a.at);

  return `
  ${subHeader(book.title, `
    <button data-action="edit" class="p-3 text-on-surface">${icon('edit')}</button>
    <button data-action="delete" class="p-3 text-error">${icon('delete')}</button>`)}
  <main class="pt-24 pb-16 px-margin-mobile max-w-2xl mx-auto page-enter">

    <div class="flex gap-gutter items-center mb-stack-md">
      ${coverHtml(book, 'w-24 h-36')}
      <div class="flex flex-col min-w-0">
        <h1 class="text-headline-md text-on-surface leading-tight mb-1">${esc(book.title)}</h1>
        <p class="text-body-sm text-secondary mb-3">${esc(book.author)}</p>
        ${book.finished
          ? `<span class="inline-flex items-center gap-1 text-label-md text-primary-container bg-primary-fixed rounded-full px-3 py-1 self-start">${icon('check', 'text-[14px]')} Finished ${book.finishedAt ? formatDate(book.finishedAt) : ''}</span>`
          : `<span class="text-body-sm text-secondary">Page ${book.currentPage} of ${book.totalPages}</span>`}
      </div>
    </div>

    <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md mb-stack-md">
      <div class="flex justify-between items-center mb-2">
        <span class="text-label-md uppercase tracking-wider text-secondary">Progress</span>
        <span class="text-label-md text-primary-container">${pct}%</span>
      </div>
      ${progressBar(pct, 'mb-4')}
      ${book.finished ? `
      <button data-action="unfinish" class="w-full py-3 rounded-full border border-on-surface text-on-surface text-label-md">Move back to reading</button>
      ` : `
      <div class="flex gap-3">
        <button data-action="update-page" class="flex-1 py-3 rounded-full bg-primary-container text-on-primary text-label-md active:scale-[0.98] transition-transform">Update Page</button>
        <button data-action="finish" class="flex-1 py-3 rounded-full border border-on-surface text-on-surface text-label-md active:scale-[0.98] transition-transform">Mark Finished</button>
      </div>`}
    </div>

    <section class="mb-stack-md">
      <div class="flex justify-between items-center mb-stack-sm">
        <h2 class="text-headline-md text-on-surface">Notes & Quotes</h2>
        <button data-action="add-note" class="p-2 text-primary-container">${icon('add_circle')}</button>
      </div>
      <div class="flex flex-col gap-3">
        ${book.notes.length ? book.notes.slice().reverse().map((n) => `
        <div class="bg-surface-container-low rounded-xl p-4">
          <p class="text-body-md text-on-surface mb-2">${esc(n.text)}</p>
          <div class="flex justify-between items-center">
            <span class="text-label-sm text-secondary">p. ${n.page} · ${formatDate(n.at)}</span>
            <button data-note-del="${n.id}" class="text-secondary">${icon('close', 'text-[18px]')}</button>
          </div>
        </div>`).join('') : `<p class="text-body-sm text-secondary">No notes yet — capture a thought or a quote.</p>`}
      </div>
    </section>

    <section>
      <h2 class="text-headline-md text-on-surface mb-stack-sm">Reading History</h2>
      <div class="flex flex-col">
        ${log.length ? log.map((r) => `
        <div class="flex justify-between items-center py-3 border-b border-surface-container">
          <span class="text-body-md text-on-surface">${r.to - r.from} pages</span>
          <span class="text-body-sm text-secondary">p. ${r.from} → ${r.to} · ${formatDate(r.at)}</span>
        </div>`).join('') : `<p class="text-body-sm text-secondary">Progress updates will appear here.</p>`}
      </div>
    </section>
  </main>`;
}

export function mount(root, id) {
  const book = getBook(id);
  if (!book) return;

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
      message: `"${book.title}" and its notes will be removed.`,
      onConfirm: () => { deleteBook(id); location.hash = '#/reading'; },
    });
  });

  root.querySelector('[data-action="add-note"]').addEventListener('click', () => {
    const { el, close } = showSheet(`
      <h2 class="text-headline-md text-on-surface mb-4">Add Note</h2>
      <form data-form>
        ${field('Note or quote', `<textarea name="text" rows="3" required class="${inputCls} resize-none" placeholder="Write it down…"></textarea>`)}
        ${field('Page', `<input name="page" type="number" min="0" max="${book.totalPages}" value="${book.currentPage}" class="${inputCls}" />`)}
        ${primaryBtn('Save Note', 'type="submit"')}
      </form>`);
    el.querySelector('[data-form]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      addBookNote(id, String(f.get('text')).trim(), Number(f.get('page')));
      close();
      rerender();
    });
  });

  root.querySelectorAll('[data-note-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteBookNote(id, btn.getAttribute('data-note-del'));
      rerender();
    });
  });
}
