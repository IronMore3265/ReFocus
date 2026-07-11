// Tasks tab — ported from stitch tasks/code.html
import { getTasks, addTask, toggleTask, dueLabel, dayKey, todayKey } from '../store.js';
import { appHeader, bottomNav, fab, icon, esc, emptyState, showSheet, field, inputCls, primaryBtn, rerender } from '../ui.js';

function taskRow(t) {
  const due = dueLabel(t);
  return `
  <div class="flex items-start gap-4 py-4 border-b border-surface-container">
    <input data-toggle="${t.id}" class="task-checkbox mt-0.5" type="checkbox" ${t.done ? 'checked' : ''} />
    <button data-nav="#/task/${t.id}" class="flex flex-col flex-grow text-left min-w-0 ${t.done ? 'opacity-60' : ''}">
      <span class="text-body-md text-on-surface leading-tight ${t.done ? 'line-through' : ''}">${esc(t.title)}</span>
      <span class="text-label-sm ${due.cls} mt-1 flex items-center gap-1">
        ${t.priority === 'high' && !t.done ? icon('priority_high', 'text-[14px] text-accent-soft') : ''}${due.text}
      </span>
    </button>
    ${icon('chevron_right', 'text-secondary-fixed-dim mt-1')}
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

export function render() {
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

  return `
  ${appHeader()}
  <main class="pt-page pb-page px-margin-mobile max-w-2xl mx-auto stagger">
    <div class="mb-stack-md">
      <h1 class="text-headline-lg-mobile text-on-surface mb-unit">Tasks</h1>
      <p class="text-body-md text-secondary">Organize your focus for the day.</p>
    </div>
    ${todayTasks.length || upcoming.length ? `
      ${section('Today', 'event', todayTasks)}
      ${section('Upcoming', 'calendar_month', upcoming)}
    ` : emptyState('checklist', 'All clear', 'Tap + to capture your first task.')}
  </main>
  ${fab('add-task')}
  ${bottomNav('#/tasks')}`;
}

export function openAddTask(onDone) {
  const now = new Date();
  const defaultDate = dayKey(now);
  const { el, close } = showSheet(`
    <h2 class="text-headline-md text-on-surface mb-4">Add Task</h2>
    <form data-form>
      ${field('Task', `<input name="title" type="text" required class="${inputCls}" placeholder="What needs doing?" />`)}
      <div class="grid grid-cols-2 gap-3">
        ${field('Due date', `<input name="date" type="date" value="${defaultDate}" class="${inputCls}" />`)}
        ${field('Time', `<input name="time" type="time" class="${inputCls}" />`)}
      </div>
      ${field('Priority', `
        <select name="priority" class="${inputCls}">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
        </select>`)}
      ${primaryBtn('Add Task', 'type="submit"')}
    </form>`);
  el.querySelector('[data-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const date = String(f.get('date'));
    const time = String(f.get('time'));
    let due = null;
    if (date) due = new Date(`${date}T${time || '23:59'}`).toISOString();
    addTask({
      title: String(f.get('title')).trim(),
      due,
      priority: String(f.get('priority')),
    });
    close();
    onDone();
  });
}

export function mount(root) {
  root.querySelector('[data-action="add-task"]').addEventListener('click', () => openAddTask(rerender));
  root.querySelectorAll('[data-toggle]').forEach((cb) => {
    cb.addEventListener('change', () => {
      toggleTask(cb.getAttribute('data-toggle'));
      setTimeout(rerender, 150); // let the checkbox animation land first
    });
  });
}
