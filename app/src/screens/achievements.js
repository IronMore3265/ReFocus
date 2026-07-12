// Achievements — six tracks, each leveling through seven tiers
// (Bronze → Silver → Gold → Pearl → Ruby → Sapphire → Diamond).
import { TIERS, allTrackStatuses } from '../store.js';
import { subHeader, icon, esc } from '../ui.js';

export function medal(tier, size = 'w-14 h-14', iconName = null, iconCls = 'text-[26px]') {
  if (!tier) {
    return `
    <div class="${size} rounded-full bg-surface-container-highest flex items-center justify-center">
      ${icon(iconName || 'lock', `text-secondary ${iconCls}`)}
    </div>`;
  }
  return `
  <div class="${size} rounded-full flex items-center justify-center" style="background:${tier.color}">
    ${icon(iconName || 'military_tech', `text-white ${iconCls}`)}
  </div>`;
}

export function render() {
  const statuses = allTrackStatuses();
  const totalLevels = statuses.reduce((s, x) => s + x.level, 0);
  const maxLevels = statuses.length * TIERS.length;

  return `
  ${subHeader('Achievements')}
  <main class="pt-page pb-page-sub px-margin-mobile max-w-2xl mx-auto page-enter">

    <div class="flex items-center justify-between mb-stack-sm">
      <p class="text-body-md text-secondary">${totalLevels} of ${maxLevels} achievements unlocked</p>
    </div>

    <!-- Tier ladder legend -->
    <div class="grid grid-cols-4 bg-surface-container-lowest border border-surface-container-high rounded-xl px-2 py-3 mb-stack-md gap-y-3">
      ${TIERS.map((t) => `
      <div class="flex flex-col items-center gap-1">
        <span class="material-symbols-outlined icon-fill text-[28px]" style="color:${t.color}">trophy</span>
        <span class="text-label-sm text-secondary">${t.name}</span>
      </div>`).join('')}
    </div>

    <div class="flex flex-col gap-4 stagger">
      ${statuses.map(({ track, value, level, tier, title, next, nextTitle, progress }) => `
      <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md">
        <div class="flex items-center gap-4 mb-3">
          ${medal(tier, 'w-14 h-14', track.icon)}
          <div class="flex-grow min-w-0">
            <div class="flex items-center justify-between">
              <p class="text-body-lg font-semibold text-on-surface">${esc(track.title)}</p>
              <span class="text-label-md px-3 py-1 rounded-full ${tier ? 'text-white' : 'text-secondary bg-surface-container-highest'}"
                ${tier ? `style="background:${tier.color}"` : ''}>${tier ? tier.name : 'Unranked'}</span>
            </div>
            <p class="text-body-sm mt-0.5">
              ${title ? `<span class="font-semibold" style="color:${tier.color}">${esc(title)}</span><span class="text-secondary"> · </span>` : ''}
              <span class="text-secondary">${value} ${track.unit}</span>
            </p>
          </div>
        </div>
        <div class="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden mb-2">
          <div class="grow-x h-full rounded-full" style="width:${Math.round(progress * 100)}%; background:${(TIERS[level] || TIERS[TIERS.length - 1]).color}"></div>
        </div>
        <p class="text-label-sm text-secondary">
          ${next !== null
            ? `Next: “${esc(nextTitle)}” — ${TIERS[level].name} at ${next} ${track.unit}`
            : 'Diamond — maxed out. Extraordinary.'}
        </p>
      </div>`).join('')}
    </div>
  </main>`;
}
