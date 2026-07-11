// Stats dashboard — ported from stitch focus_dashboard/code.html
import {
  focusMinutesOn, sessionsOn, todayKey, weeklyActivity, currentStreak,
  ACHIEVEMENTS, unlockedAchievements,
} from '../store.js';
import { subHeader, icon, esc, progressRing } from '../ui.js';

export function render() {
  const today = todayKey();
  const min = focusMinutesOn(today);
  const sessions = sessionsOn(today).length;
  const week = weeklyActivity();
  const max = Math.max(60, ...week.map((d) => d.minutes));
  const streak = currentStreak();
  const unlocked = unlockedAchievements();
  const recent = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).slice(-3).reverse();
  const todayIdx = week.findIndex((d) => d.day === today);

  return `
  ${subHeader('Focus Dashboard')}
  <main class="pt-24 pb-16 px-margin-mobile max-w-2xl mx-auto page-enter flex flex-col gap-gutter">

    <div class="grid grid-cols-2 gap-gutter">
      <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md">
        <span class="text-label-md uppercase tracking-wider text-secondary block mb-2">Total Focus</span>
        <span class="text-headline-lg-mobile text-primary-container font-bold">${Math.floor(min / 60)}h <span class="text-headline-md">${min % 60}m</span></span>
      </div>
      <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md">
        <span class="text-label-md uppercase tracking-wider text-secondary block mb-2">Sessions</span>
        <span class="text-headline-lg-mobile text-on-surface font-bold">${sessions}</span>
      </div>
    </div>

    <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md">
      <h2 class="text-headline-md text-on-surface mb-stack-md">Weekly Activity</h2>
      <div class="flex items-end justify-between gap-2 h-40">
        ${week.map((d, i) => `
        <div class="flex flex-col items-center flex-1 h-full justify-end gap-2">
          <div class="w-full rounded-t ${i === todayIdx ? 'bg-primary-container' : 'bg-surface-container-highest'}" style="height:${Math.max(4, Math.round((d.minutes / max) * 100))}%"></div>
          <span class="text-label-sm ${i === todayIdx ? 'text-primary-container font-bold' : 'text-secondary'}">${d.label}</span>
        </div>`).join('')}
      </div>
    </div>

    <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md">
      <div class="flex items-center gap-3 mb-stack-sm">
        ${icon('local_fire_department', 'text-primary-container')}
        <h2 class="text-headline-md text-on-surface">Daily Streaks</h2>
      </div>
      <div class="flex justify-center py-2">
        ${progressRing({
          progress: Math.min(1, streak / 30), size: 176, stroke: 14,
          centerHtml: `
            <span class="text-headline-lg-mobile text-on-surface font-bold">${streak}</span>
            <span class="text-label-sm text-secondary uppercase">day${streak === 1 ? '' : 's'}</span>`,
        })}
      </div>
    </div>

    <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md">
      <div class="flex items-center justify-between mb-stack-sm">
        <div class="flex items-center gap-3">
          ${icon('trophy', 'text-primary-container')}
          <h2 class="text-headline-md text-on-surface">Recent Achievements</h2>
        </div>
        <button data-nav="#/achievements" class="text-secondary">${icon('chevron_right')}</button>
      </div>
      ${recent.length ? recent.map((a) => `
      <div class="flex items-center gap-4 py-3 border-b border-surface-container last:border-0">
        <div class="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center">
          ${icon(a.icon, 'text-primary-container')}
        </div>
        <div>
          <p class="text-body-md font-semibold text-on-surface">${esc(a.title)}</p>
          <p class="text-body-sm text-secondary">${esc(a.desc)}</p>
        </div>
      </div>`).join('') : `<p class="text-body-sm text-secondary py-2">Complete focus sessions to unlock achievements.</p>`}
    </div>

    <button data-nav="#/history" class="flex items-center justify-between px-stack-md py-4 bg-surface-container-low rounded-xl text-on-surface active:bg-surface-container transition-colors">
      <span class="flex items-center gap-3">${icon('calendar_month', 'text-primary-container')}
        <span class="text-body-md">View full history</span></span>
      ${icon('chevron_right', 'text-secondary')}
    </button>
  </main>`;
}
