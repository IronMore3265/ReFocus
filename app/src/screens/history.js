// History journal — day-by-day log of sessions, pages read, and completed tasks.
import { getSessions, getReadingLog, getTasks, getBooks, dayKey, formatTime } from '../store.js';
import { subHeader, icon, esc, emptyState } from '../ui.js';

function dayTitle(day) {
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  if (day === today) return 'Today';
  if (day === yesterday) return 'Yesterday';
  return new Date(`${day}T12:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

export function render() {
  const bookTitle = Object.fromEntries(getBooks().map((b) => [b.id, b.title]));

  const days = {};
  const push = (day, entry) => { (days[day] = days[day] || []).push(entry); };

  for (const s of getSessions()) {
    push(s.day, {
      at: s.endedAt, iconName: 'timer',
      text: `${s.minutes} min focus session${s.note ? ` — ${s.note}` : ''}`,
      sub: formatTime(s.endedAt),
    });
  }
  for (const r of getReadingLog()) {
    push(r.day, {
      at: r.at, iconName: 'auto_stories',
      text: `Read ${r.to - r.from} pages of ${bookTitle[r.bookId] || 'a book'}`,
      sub: formatTime(r.at),
    });
  }
  for (const t of getTasks()) {
    if (t.done && t.completedAt) {
      push(dayKey(new Date(t.completedAt)), {
        at: t.completedAt, iconName: 'task_alt',
        text: `Completed "${t.title}"`,
        sub: formatTime(t.completedAt),
      });
    }
  }

  const sortedDays = Object.keys(days).sort().reverse();

  return `
  ${subHeader('History')}
  <main class="pt-24 pb-16 px-margin-mobile max-w-2xl mx-auto page-enter">
    ${sortedDays.length ? sortedDays.map((day) => `
    <section class="mb-stack-md">
      <h2 class="text-label-md uppercase tracking-wider text-secondary mb-2 px-1">${dayTitle(day)}</h2>
      <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl px-stack-md">
        ${days[day].sort((a, b) => b.at - a.at).map((e) => `
        <div class="flex items-center gap-4 py-4 border-b border-surface-container last:border-0">
          ${icon(e.iconName, 'text-primary-container')}
          <p class="text-body-md text-on-surface flex-grow">${esc(e.text)}</p>
          <span class="text-label-sm text-secondary flex-shrink-0">${e.sub}</span>
        </div>`).join('')}
      </div>
    </section>`).join('')
    : emptyState('calendar_month', 'No history yet', 'Your focus sessions, reading, and completed tasks will appear here day by day.')}
  </main>`;
}
