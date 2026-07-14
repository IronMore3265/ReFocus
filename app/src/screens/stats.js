// Stats dashboard — ported from stitch focus_dashboard/code.html
import {
  focusMinutesOn, sessionsOn, todayKey, weeklyActivity, currentStreak, longestStreak,
  allTrackStatuses,
} from '../store.js';
import { subHeader, icon, esc } from '../ui.js';
import { medal } from './achievements.js';

export function render() {
  const today = todayKey();
  const min = focusMinutesOn(today);
  const sessions = sessionsOn(today).length;
  const week = weeklyActivity();
  const max = Math.max(60, ...week.map((d) => d.minutes));
  const streak = currentStreak();
  const best = longestStreak();
  const ranked = allTrackStatuses()
    .filter((s) => s.level > 0)
    .sort((a, b) => b.level - a.level || b.progress - a.progress)
    .slice(0, 3);
  const todayIdx = week.findIndex((d) => d.day === today);

  return `
  ${subHeader('Focus Stats')}
  <main class="pt-page pb-page-sub px-margin-mobile max-w-2xl mx-auto page-enter flex flex-col gap-gutter stagger">

    <div class="grid grid-cols-2 gap-gutter">
      <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md">
        <span class="text-label-md uppercase tracking-wider text-secondary block mb-2">Total Focus</span>
        <span class="text-headline-lg-mobile text-accent-soft font-bold">${Math.floor(min / 60)}h <span class="text-headline-md">${min % 60}m</span></span>
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
          <div class="rise w-full rounded-t ${i === todayIdx ? 'bg-accent' : 'bg-surface-container-highest'}" style="height:${Math.max(4, Math.round((d.minutes / max) * 100))}%; --rise-delay:${(i * 0.06).toFixed(2)}s"></div>
          <span class="text-label-sm ${i === todayIdx ? 'text-accent-soft font-bold' : 'text-secondary'}">${d.label}</span>
        </div>`).join('')}
      </div>
    </div>

    <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md">
      <div class="flex items-center gap-3 mb-stack-sm">
        ${icon('streak', 'text-accent-soft', streak > 0)}
        <h2 class="text-headline-md text-on-surface">Daily Streak</h2>
      </div>

      <div class="flex items-baseline gap-2 mb-stack-md">
        <span class="text-headline-lg-mobile text-on-surface font-bold">${streak}</span>
        <span class="text-body-md text-secondary">day${streak === 1 ? '' : 's'} in a row</span>
        <span class="ml-auto text-label-sm text-secondary uppercase tracking-wider">Best ${best}</span>
      </div>

      <div class="flex gap-1.5">
        ${week.map((d, i) => {
          const lit = d.minutes > 0;
          const isToday = i === todayIdx;
          const cell = lit
            ? 'bg-accent text-on-primary border-accent'
            : 'text-surface-dim border-surface-container-highest';
          return `
          <div class="flex flex-col items-center gap-1.5 flex-1">
            <div class="w-full h-10 rounded-xl flex items-center justify-center transition-colors ${cell} ${
              isToday ? 'border-2 border-accent-soft' : 'border'
            }">
              ${icon('streak', 'text-[18px]', lit)}
            </div>
            <span class="text-label-sm ${isToday ? 'text-accent-soft font-bold' : 'text-secondary'}">${d.label}</span>
          </div>`;
        }).join('')}
      </div>

      <p class="text-body-sm text-secondary mt-stack-sm">
        ${streak > 0 ? 'Focus today to keep it burning.' : 'Finish a focus session to start a streak.'}
      </p>
    </div>

    <button data-nav="#/achievements" class="w-full text-left bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md active:bg-surface-container-low transition-colors">
      <span class="flex items-center justify-between mb-stack-sm">
        <span class="flex items-center gap-3">
          ${icon('trophy', 'text-accent-soft')}
          <span class="text-headline-md text-on-surface">Recent Achievements</span>
        </span>
        ${icon('chevron-right', 'text-secondary')}
      </span>
      ${ranked.length ? ranked.map(({ track, tier, value }) => `
      <span class="flex items-center gap-4 py-3 border-b border-surface-container last:border-0">
        ${medal(tier, 'w-12 h-12', track.icon, 'text-[22px]')}
        <span class="block">
          <span class="block text-body-md font-semibold text-on-surface">${tier.name} · ${esc(track.title)}</span>
          <span class="block text-body-sm text-secondary">${value} ${track.unit}</span>
        </span>
      </span>`).join('') : `<span class="block text-body-sm text-secondary py-2">Complete focus sessions to earn your first Bronze tier.</span>`}
    </button>

    <button data-nav="#/history" class="flex items-center justify-between px-stack-md py-4 bg-surface-container-lowest border border-surface-container-high rounded-xl text-on-surface active:bg-surface-container-low transition-colors">
      <span class="flex items-center gap-3">${icon('calendar', 'text-accent-soft')}
        <span class="text-body-md">View full history</span></span>
      ${icon('chevron-right', 'text-secondary')}
    </button>
  </main>`;
}
