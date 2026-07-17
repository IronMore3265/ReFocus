// Tasks tab — ported from stitch tasks/code.html
import { getTasks, addTask, toggleTask, dueLabel, dayKey, todayKey } from '../store.js';
import {
  appHeader, bottomNav, fab, icon, esc, emptyState, showSheet, field, inputCls,
  primaryBtn, openDateTimeSheet, priorityPills, bindPriorityPills,
} from '../ui.js';

// Medium is the default, so it gets no mark — one on every row would be noise.
function priorityMark(t) {
  if (t.done || t.priority === 'medium') return '';
  if (t.priority === 'high') return icon('priority-high', 'text-[14px] prio-high prio-mark');
  if (t.priority === 'low') return icon('priority-low', 'text-[14px] prio-low prio-mark');
  return '';
}

function taskRow(t) {
  const due = dueLabel(t);
  // data-nav sits on the row, not the title: the padding and the chevron were dead
  // zones before. The checkbox stays its own hit target — the delegation guard in
  // main.js is what stops it navigating the row underneath it.
  return `
  <div data-nav="#/task/${t.id}" role="button"
    class="flex items-start gap-4 py-4 -mx-2 px-2 rounded-lg border-b border-surface-container active:bg-surface-bright transition-colors">
    <input data-toggle="${t.id}" class="task-checkbox mt-0.5" type="checkbox" ${t.done ? 'checked' : ''} />
    <div class="flex flex-col flex-grow text-left min-w-0 ${t.done ? 'opacity-60' : ''}">
      <span class="text-body-md text-on-surface leading-tight ${t.done ? 'line-through' : ''}">${esc(t.title)}</span>
      <span class="text-label-sm ${due.cls} mt-1 flex items-center gap-1">
        ${priorityMark(t)}${due.text}
      </span>
    </div>
    ${icon('chevron-right', 'text-secondary-fixed-dim mt-1')}
  </div>`;
}

function section(title, iconName, tasks) {
  if (!tasks.length) return '';
  return `
  <section class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md mb-gutter">
    <div class="flex items-center gap-3 mb-2">
      ${icon(iconName, 'text-accent-soft')}
      <h2 class="text-headline-md text-on-surface">${title}</h2>
    </div>
    ${tasks.map(taskRow).join('')}
  </section>`;
}

// Ticking a task off re-sorts it into another section, so the list really does
// have to be rebuilt — but only the list. Re-rendering the page for it sent you
// back to the top of a list you were part-way down.
function taskList() {
  const all = getTasks().sort((a, b) => {
    if (a.done !== b.done) return a.done - b.done;
    if (a.due && b.due) return new Date(a.due) - new Date(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return a.createdAt - b.createdAt;
  });

  const today = todayKey();
  const isToday = (t) => t.due && dayKey(new Date(t.due)) <= today;
  const doneToday = (t) => t.done && t.completedAt && dayKey(new Date(t.completedAt)) === today;

  const todayTasks = all.filter((t) => (!t.done && isToday(t)) || doneToday(t));
  const upcoming = all.filter((t) => !t.done && !isToday(t));

  return todayTasks.length || upcoming.length
    ? `${section('Today', 'due', todayTasks)}${section('Upcoming', 'calendar', upcoming)}`
    : emptyState('tasks', 'All clear', 'Tap + to capture your first task.');
}

export function render() {
  return `
  ${appHeader()}
  <main class="pt-page pb-page px-margin-mobile max-w-2xl mx-auto stagger">
    <div class="mb-stack-md">
      <h1 class="text-headline-lg-mobile text-on-surface mb-unit">Tasks</h1>
      <p class="text-body-md text-secondary">Organize your focus for the day.</p>
    </div>
    <div data-task-list class="stagger">${taskList()}</div>
  </main>
  ${fab('add-task')}
  ${bottomNav('#/tasks')}`;
}

function dueButtonLabel(due) {
  return due
    ? due.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'No due date';
}

export function openAddTask(onDone) {
  // Default: end of today, matching the old form's 23:59 fallback.
  let due = new Date();
  due.setHours(23, 59, 0, 0);
  let priority = 'medium';

  const { el, close } = showSheet(`
    <h2 class="text-headline-md text-on-surface mb-4">Add Task</h2>
    <form data-form>
      ${field('Task', `<input name="title" type="text" required class="${inputCls}" placeholder="What needs doing?" />`)}
      ${field('Due', `
        <button type="button" data-due-trigger class="${inputCls} w-full flex justify-between items-center text-left cursor-pointer">
          <span data-due-label class="text-on-surface">${dueButtonLabel(due)}</span>
          ${icon('calendar', 'text-secondary')}
        </button>`)}
      ${field('Priority', priorityPills(priority))}
      ${primaryBtn('Add Task', 'type="submit"')}
    </form>`);

  el.querySelector('[data-due-trigger]').addEventListener('click', () => {
    openDateTimeSheet({
      initial: due,
      onSave: (date) => {
        due = date;
        el.querySelector('[data-due-label]').textContent = dueButtonLabel(due);
      },
    });
  });

  bindPriorityPills(el, (p) => { priority = p; });

  el.querySelector('[data-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = String(new FormData(e.target).get('title')).trim();
    if (!title) return;
    addTask({ title, due: due ? due.toISOString() : null, priority });
    close();
    onDone();
  });
}

export function mount(root) {
  const list = root.querySelector('[data-task-list]');
  const redraw = () => { list.innerHTML = taskList(); };

  root.querySelector('[data-action="add-task"]').addEventListener('click', () => openAddTask(redraw));
  // Delegated, so the rows redraw() replaces stay live.
  list.addEventListener('change', (e) => {
    const cb = e.target.closest('[data-toggle]');
    if (!cb) return;
    toggleTask(cb.getAttribute('data-toggle'));
    setTimeout(redraw, 150); // let the checkbox animation land first
  });
}
