// Home tab — ported from stitch home_overview/code.html
import { getProfile, currentlyReading, nextTask, dueLabel, toggleTask } from '../store.js';
import { getTimer, remainingMs, phaseProgress, startTimer, pauseTimer, skipPhase, onTimerChange, fmtClock } from '../engine.js';
import { appHeader, bottomNav, icon, esc, progressRing, setRingProgress, rerender } from '../ui.js';
import { coverHtml } from './reading.js';

function greeting() {
  const h = new Date().getHours();
  const name = getProfile().name;
  const word = h < 5 ? 'Good Night' : h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  return name ? `${word}, ${name}` : word;
}

export function render() {
  const t = getTimer();
  const running = t.status === 'running';
  const book = currentlyReading()[0];
  const task = nextTask();
  const bookPct = book && book.totalPages ? Math.round((book.currentPage / book.totalPages) * 100) : 0;

  return `
  ${appHeader()}
  <main class="pt-page pb-page px-margin-mobile max-w-2xl mx-auto flex flex-col gap-gutter stagger">
    <section class="text-center mt-2">
      <h1 class="text-headline-lg-mobile text-on-surface mb-unit">${esc(greeting())}</h1>
      <p class="text-body-lg text-secondary">Ready for another focused day.</p>
    </section>

    <!-- Active session (timer red) -->
    <div class="accent-timer bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md flex flex-col items-center">
      <div class="w-full flex justify-between items-center mb-stack-sm">
        <span class="text-label-md uppercase tracking-wider text-secondary">Active Session</span>
        <button data-nav="#/timer" class="text-secondary">${icon('arrow_forward')}</button>
      </div>
      <div data-ring-wrap class="relative">
        ${running ? '<div class="absolute inset-2 rounded-full border-2 border-accent-soft opacity-20 pulse-ring pointer-events-none"></div>' : ''}
        ${progressRing({
          progress: phaseProgress(t), size: 224, stroke: 4,
          centerHtml: `
            <span data-clock class="text-headline-xl font-light tracking-tight text-on-surface" style="font-feature-settings:'tnum'">${fmtClock(remainingMs(t))}</span>
            <span data-phase class="text-label-sm text-secondary mt-1">${t.phase === 'focus' ? 'Deep Work' : 'Break'}</span>`,
        })}
      </div>
      <div class="mt-stack-sm flex gap-4">
        <button data-action="toggle" class="bg-accent text-on-primary px-8 py-3 rounded-full text-label-md active:scale-95 transition-transform shadow-[0_8px_32px_rgba(0,0,0,0.04)]">${running ? 'Pause' : 'Start'}</button>
        <button data-action="skip" class="bg-transparent border border-on-surface text-on-surface px-8 py-3 rounded-full text-label-md active:scale-95 transition-transform">Skip</button>
      </div>
    </div>

    <!-- Currently reading (blue) -->
    <button ${book ? `data-nav="#/book/${book.id}"` : 'data-nav="#/reading"'} class="text-left bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md active:bg-surface-bright transition-colors">
      <div class="flex justify-between items-start mb-stack-sm">
        <span class="text-label-md uppercase tracking-wider text-secondary">Currently Reading</span>
        <div class="text-secondary">${icon('arrow_forward')}</div>
      </div>
      ${book ? `
      <div class="flex gap-gutter items-center">
        ${coverHtml(book)}
        <div class="flex flex-col min-w-0">
          <h3 class="text-headline-md text-on-surface leading-tight mb-1 truncate">${esc(book.title)}</h3>
          <p class="text-body-sm text-secondary mb-3 truncate">${esc(book.author)}</p>
          <div class="flex items-center gap-2">
            <div class="w-32 h-1 bg-surface-container-low rounded-full overflow-hidden">
              <div class="h-full bg-accent" style="width:${bookPct}%"></div>
            </div>
            <span class="text-label-sm text-secondary">${bookPct}%</span>
          </div>
        </div>
      </div>` : `<p class="text-body-md text-secondary">No book in progress — add one to start tracking.</p>`}
    </button>

    <!-- Next task (green) -->
    <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md">
      <div class="flex justify-between items-start mb-stack-sm">
        <span class="text-label-md uppercase tracking-wider text-secondary">Next Task</span>
        <button data-nav="#/tasks" class="text-secondary">${icon('arrow_forward')}</button>
      </div>
      ${task ? `
      <div class="flex items-start gap-3">
        <input data-task-toggle="${task.id}" class="task-checkbox mt-1" type="checkbox" />
        <button data-nav="#/task/${task.id}" class="flex flex-col text-left">
          <p class="text-body-md text-on-surface leading-snug">${esc(task.title)}</p>
          <div class="flex items-center gap-1 mt-2 ${dueLabel(task).cls === 'text-error' ? 'text-error' : 'text-accent-soft'}">
            ${icon('schedule', 'text-[16px]')}
            <span class="text-label-sm">${dueLabel(task).text}</span>
          </div>
        </button>
      </div>` : `<p class="text-body-md text-secondary">Nothing due — enjoy the calm or add a task.</p>`}
    </div>
  </main>
  ${bottomNav('#/home')}`;
}

export function mount(root) {
  root.querySelector('[data-action="toggle"]').addEventListener('click', () => {
    const t = getTimer();
    if (t.status === 'running') pauseTimer(); else startTimer();
    rerender();
  });
  root.querySelector('[data-action="skip"]').addEventListener('click', () => {
    skipPhase();
    rerender();
  });
  const taskCb = root.querySelector('[data-task-toggle]');
  if (taskCb) {
    taskCb.addEventListener('change', () => {
      toggleTask(taskCb.getAttribute('data-task-toggle'));
      setTimeout(rerender, 150);
    });
  }

  const ringWrap = root.querySelector('[data-ring-wrap]');
  const clock = root.querySelector('[data-clock]');
  const phaseEl = root.querySelector('[data-phase]');
  const off = onTimerChange(() => {
    const t = getTimer();
    clock.textContent = fmtClock(remainingMs(t));
    phaseEl.textContent = t.phase === 'focus' ? 'Deep Work' : 'Break';
    setRingProgress(ringWrap, phaseProgress(t));
  });
  return off;
}
