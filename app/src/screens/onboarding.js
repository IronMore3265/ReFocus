// First-launch onboarding: welcome → name → timer defaults.
import { getProfile, setProfile, getSettings, setSettings } from '../store.js';
import { icon, esc, inputCls } from '../ui.js';
import { refreshIdleTimer } from '../engine.js';

let step = 0;

const slides = [
  () => `
    <div class="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center mb-stack-lg">
      ${icon('timer', 'text-on-primary text-[48px]')}
    </div>
    <h1 class="text-headline-lg-mobile text-on-surface mb-3">Welcome to Focus Suite</h1>
    <p class="text-body-lg text-secondary max-w-xs">A calm home for your focus sessions, reading, and tasks. Everything stays on your phone.</p>`,
  () => `
    <div class="w-24 h-24 rounded-full bg-surface-container-low border border-surface-container-high flex items-center justify-center mb-stack-lg">
      ${icon('waving_hand', 'text-primary-container text-[48px]')}
    </div>
    <h1 class="text-headline-lg-mobile text-on-surface mb-3">What should we call you?</h1>
    <p class="text-body-md text-secondary mb-stack-md">Used for your morning greeting.</p>
    <input data-name type="text" placeholder="Your name" value="${esc(getProfile().name)}" class="${inputCls} max-w-xs text-center" />`,
  () => {
    const s = getSettings();
    return `
    <div class="w-24 h-24 rounded-full bg-surface-container-low border border-surface-container-high flex items-center justify-center mb-stack-lg">
      ${icon('tune', 'text-primary-container text-[48px]')}
    </div>
    <h1 class="text-headline-lg-mobile text-on-surface mb-3">Your rhythm</h1>
    <p class="text-body-md text-secondary mb-stack-md">You can change these anytime in Settings.</p>
    <div class="grid grid-cols-2 gap-3 w-full max-w-xs text-left">
      <label><span class="text-label-md uppercase text-secondary block mb-2">Focus (min)</span>
        <input data-focus type="number" min="1" max="180" value="${s.focusMin}" class="${inputCls}" /></label>
      <label><span class="text-label-md uppercase text-secondary block mb-2">Break (min)</span>
        <input data-break type="number" min="1" max="60" value="${s.breakMin}" class="${inputCls}" /></label>
    </div>`;
  },
];

export function render() {
  step = 0;
  return shell();
}

function shell() {
  return `
  <main class="min-h-screen flex flex-col items-center justify-center px-margin-mobile py-12 text-center bg-surface">
    <div data-slide class="flex flex-col items-center flex-grow justify-center w-full fade-in">
      ${slides[step]()}
    </div>
    <div class="flex gap-2 mb-stack-md">
      ${slides.map((_, i) => `<div class="w-2 h-2 rounded-full ${i === step ? 'bg-primary-container' : 'bg-surface-dim'}"></div>`).join('')}
    </div>
    <button data-action="next" class="w-full max-w-xs py-4 rounded-full bg-primary-container text-on-primary text-label-md active:scale-[0.98] transition-transform">
      ${step === slides.length - 1 ? 'Start Focusing' : 'Continue'}
    </button>
  </main>`;
}

export function mount(root) {
  const wire = () => {
    root.querySelector('[data-action="next"]').addEventListener('click', () => {
      // persist current slide's inputs
      const nameInput = root.querySelector('[data-name]');
      if (nameInput) setProfile({ name: nameInput.value.trim() });
      const focusInput = root.querySelector('[data-focus]');
      if (focusInput) {
        setSettings({
          focusMin: Math.max(1, Number(focusInput.value) || 25),
          breakMin: Math.max(1, Number(root.querySelector('[data-break]').value) || 5),
        });
        refreshIdleTimer();
      }

      if (step < slides.length - 1) {
        step++;
        root.innerHTML = shell();
        wire();
      } else {
        setProfile({ onboarded: true });
        location.hash = '#/home';
      }
    });
  };
  wire();
}
