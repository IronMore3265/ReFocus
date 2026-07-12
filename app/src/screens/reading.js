// Reading tab — ported from stitch reading_tracker/code.html
import { currentlyReading, finishedBooks, addBook, getApifyToken } from '../store.js';
import { searchBooksFree, searchGoodreads, inlineCover } from '../api/books.js';
import { appHeader, bottomNav, fab, icon, esc, progressBar, emptyState, showSheet, field, inputCls, primaryBtn, rerender } from '../ui.js';

// Real cover when the book has one; otherwise a monochrome block with the
// title's initials, per the design's grayscale covers.
export function coverHtml(book, cls = 'w-16 h-24') {
  if (book.cover) {
    return `<img src="${esc(book.cover)}" alt="" class="${cls} flex-shrink-0 rounded overflow-hidden border border-surface-variant bg-surface-container-low object-cover" />`;
  }
  const initials = book.title.split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
  return `
  <div class="${cls} flex-shrink-0 rounded overflow-hidden border border-surface-variant bg-surface-container-low flex flex-col items-center justify-center gap-1">
    <span class="text-headline-md text-secondary font-bold">${esc(initials)}</span>
    <div class="w-6 h-0.5 bg-accent"></div>
  </div>`;
}

function bookCard(book) {
  const pct = book.totalPages ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
  return `
  <button data-nav="#/book/${book.id}" class="w-full text-left bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md flex gap-gutter items-center active:bg-surface-bright transition-colors">
    ${coverHtml(book)}
    <div class="flex flex-col flex-grow min-w-0">
      <h3 class="text-headline-md text-on-surface leading-tight mb-1 truncate">${esc(book.title)}</h3>
      <p class="text-body-sm text-secondary mb-3 truncate">${esc(book.author)}</p>
      <div class="flex justify-between items-center mb-1">
        <span class="text-label-md uppercase tracking-wider text-secondary">Progress</span>
        <span class="text-label-md text-accent-soft">${pct}%</span>
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
  <main class="pt-page pb-page px-margin-mobile max-w-2xl mx-auto stagger">
    <div class="mb-stack-md">
      <h1 class="text-headline-lg-mobile text-on-surface mb-unit">Currently Reading</h1>
      <p class="text-body-md text-secondary">Track your progress and stay immersed.</p>
    </div>
    <div class="flex flex-col gap-gutter stagger">
      ${books.length
        ? books.map(bookCard).join('')
        : emptyState('auto_stories', 'No books yet', 'Tap + to add the book you are reading.')}
    </div>
    ${finished.length ? `
    <button data-nav="#/shelf" class="w-full mt-stack-md flex items-center justify-between px-stack-md py-4 bg-surface-container-low rounded-xl text-on-surface active:bg-surface-container transition-colors">
      <span class="flex items-center gap-3">${icon('collections_bookmark', 'text-accent-soft')}
        <span class="text-body-md">Finished shelf</span></span>
      <span class="flex items-center gap-1 text-secondary text-body-sm">${finished.length} ${icon('chevron_right')}</span>
    </button>` : ''}
  </main>
  ${fab('add-book')}
  ${bottomNav('#/reading')}`;
}

// Small cover thumbnail for a search result (remote URL, list only).
function resultCover(coverUrl, title) {
  if (coverUrl) {
    return `<img src="${esc(coverUrl)}" alt="" class="w-11 h-16 flex-shrink-0 rounded object-cover border border-surface-variant bg-surface-container-low" />`;
  }
  const initial = (title.trim()[0] || '?').toUpperCase();
  return `
  <div class="w-11 h-16 flex-shrink-0 rounded border border-surface-variant bg-surface-container-low flex items-center justify-center">
    <span class="text-body-md text-secondary font-bold">${esc(initial)}</span>
  </div>`;
}

// Two-step Add Book sheet: search Google Books/Open Library live (with a
// Goodreads-via-Apify fallback), then confirm the pre-filled form.
export function openAddBook(onDone) {
  const { el, close } = showSheet(`
    <h2 class="text-headline-md text-on-surface mb-4">Add Book</h2>
    <div data-step="search">
      <input data-search type="search" autocomplete="off" class="${inputCls}" placeholder="Search title or author…" />
      <div data-results class="mt-3 flex flex-col gap-2"></div>
      <div data-status class="text-body-sm text-secondary text-center py-3 hidden"></div>
      <button data-goodreads class="w-full py-3 mt-2 rounded-full border border-on-surface text-on-surface text-label-md hidden">Search Goodreads instead</button>
      <p data-goodreads-hint class="text-label-sm text-secondary text-center mt-2 hidden">Not finding it? Add your free Apify token in Settings to also search Goodreads.</p>
      <button data-manual class="w-full py-3 mt-2 text-label-md text-accent-soft">Add manually</button>
    </div>
    <div data-step="form" class="hidden"></div>`);

  const searchStep = el.querySelector('[data-step="search"]');
  const formStep = el.querySelector('[data-step="form"]');
  const input = el.querySelector('[data-search]');
  const resultsEl = el.querySelector('[data-results]');
  const statusEl = el.querySelector('[data-status]');
  const goodreadsBtn = el.querySelector('[data-goodreads]');
  const goodreadsHint = el.querySelector('[data-goodreads-hint]');

  let results = [];
  let searchSeq = 0; // discard responses from stale queries
  let debounceTimer = null;

  const setStatus = (msg) => {
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('hidden', !msg);
  };

  const showFallbacks = (show) => {
    const hasToken = !!getApifyToken();
    goodreadsBtn.classList.toggle('hidden', !(show && hasToken));
    goodreadsHint.classList.toggle('hidden', !(show && !hasToken));
  };

  const renderResults = (list) => {
    results = list;
    resultsEl.innerHTML = list.map((b, i) => `
      <button data-pick="${i}" class="w-full text-left flex items-center gap-3 p-2 rounded-xl bg-surface-container-low active:bg-surface-container transition-colors">
        ${resultCover(b.coverUrl, b.title)}
        <div class="min-w-0 flex-grow">
          <p class="text-body-md text-on-surface leading-tight truncate">${esc(b.title)}</p>
          <p class="text-body-sm text-secondary truncate">${esc(b.author || 'Unknown author')}</p>
          <p class="text-label-sm text-secondary mt-0.5">${b.totalPages ? `${b.totalPages} pages · ` : ''}${esc(b.source)}</p>
        </div>
        ${icon('chevron_right', 'text-secondary flex-shrink-0')}
      </button>`).join('');
  };

  const runFreeSearch = async (query) => {
    const seq = ++searchSeq;
    setStatus('Searching…');
    showFallbacks(false);
    try {
      const list = await searchBooksFree(query);
      if (seq !== searchSeq) return;
      renderResults(list);
      setStatus(list.length ? '' : 'No matches found.');
      showFallbacks(true);
    } catch {
      if (seq !== searchSeq) return;
      renderResults([]);
      setStatus('Search failed — you may be offline. You can still add the book manually.');
    }
  };

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = input.value.trim();
    if (query.length < 2) {
      searchSeq++;
      renderResults([]);
      setStatus('');
      showFallbacks(false);
      return;
    }
    debounceTimer = setTimeout(() => runFreeSearch(query), 400);
  });

  goodreadsBtn.addEventListener('click', async () => {
    const query = input.value.trim();
    if (!query) return;
    const seq = ++searchSeq;
    renderResults([]);
    goodreadsBtn.disabled = true;
    goodreadsBtn.textContent = 'Searching Goodreads…';
    setStatus('Searching Goodreads — this can take up to a minute.');
    try {
      const list = await searchGoodreads(query, getApifyToken());
      if (seq !== searchSeq) return;
      renderResults(list);
      setStatus(list.length ? '' : 'Goodreads found no matches either.');
    } catch (err) {
      if (seq !== searchSeq) return;
      setStatus(err.message || 'Goodreads search failed — try again or add manually.');
    } finally {
      goodreadsBtn.disabled = false;
      goodreadsBtn.textContent = 'Search Goodreads instead';
    }
  });

  // Step 2 — the familiar form, pre-filled from the picked result (or blank).
  const showForm = (pick) => {
    formStep.innerHTML = `
      ${pick ? `
      <div class="flex items-center gap-3 mb-4">
        ${resultCover(pick.coverUrl, pick.title)}
        <div class="min-w-0">
          <p class="text-body-md text-on-surface leading-tight">${esc(pick.title)}</p>
          ${pick.synopsis ? `<p class="text-body-sm text-secondary mt-1 line-clamp-2">${esc(pick.synopsis)}</p>` : ''}
        </div>
      </div>` : ''}
      <form data-form>
        ${field('Title', `<input name="title" type="text" required value="${esc(pick?.title || '')}" class="${inputCls}" placeholder="Book title" />`)}
        ${field('Author', `<input name="author" type="text" value="${esc(pick?.author || '')}" class="${inputCls}" placeholder="Author" />`)}
        <div class="grid grid-cols-2 gap-3">
          ${field('Total pages', `<input name="totalPages" type="number" min="1" required value="${pick?.totalPages || ''}" class="${inputCls}" placeholder="320" />`)}
          ${field('Current page', `<input name="currentPage" type="number" min="0" class="${inputCls}" placeholder="0" />`)}
        </div>
        ${primaryBtn('Add Book', 'type="submit" data-submit')}
        <button type="button" data-back class="w-full py-3 mt-2 text-label-md text-secondary">Back to search</button>
      </form>`;
    searchStep.classList.add('hidden');
    formStep.classList.remove('hidden');

    formStep.querySelector('[data-back]').addEventListener('click', () => {
      formStep.classList.add('hidden');
      searchStep.classList.remove('hidden');
    });

    formStep.querySelector('[data-form]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = formStep.querySelector('[data-submit]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Adding…';
      // Inline the cover as a data URI so it renders offline in the APK.
      const cover = pick?.coverUrl ? await inlineCover(pick.coverUrl) : null;
      const f = new FormData(e.target);
      addBook({
        title: String(f.get('title')).trim(),
        author: String(f.get('author')).trim() || 'Unknown author',
        totalPages: Number(f.get('totalPages')),
        currentPage: Number(f.get('currentPage')) || 0,
        cover,
        synopsis: pick?.synopsis || '',
      });
      close();
      onDone();
    });
  };

  resultsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pick]');
    if (btn) showForm(results[Number(btn.getAttribute('data-pick'))]);
  });
  el.querySelector('[data-manual]').addEventListener('click', () => showForm(null));

  input.focus();
}

export function mount(root) {
  root.querySelector('[data-action="add-book"]').addEventListener('click', () => {
    openAddBook(rerender);
  });
}
