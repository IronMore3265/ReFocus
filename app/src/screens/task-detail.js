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
      <div data-sub-list>
        ${t.subtasks.map((st, i) => `
        <div data-sub-row="${st.id}" class="flex items-start gap-2 py-2 border-b border-surface-container">
          <input data-sub-toggle="${st.id}" class="task-checkbox mt-1 shrink-0" type="checkbox" ${st.done ? 'checked' : ''} />
          <textarea data-sub-title="${st.id}" rows="1"
            class="flex-grow min-w-0 bg-transparent text-body-md text-on-surface focus:outline-none resize-none overflow-hidden py-0.5 ${st.done ? 'line-through opacity-60' : ''}">${esc(st.title)}</textarea>
          <button data-sub-move="${st.id}" data-dir="-1" aria-label="Move up"
            class="text-secondary p-1 shrink-0 ${i === 0 ? 'opacity-30 pointer-events-none' : ''}">${icon('move-up', 'text-[16px]')}</button>
          <button data-sub-move="${st.id}" data-dir="1" aria-label="Move down"
            class="text-secondary p-1 shrink-0 ${i === t.subtasks.length - 1 ? 'opacity-30 pointer-events-none' : ''}">${icon('move-down', 'text-[16px]')}</button>
          <button data-sub-del="${st.id}" aria-label="Delete subtask" class="text-secondary p-1 shrink-0">${icon('close', 'text-[18px]')}</button>
        </div>`).join('')}
      </div>
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
  // A textarea rather than an input, so a long subtask wraps instead of running off
  // the side where you can only read it by scrolling. rows=1 plus this is the auto-grow.
  const autoGrow = (ta) => {
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  };
  root.querySelectorAll('[data-sub-title]').forEach((ta) => {
    autoGrow(ta);
    ta.addEventListener('input', () => autoGrow(ta));
    // A subtask is one line of text — Enter should commit it, not grow a paragraph.
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        ta.blur();
      }
    });
    // `change` fires on blur, like the parent task title above. No rerender(): the
    // field already shows what you typed, and re-rendering would fight the caret.
    ta.addEventListener('change', () => {
      const subId = ta.getAttribute('data-sub-title');
      const cur = getTask(id);
      const title = ta.value.trim();
      if (!title) {
        ta.value = cur.subtasks.find((st) => st.id === subId)?.title || '';
        autoGrow(ta);
        return;
      }
      updateTask(id, {
        subtasks: cur.subtasks.map((st) => (st.id === subId ? { ...st, title } : st)),
      });
    });
  });

  // Reordering moves the row in place. It used to rerender(), which rebuilt the
  // whole screen and threw you back to the top of it for what is meant to be a nudge.
  const subList = root.querySelector('[data-sub-list]');
  const refreshMoveBtns = () => {
    const rows = [...subList.querySelectorAll('[data-sub-row]')];
    rows.forEach((row, i) => {
      [[row.querySelector('[data-dir="-1"]'), i === 0],
        [row.querySelector('[data-dir="1"]'), i === rows.length - 1]].forEach(([btn, atEnd]) => {
        btn.classList.toggle('opacity-30', atEnd);
        btn.classList.toggle('pointer-events-none', atEnd);
      });
    });
  };
  subList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sub-move]');
    if (!btn) return;
    const row = btn.closest('[data-sub-row]');
    const dir = Number(btn.getAttribute('data-dir'));
    const swapWith = dir < 0 ? row.previousElementSibling : row.nextElementSibling;
    if (!swapWith) return;
    if (dir < 0) subList.insertBefore(row, swapWith);
    else subList.insertBefore(swapWith, row);
    // Read the order back off the DOM rather than tracking an index — the DOM is
    // the thing that actually moved, so it's the honest source.
    const byId = new Map(getTask(id).subtasks.map((st) => [st.id, st]));
    updateTask(id, {
      subtasks: [...subList.querySelectorAll('[data-sub-row]')]
        .map((r) => byId.get(r.getAttribute('data-sub-row')))
        .filter(Boolean),
    });
    refreshMoveBtns();
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
