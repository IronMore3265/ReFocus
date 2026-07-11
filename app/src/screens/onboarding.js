// First-launch onboarding: animated tour of what ReFocus does,
// then name + timer rhythm.
import { getProfile, setProfile, getSettings, setSettings } from '../store.js';
import { icon, esc, inputCls } from '../ui.js';
import { refreshIdleTimer } from '../engine.js';

let step = 0;

// Animated dial used on the welcome + focus slides
function dial(accentVar, sweep = false) {
  return `
  <div class="float relative w-44 h-44 mb-stack-lg">
    <svg viewBox="0 0 100 104" class="w-full h-full">
      <circle cx="50" cy="52" r="45" fill="none" stroke="var(--color-surface-container-highest)" stroke-width="3"/>
      <circle class="draw-ring" cx="50" cy="52" r="45" fill="none" stroke="${accentVar}" stroke-width="4"
        stroke-linecap="round" transform="rotate(-90 50 52)"/>
      <path class="${sweep ? 'sweep' : ''}" d="M 50 52 L 50 24" stroke="${accentVar}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="50" cy="52" r="5" fill="${accentVar}"/>
    </svg>
    <div class="absolute inset-6 rounded-full border-2 opacity-20 pulse-ring pointer-events-none" style="border-color:${accentVar}"></div>
  </div>`;
}

const slides = [
  {
    art: () => dial('var(--accent, #c0392c)'),
    title: 'Welcome to ReFocus',
    copy: 'A calm home for your focus sessions, reading, and tasks. Everything stays on your phone — no accounts, no cloud.',
  },
  {
    art: () => dial('#c0392c', true),
    title: 'Focus in rhythms',
    copy: 'Run distraction-free pomodoro sessions with smart breaks. ReFocus alerts you when time is up, even if you switch apps.',
  },
  {
    art: () => `
    <div class="float w-44 mb-stack-lg accent-reading">
      <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <div class="w-12 h-16 mx-auto mb-3 rounded bg-surface-container-low border border-surface-variant flex flex-col items-center justify-center gap-1">
          ${icon('auto_stories', 'text-accent-soft')}
        </div>
        <div class="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden mb-2">
          <div class="grow-x h-full bg-accent-soft rounded-full" style="width:72%; animation-duration:1.6s"></div>
        </div>
        <p class="text-label-sm text-secondary text-center">Page 214 of 334</p>
      </div>
    </div>`,
    title: 'Track your reading',
    copy: 'Log pages, capture notes and quotes, and watch books move to your finished shelf.',
  },
  {
    art: () => `
    <div class="float w-52 mb-stack-lg accent-tasks self-check">
      <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.06)] flex flex-col gap-3">
        ${['Plan the day', 'Deep work block', 'Evening review'].map((t) => `
        <div class="row flex items-center gap-3">
          <span class="tick w-5 h-5 rounded flex items-center justify-center bg-accent">${icon('check', 'text-white text-[14px]')}</span>
          <span class="text-body-sm text-on-surface">${t}</span>
        </div>`).join('')}
      </div>
    </div>`,
    title: 'Organize & level up',
    copy: 'Plan tasks with due dates and subtasks. Consistency earns achievement tiers — Bronze all the way to Diamond.',
  },
  {
    art: () => `
    <div class="float w-24 h-24 rounded-full bg-surface-container-low border border-surface-container-high flex items-center justify-center mb-stack-lg">
      ${icon('waving_hand', 'text-accent-soft text-[48px]')}
    </div>`,
    title: 'What should we call you?',
    copy: 'Used for your daily greeting.',
    form: () => `<input data-name type="text" placeholder="Your name" value="${esc(getProfile().name)}" class="${inputCls} max-w-xs text-center mt-2" />`,
  },
  {
    art: () => `
    <div class="float w-24 h-24 rounded-full bg-surface-container-low border border-surface-container-high flex items-center justify-center mb-stack-lg">
      ${icon('tune', 'text-accent-soft text-[48px]')}
    </div>`,
    title: 'Your rhythm',
    copy: 'You can change these anytime in Settings.',
    form: () => {
      const s = getSettings();
      return `
      <div class="grid grid-cols-2 gap-3 w-full max-w-xs text-left mt-2">
        <label><span class="text-label-md uppercase text-secondary block mb-2">Focus (min)</span>
          <input data-focus type="number" min="1" max="180" value="${s.focusMin}" class="${inputCls}" /></label>
        <label><span class="text-label-md uppercase text-secondary block mb-2">Break (min)</span>
          <input data-break type="number" min="1" max="60" value="${s.breakMin}" class="${inputCls}" /></label>
      </div>`;
    },
  },
];

export function render() {
  step = 0;
  return shell();
}

function shell() {
  const s = slides[step];
  return `
  <main class="min-h-screen flex flex-col items-center justify-center px-margin-mobile py-12 text-center bg-surface">
    <div class="flex flex-col items-center flex-grow justify-center w-full">
      <div class="flex flex-col items-center w-full fade-in" data-slide>
        ${s.art()}
        <h1 class="text-headline-lg-mobile text-on-surface mb-3">${s.title}</h1>
        <p class="text-body-md text-secondary max-w-xs">${s.copy}</p>
        ${s.form ? s.form() : ''}
      </div>
    </div>
    <div class="flex gap-2 mb-stack-md">
      ${slides.map((_, i) => `<div class="w-2 h-2 rounded-full transition-colors duration-300 ${i === step ? 'bg-accent' : 'bg-surface-dim'}"></div>`).join('')}
    </div>
    <div class="flex gap-3 w-full max-w-xs">
      ${step > 0 && step < 4 ? `<button data-action="skip-tour" class="flex-1 py-4 rounded-full border border-surface-container-highest text-secondary text-label-md">Skip tour</button>` : ''}
      <button data-action="next" class="flex-[2] py-4 rounded-full bg-accent text-on-primary text-label-md active:scale-[0.98] transition-transform">
        ${step === slides.length - 1 ? 'Start Focusing' : 'Continue'}
      </button>
    </div>
  </main>`;
}

export function mount(root) {
  const persistInputs = () => {
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
  };
  const goto = (n) => {
    step = n;
    root.innerHTML = shell();
    wire();
  };
  const finish = () => {
    setProfile({ onboarded: true });
    location.hash = '#/home';
  };
  const wire = () => {
    root.querySelector('[data-action="next"]').addEventListener('click', () => {
      persistInputs();
      if (step < slides.length - 1) goto(step + 1);
      else finish();
    });
    root.querySelector('[data-action="skip-tour"]')?.addEventListener('click', () => goto(4));
  };
  wire();
}
