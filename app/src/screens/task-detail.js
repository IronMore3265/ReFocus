// Task detail — description, due picker, priority, subtasks, delete.
import { getTask, updateTask, toggleTask, deleteTask, uid, dueLabel } from '../store.js';
import {
  subHeader, icon, esc, confirmSheet, emptyState, inputCls, rerender,
  openDateTimeSheet, priorityPills, bindPriorityPills,
} from '../ui.js';

export function render(id) {
  const t = getTask(id);
  if (!t) return `${subHeader('Task')}<main class="pt-page px-margin-mobile">${emptyState('error', 'Task not found', 'It may have been deleted.')}</main>`;

  const due = dueLabel(t);
  const dueObj = t.due ? new Date(t.due) : new Date();
  const displayStr = t.due ? dueObj.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No due date';

  return `
  ${subHeader('Task', `<button data-action="delete" class="p-3 text-error">${icon('delete')}</button>`)}
  <main class="pt-page pb-page-sub px-margin-mobile max-w-2xl mx-auto page-enter">

    <div class="flex items-start gap-4 mb-stack-md">
      <input data-action="toggle" class="task-checkbox mt-2" type="checkbox" ${t.done ? 'checked' : ''} />
      <div class="flex-grow">
        <input data-field="title" value="${esc(t.title)}" class="w-full bg-transparent text-headline-md text-on-surface focus:outline-none ${t.done ? 'line-through opacity-60' : ''}" />
        <span class="text-label-sm ${due.cls}">${due.text}</span>
      </div>
    </div>

    <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md mb-gutter">
      <span class="text-label-md uppercase tracking-wider text-secondary block mb-2">Notes</span>
      <textarea data-field="description" rows="3" placeholder="Add details…"
        class="w-full bg-transparent text-body-md text-on-surface focus:outline-none resize-none">${esc(t.description)}</textarea>
    </div>

    <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md mb-gutter">
      <span class="text-label-md uppercase tracking-wider text-secondary block mb-3">Due</span>
      <button id="due-picker-trigger" class="${inputCls} w-full flex justify-between items-center text-left bg-transparent mb-4 cursor-pointer">
        <span class="${t.due ? 'text-on-surface' : 'text-secondary'}">${displayStr}</span>
        ${icon('calendar', 'text-secondary')}
      </button>
      <span class="text-label-md uppercase tracking-wider text-secondary block mb-3">Priority</span>
      ${priorityPills(t.priority)}
    </div>

    <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md">
      <span class="text-label-md uppercase tracking-wider text-secondary block mb-2">Subtasks</span>
      ${t.subtasks.map((st, i) => `
      <div class="flex items-center gap-2 py-2 border-b border-surface-container">
        <input data-sub-toggle="${st.id}" class="task-checkbox" type="checkbox" ${st.done ? 'checked' : ''} />
        <input data-sub-title="${st.id}" value="${esc(st.title)}"
          class="flex-grow min-w-0 bg-transparent text-body-md text-on-surface focus:outline-none ${st.done ? 'line-through opacity-60' : ''}" />
        <button data-sub-move="${st.id}" data-dir="-1" aria-label="Move up"
          class="text-secondary p-1 ${i === 0 ? 'opacity-30 pointer-events-none' : ''}">${icon('move-up', 'text-[16px]')}</button>
        <button data-sub-move="${st.id}" data-dir="1" aria-label="Move down"
          class="text-secondary p-1 ${i === t.subtasks.length - 1 ? 'opacity-30 pointer-events-none' : ''}">${icon('move-down', 'text-[16px]')}</button>
        <button data-sub-del="${st.id}" aria-label="Delete subtask" class="text-secondary p-1">${icon('close', 'text-[18px]')}</button>
      </div>`).join('')}
      <form data-sub-form class="flex items-center gap-3 pt-3">
        <input name="title" type="text" placeholder="Add subtask" class="flex-grow bg-transparent text-body-md text-on-surface focus:outline-none" />
        <button type="submit" aria-label="Add subtask"
          class="text-secondary active:text-accent-soft active:scale-90 transition-all">${icon('add')}</button>
      </form>
    </div>
  </main>`;
}

export function mount(root, id) {
  const t = getTask(id);
  if (!t) return;

  root.querySelector('[data-action="toggle"]').addEventListener('change', () => {
    toggleTask(id);
    rerender();
  });

  root.querySelector('[data-field="title"]').addEventListener('change', (e) => {
    const v = e.target.value.trim();
    if (v) updateTask(id, { title: v });
  });
  root.querySelector('[data-field="description"]').addEventListener('change', (e) => {
    updateTask(id, { description: e.target.value });
  });

  root.querySelector('#due-picker-trigger').addEventListener('click', () => {
    openDateTimeSheet({
      initial: getTask(id).due,
      onSave: (date) => {
        updateTask(id, { due: date.toISOString() });
        rerender();
      },
    });
  });

  bindPriorityPills(root, (priority) => {
    updateTask(id, { priority });
    rerender();
  });

  root.querySelector('[data-sub-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = e.target.title.value.trim();
    if (!title) return;
    const cur = getTask(id);
    updateTask(id, { subtasks: [...cur.subtasks, { id: uid(), title, done: false }] });
    rerender();
  });
  root.querySelectorAll('[data-sub-toggle]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const cur = getTask(id);
      updateTask(id, {
        subtasks: cur.subtasks.map((st) =>
          st.id === cb.getAttribute('data-sub-toggle') ? { ...st, done: !st.done } : st),
      });
      rerender();
    });
  });
  root.querySelectorAll('[data-sub-title]').forEach((input) => {
    // `change` fires on blur, like the parent task title above. No rerender(): the
    // input already shows what you typed, and re-rendering would fight the caret.
    input.addEventListener('change', () => {
      const subId = input.getAttribute('data-sub-title');
      const cur = getTask(id);
      const title = input.value.trim();
      if (!title) {
        input.value = cur.subtasks.find((st) => st.id === subId)?.title || '';
        return;
      }
      updateTask(id, {
        subtasks: cur.subtasks.map((st) => (st.id === subId ? { ...st, title } : st)),
      });
    });
  });
  root.querySelectorAll('[data-sub-move]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cur = getTask(id);
      const from = cur.subtasks.findIndex((st) => st.id === btn.getAttribute('data-sub-move'));
      const to = from + Number(btn.getAttribute('data-dir'));
      if (from < 0 || to < 0 || to >= cur.subtasks.length) return;
      const subtasks = [...cur.subtasks];
      [subtasks[from], subtasks[to]] = [subtasks[to], subtasks[from]];
      updateTask(id, { subtasks });
      rerender();
    });
  });
  root.querySelectorAll('[data-sub-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cur = getTask(id);
      updateTask(id, { subtasks: cur.subtasks.filter((st) => st.id !== btn.getAttribute('data-sub-del')) });
      rerender();
    });
  });

  root.querySelector('[data-action="delete"]').addEventListener('click', () => {
    confirmSheet({
      title: 'Delete task?',
      message: `"${t.title}" will be removed.`,
      onConfirm: () => { deleteTask(id); location.hash = '#/tasks'; },
    });
  });
}
