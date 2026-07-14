// History journal — day-by-day log of sessions, pages read, and completed tasks.
//
// The journal owns no data of its own: it's a view over three collections. So
// deleting a row here deletes the record it was drawn from — which for a task
// row means the task itself. The confirmation says so out loud.
import {
  getSessions, getReadingLog, getTasks, getBooks,
  deleteSession, deleteReadingLogEntry, deleteTask,
  dayKey, formatTime,
} from '../store.js';
import { subHeader, icon, esc, emptyState, confirmSheet, rerender } from '../ui.js';

function dayTitle(day) {
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  if (day === today) return 'Today';
  if (day === yesterday) return 'Yesterday';
  return new Date(`${day}T12:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

// Every entry carries the type and id of the record behind it, so a delete can
// find its way home.
function collectEntries() {
  const bookTitle = Object.fromEntries(getBooks().map((b) => [b.id, b.title]));
  const days = {};
  const push = (day, entry) => { (days[day] = days[day] || []).push(entry); };

  for (const s of getSessions()) {
    push(s.day, {
      type: 'session', id: s.id, at: s.endedAt, iconName: 'timer',
      text: `${s.minutes} min focus session${s.note ? ` — ${s.note}` : ''}`,
      sub: formatTime(s.endedAt),
    });
  }
  for (const r of getReadingLog()) {
    push(r.day, {
      type: 'reading', id: r.id, at: r.at, iconName: 'auto_stories',
      text: `Read ${r.to - r.from} pages of ${bookTitle[r.bookId] || 'a book'}`,
      sub: formatTime(r.at),
    });
  }
  for (const t of getTasks()) {
    if (t.done && t.completedAt) {
      push(dayKey(new Date(t.completedAt)), {
        type: 'task', id: t.id, at: t.completedAt, iconName: 'task_alt',
        text: `Completed "${t.title}"`,
        sub: formatTime(t.completedAt),
      });
    }
  }
  return days;
}

const DELETERS = {
  session: deleteSession,
  reading: deleteReadingLogEntry,
  task: deleteTask,
};

// Spells out what a selection actually costs. The two things worth saying are
// that a task row takes the task with it, and that sessions carry the minutes
// the streak and the achievements are counted from.
function deletionWarning(entries) {
  const count = (type) => entries.filter((e) => e.type === type).length;
  const sessions = count('session');
  const reading = count('reading');
  const tasks = count('task');

  const parts = [];
  if (sessions) parts.push(`${sessions} focus session${sessions > 1 ? 's' : ''}`);
  if (reading) parts.push(`${reading} reading update${reading > 1 ? 's' : ''}`);
  if (tasks) parts.push(`${tasks} completed task${tasks > 1 ? 's' : ''}`);

  const lines = [`${parts.join(', ').replace(/, ([^,]*)$/, ' and $1')} will be permanently deleted.`];
  if (tasks) {
    lines.push(tasks > 1
      ? 'The completed tasks are removed from your task list too, not just from this journal.'
      : 'The completed task is removed from your task list too, not just from this journal.');
  }
  if (sessions) {
    lines.push('Deleting focus sessions lowers your total focus time and can break a streak.');
  }
  lines.push('This cannot be undone.');
  return lines.join(' ');
}

function confirmDelete(entries) {
  confirmSheet({
    title: entries.length > 1 ? `Delete ${entries.length} entries?` : 'Delete this entry?',
    message: deletionWarning(entries),
    confirmLabel: 'Delete',
    onConfirm: () => {
      entries.forEach((e) => DELETERS[e.type](e.id));
      rerender();
    },
  });
}

// The checkbox ships without a display class: mount() adds "flex" only while
// selecting, because "hidden" and "flex" both set display and must never both be
// on the element at once.
function rowHtml(e) {
  return `
  <div data-entry="${e.type}:${e.id}" class="flex items-center gap-4 py-4 border-b border-surface-container last:border-0">
    <span data-check class="hidden shrink-0 w-5 h-5 rounded border-2 border-surface-container-highest items-center justify-center">
      ${icon('check', 'text-[14px] text-on-primary opacity-0')}
    </span>
    ${icon(e.iconName, 'text-accent-soft shrink-0')}
    <p class="text-body-md text-on-surface flex-grow min-w-0">${esc(e.text)}</p>
    <span class="text-label-sm text-secondary shrink-0">${e.sub}</span>
    <button data-row-del aria-label="Delete entry" class="p-1 -mr-1 text-secondary shrink-0 active:opacity-70">
      ${icon('delete', 'text-[18px]')}
    </button>
  </div>`;
}

export function render() {
  const days = collectEntries();
  const sortedDays = Object.keys(days).sort().reverse();

  if (!sortedDays.length) {
    return `
    ${subHeader('History')}
    <main class="pt-page pb-page-sub px-margin-mobile max-w-2xl mx-auto page-enter">
      ${emptyState('calendar_month', 'No history yet', 'Your focus sessions, reading, and completed tasks will appear here day by day.')}
    </main>`;
  }

  return `
  ${subHeader('History', `
    <button data-action="select" class="px-3 py-2 text-label-md text-accent-soft shrink-0">Select</button>`)}
  <main data-list class="pt-page pb-page-sub px-margin-mobile max-w-2xl mx-auto page-enter stagger">
    ${sortedDays.map((day) => `
    <section class="mb-stack-md">
      <h2 class="text-label-md uppercase tracking-wider text-secondary mb-2 px-1">${dayTitle(day)}</h2>
      <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl px-stack-md">
        ${days[day].sort((a, b) => b.at - a.at).map(rowHtml).join('')}
      </div>
    </section>`).join('')}
  </main>

  <div data-selection-bar class="hidden pb-safe fixed bottom-0 left-0 w-full z-40 bg-surface border-t border-surface-container">
    <div class="flex justify-between items-center gap-4 h-16 px-margin-mobile max-w-2xl mx-auto">
      <span data-selection-count class="text-body-md text-on-surface">0 selected</span>
      <button data-action="delete-selected" disabled
        class="px-5 py-2.5 rounded-full bg-error text-on-error text-label-md disabled:opacity-40 active:scale-95 transition-transform">
        Delete
      </button>
    </div>
  </div>`;
}

export function mount(root) {
  const list = root.querySelector('[data-list]');
  if (!list) return; // empty state — nothing to select or delete

  const selectBtn = root.querySelector('[data-action="select"]');
  const bar = root.querySelector('[data-selection-bar]');
  const countEl = root.querySelector('[data-selection-count]');
  const deleteBtn = root.querySelector('[data-action="delete-selected"]');
  const rows = [...list.querySelectorAll('[data-entry]')];

  const days = collectEntries();
  const byKey = Object.fromEntries(
    Object.values(days).flat().map((e) => [`${e.type}:${e.id}`, e]),
  );

  let selecting = false;
  const selected = new Set();

  const paintRow = (row) => {
    const on = selected.has(row.getAttribute('data-entry'));
    const box = row.querySelector('[data-check]');
    box.classList.toggle('hidden', !selecting);
    box.classList.toggle('flex', selecting);
    box.classList.toggle('bg-accent', on);
    box.classList.toggle('border-accent', on);
    box.firstElementChild.classList.toggle('opacity-0', !on);
    row.querySelector('[data-row-del]').classList.toggle('hidden', selecting);
  };

  const paint = () => {
    rows.forEach(paintRow);
    bar.classList.toggle('hidden', !selecting);
    countEl.textContent = `${selected.size} selected`;
    deleteBtn.disabled = selected.size === 0;
    selectBtn.textContent = selecting ? 'Cancel' : 'Select';
  };

  selectBtn.addEventListener('click', () => {
    selecting = !selecting;
    selected.clear();
    paint();
  });

  rows.forEach((row) => {
    const key = row.getAttribute('data-entry');
    row.addEventListener('click', (e) => {
      if (!selecting) {
        // Not selecting: only the trash button does anything.
        if (e.target.closest('[data-row-del]')) confirmDelete([byKey[key]]);
        return;
      }
      if (selected.has(key)) selected.delete(key); else selected.add(key);
      paint();
    });
  });

  deleteBtn.addEventListener('click', () => {
    if (!selected.size) return;
    confirmDelete([...selected].map((k) => byKey[k]));
  });

  paint();
}
