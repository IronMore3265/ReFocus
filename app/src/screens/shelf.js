// Finished-books shelf.
import { finishedBooks, formatDate } from '../store.js';
import { subHeader, esc, emptyState } from '../ui.js';
import { coverHtml } from './reading.js';

export function render() {
  const books = finishedBooks();
  return `
  ${subHeader('Finished Shelf')}
  <main class="pt-page pb-page-sub px-margin-mobile max-w-2xl mx-auto page-enter">
    <p class="text-body-md text-secondary mb-stack-md">${books.length} book${books.length === 1 ? '' : 's'} completed. Your trophy shelf.</p>
    <div class="flex flex-col gap-3">
      ${books.length ? books.map((b) => `
      <button data-nav="#/book/${b.id}" class="w-full text-left bg-surface-container-lowest border border-surface-container-high rounded-xl p-4 flex gap-4 items-center active:bg-surface-bright transition-colors">
        ${coverHtml(b, 'w-12 h-[72px]')}
        <div class="flex flex-col min-w-0">
          <h3 class="text-body-lg font-semibold text-on-surface truncate">${esc(b.title)}</h3>
          <p class="text-body-sm text-secondary truncate">${esc(b.author)}</p>
          <span class="text-label-sm text-accent-soft mt-1">Finished ${b.finishedAt ? formatDate(b.finishedAt) : ''} · ${b.totalPages} pages</span>
        </div>
      </button>`).join('')
      : emptyState('shelf', 'Nothing here yet', 'Books you mark as finished will appear on this shelf.')}
    </div>
  </main>`;
}
