// Reading tab — ported from stitch reading_tracker/code.html
import { currentlyReading, finishedBooks, addBook } from '../store.js';
import { appHeader, bottomNav, fab, icon, esc, progressBar, emptyState, showSheet, field, inputCls, primaryBtn, rerender } from '../ui.js';

// Placeholder "cover": monochrome block with the title's initials, per the design's grayscale covers.
export function coverHtml(book, cls = 'w-16 h-24') {
  const initials = book.title.split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
  return `
  <div class="${cls} flex-shrink-0 rounded overflow-hidden border border-surface-variant bg-surface-container-low flex flex-col items-center justify-center gap-1">
    <span class="text-headline-md text-secondary font-bold">${esc(initials)}</span>
    <div class="w-6 h-0.5 bg-primary-container"></div>
  </div>`;
}

function bookCard(book) {
  const pct = book.totalPages ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
  return `
  <button data-nav="#/book/${book.id}" class="w-full text-left bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md flex gap-gutter items-center active:bg-surface-bright transition-colors fade-in">
    ${coverHtml(book)}
    <div class="flex flex-col flex-grow min-w-0">
      <h3 class="text-headline-md text-on-surface leading-tight mb-1 truncate">${esc(book.title)}</h3>
      <p class="text-body-sm text-secondary mb-3 truncate">${esc(book.author)}</p>
      <div class="flex justify-between items-center mb-1">
        <span class="text-label-md uppercase tracking-wider text-secondary">Progress</span>
        <span class="text-label-md text-primary-container">${pct}%</span>
      </div>
      ${progressBar(pct)}
      <span class="text-body-sm text-secondary mt-2 self-end">Page ${book.currentPage} of ${book.totalPages}</span>
    </div>
  </button>`;
}

export function render() {
  const books = currentlyReading();
  const finished = finishedBooks();
  return `
  ${appHeader()}
  <main class="pt-24 pb-28 px-margin-mobile max-w-2xl mx-auto">
    <div class="mb-stack-md">
      <h1 class="text-headline-lg-mobile text-on-surface mb-unit">Currently Reading</h1>
      <p class="text-body-md text-secondary">Track your progress and stay immersed.</p>
    </div>
    <div class="flex flex-col gap-gutter">
      ${books.length
        ? books.map(bookCard).join('')
        : emptyState('auto_stories', 'No books yet', 'Tap + to add the book you are reading.')}
    </div>
    ${finished.length ? `
    <button data-nav="#/shelf" class="w-full mt-stack-md flex items-center justify-between px-stack-md py-4 bg-surface-container-low rounded-xl text-on-surface active:bg-surface-container transition-colors">
      <span class="flex items-center gap-3">${icon('collections_bookmark', 'text-primary-container')}
        <span class="text-body-md">Finished shelf</span></span>
      <span class="flex items-center gap-1 text-secondary text-body-sm">${finished.length} ${icon('chevron_right')}</span>
    </button>` : ''}
  </main>
  ${fab('add-book')}
  ${bottomNav('#/reading')}`;
}

export function openAddBook(onDone) {
  const { el, close } = showSheet(`
    <h2 class="text-headline-md text-on-surface mb-4">Add Book</h2>
    <form data-form>
      ${field('Title', `<input name="title" type="text" required class="${inputCls}" placeholder="Book title" />`)}
      ${field('Author', `<input name="author" type="text" class="${inputCls}" placeholder="Author" />`)}
      <div class="grid grid-cols-2 gap-3">
        ${field('Total pages', `<input name="totalPages" type="number" min="1" required class="${inputCls}" placeholder="320" />`)}
        ${field('Current page', `<input name="currentPage" type="number" min="0" class="${inputCls}" placeholder="0" />`)}
      </div>
      ${primaryBtn('Add Book', 'type="submit"')}
    </form>`);
  el.querySelector('[data-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    addBook({
      title: String(f.get('title')).trim(),
      author: String(f.get('author')).trim() || 'Unknown author',
      totalPages: Number(f.get('totalPages')),
      currentPage: Number(f.get('currentPage')) || 0,
    });
    close();
    onDone();
  });
}

export function mount(root) {
  root.querySelector('[data-action="add-book"]').addEventListener('click', () => {
    openAddBook(rerender);
  });
}
