// Achievements — full badge grid with locked/unlocked states.
import { ACHIEVEMENTS, unlockedAchievements } from '../store.js';
import { subHeader, icon, esc } from '../ui.js';

export function render() {
  const unlocked = unlockedAchievements();
  return `
  ${subHeader('Achievements')}
  <main class="pt-24 pb-16 px-margin-mobile max-w-2xl mx-auto page-enter">
    <p class="text-body-md text-secondary mb-stack-md">${unlocked.size} of ${ACHIEVEMENTS.length} unlocked</p>
    <div class="grid grid-cols-2 gap-4">
      ${ACHIEVEMENTS.map((a) => {
        const on = unlocked.has(a.id);
        return `
        <div class="rounded-xl p-stack-md flex flex-col items-center text-center border ${
          on ? 'bg-surface-container-lowest border-surface-container-high' : 'bg-surface-container-low border-transparent opacity-60'
        }">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
            on ? 'bg-primary-fixed' : 'bg-surface-container-highest'
          }">
            ${icon(on ? a.icon : 'lock', on ? 'text-primary-container' : 'text-secondary')}
          </div>
          <p class="text-body-md font-semibold text-on-surface leading-tight mb-1">${esc(a.title)}</p>
          <p class="text-label-sm text-secondary">${esc(a.desc)}</p>
        </div>`;
      }).join('')}
    </div>
  </main>`;
}
