// What's New — the in-app changelog.
import { CHANGELOG } from '../changelog.js';
import { formatDate } from '../store.js';
import { subHeader, icon, esc } from '../ui.js';

const KINDS = {
  new: { label: 'New', iconName: 'auto_awesome', cls: 'text-accent-soft' },
  improved: { label: 'Improved', iconName: 'trending_up', cls: 'text-accent-soft' },
  fixed: { label: 'Fixed', iconName: 'build', cls: 'text-secondary' },
};
const ORDER = ['new', 'improved', 'fixed'];

function groupHtml(kind, items) {
  const meta = KINDS[kind];
  return `
  <div class="mb-stack-md last:mb-0">
    <div class="flex items-center gap-2 mb-2">
      ${icon(meta.iconName, `${meta.cls} text-[18px]`)}
      <span class="text-label-md uppercase tracking-wider ${meta.cls}">${meta.label}</span>
    </div>
    <ul class="flex flex-col gap-2">
      ${items.map((c) => `
      <li class="flex gap-2 text-body-md text-on-surface">
        <span class="text-secondary shrink-0">•</span>
        <span>${esc(c.text)}</span>
      </li>`).join('')}
    </ul>
  </div>`;
}

export function render() {
  return `
  ${subHeader("What's New")}
  <main class="pt-page pb-page-sub px-margin-mobile max-w-2xl mx-auto page-enter stagger">
    ${CHANGELOG.map((entry, i) => `
    <section class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md mb-gutter">
      <div class="flex items-baseline justify-between gap-2 mb-1">
        <h2 class="text-headline-md text-on-surface">
          v${esc(entry.version)}
          ${i === 0 ? '<span class="ml-2 align-middle text-label-sm uppercase tracking-wider text-accent-soft bg-accent-tint rounded-full px-2 py-0.5">Latest</span>' : ''}
        </h2>
        <span class="text-label-sm text-secondary shrink-0">${formatDate(`${entry.date}T12:00`)}</span>
      </div>
      <p class="text-body-md text-secondary mb-stack-md">${esc(entry.summary)}</p>
      ${ORDER
        .map((kind) => [kind, entry.changes.filter((c) => c.kind === kind)])
        .filter(([, items]) => items.length)
        .map(([kind, items]) => groupHtml(kind, items))
        .join('')}
    </section>`).join('')}
  </main>`;
}
