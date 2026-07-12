// Achievement unlock celebration — watches data writes, compares the derived
// tier levels against the last-seen snapshot, and shows a trophy + confetti
// overlay for every fresh unlock (queued one after another).
import {
  TIERS, allTrackStatuses,
  currentAchievementLevels, getSeenAchievementLevels, setSeenAchievementLevels,
} from './store.js';
import { esc } from './ui.js';

// Only these collections feed achievement metrics (hours/streak derive from sessions).
const RELEVANT_KEYS = new Set(['sessions', 'tasks', 'readingLog', 'books']);

const queue = [];
let showing = false;

function showNext() {
  if (showing || !queue.length) return;
  showing = true;
  const { tier, track, title } = queue.shift();

  const confetti = Array.from({ length: 28 }, (_, i) => {
    const color = TIERS[i % TIERS.length].color;
    const size = 6 + Math.random() * 6;
    return `<span class="confetti" style="left:${(Math.random() * 100).toFixed(1)}%; width:${size.toFixed(0)}px; height:${(size * 0.45).toFixed(0)}px; background:${color}; animation-delay:${(Math.random() * 0.6).toFixed(2)}s; animation-duration:${(2 + Math.random() * 1.4).toFixed(2)}s; --drift:${(Math.random() * 80 - 40).toFixed(0)}px"></span>`;
  }).join('');

  const wrap = document.createElement('div');
  wrap.className = 'fixed inset-0 z-50 flex items-center justify-center';
  wrap.innerHTML = `
    <div class="modal-backdrop absolute inset-0 bg-black/50"></div>
    <div class="absolute inset-0 overflow-hidden pointer-events-none">${confetti}</div>
    <div class="relative flex flex-col items-center text-center px-8 pop-in">
      <div class="burst w-28 h-28 rounded-full flex items-center justify-center mb-6"
        style="--color-accent:${tier.color}; background:linear-gradient(145deg, ${tier.color}, color-mix(in srgb, ${tier.color} 55%, #000)); box-shadow:0 8px 28px color-mix(in srgb, ${tier.color} 50%, transparent)">
        <span class="material-symbols-outlined icon-fill text-white text-[56px]">trophy</span>
      </div>
      <h2 class="text-headline-lg-mobile text-white font-bold mb-1">${esc(title)}</h2>
      <p class="text-body-lg text-white/85">${esc(tier.name)} · ${esc(track.title)}</p>
      <p class="text-label-sm text-white/60 uppercase tracking-wider mt-4">Tap to continue</p>
    </div>`;
  document.body.appendChild(wrap);

  const done = () => {
    clearTimeout(autoClose);
    wrap.remove();
    showing = false;
    showNext();
  };
  const autoClose = setTimeout(done, 3500);
  wrap.addEventListener('click', done);
}

function checkAchievements() {
  const seen = getSeenAchievementLevels();
  const current = currentAchievementLevels();
  if (seen === null) {
    setSeenAchievementLevels(current); // first sighting — seed silently
    return;
  }
  let changed = false;
  for (const { track, level } of allTrackStatuses()) {
    const prev = seen[track.id] || 0;
    for (let lvl = prev + 1; lvl <= level; lvl++) {
      queue.push({ tier: TIERS[lvl - 1], track, title: track.titles[lvl - 1] });
      changed = true;
    }
  }
  if (changed) {
    setSeenAchievementLevels(current);
    showNext();
  }
}

export function initCelebrations() {
  // Seed on boot so an existing install doesn't celebrate every old tier at once.
  if (getSeenAchievementLevels() === null) {
    setSeenAchievementLevels(currentAchievementLevels());
  }
  let debounce = null;
  window.addEventListener('fs:changed', (e) => {
    if (!RELEVANT_KEYS.has(e.detail.key)) return;
    clearTimeout(debounce);
    debounce = setTimeout(checkAchievements, 300);
  });
}
