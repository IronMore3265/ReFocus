// Task detail — description, due picker, priority, subtasks, delete.
import { getTask, updateTask, toggleTask, deleteTask, uid, dueLabel } from '../store.js';
import {
  subHeader, icon, esc, confirmSheet, emptyState, inputCls,
  openDateTimeSheet, priorityPills, bindPriorityPills,
} from '../ui.js';

const dueDisplay = (t) => (t.due
  ? new Date(t.due).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  : 'No due date');

// One row of the subtask list. The move buttons come out undecorated — which of
// them is at an end is decided by refreshMoveBtns() against the DOM, so a row
// added or removed later doesn't need this markup to know where it landed.
function subRow(st) {
  const moveBtn = (dir, iconName, label) => `
    <button data-sub-move="${st.id}" data-dir="${dir}" aria-label="${label}"
      class="text-secondary p-1 shrink-0">${icon(iconName, 'text-[16px]')}</button>`;
  return `
  <div data-sub-row="${st.id}" class="flex items-start gap-2 py-2 border-b border-surface-container">
    <input data-sub-toggle="${st.id}" class="task-checkbox mt-1 shrink-0" type="checkbox" ${st.done ? 'checked' : ''} />
    <textarea data-sub-title="${st.id}" rows="1"
      class="flex-grow min-w-0 bg-transparent text-body-md text-on-surface focus:outline-none resize-none overflow-hidden py-0.5 ${st.done ? 'line-through opacity-60' : ''}">${esc(st.title)}</textarea>
    ${moveBtn(-1, 'move-up', 'Move up')}
    ${moveBtn(1, 'move-down', 'Move down')}
    <button data-sub-del="${st.id}" aria-label="Delete subtask" class="text-secondary p-1 shrink-0">${icon('close', 'text-[18px]')}</button>
  </div>`;
}

export function render(id) {
  const t = getTask(id);
  if (!t) return `${subHeader('Task')}<main class="pt-page px-margin-mobile">${emptyState('error', 'Task not found', 'It may have been deleted.')}</main>`;

  const due = dueLabel(t);

  return `
  ${subHeader('Task', `<button data-action="delete" class="p-3 text-error">${icon('delete')}</button>`)}
  <main class="pt-page pb-page-sub px-margin-mobile max-w-2xl mx-auto page-enter">

    <div class="flex items-start gap-4 mb-stack-md">
      <input data-action="toggle" class="task-checkbox mt-2" type="checkbox" ${t.done ? 'checked' : ''} />
      <div class="flex-grow">
        <input data-field="title" value="${esc(t.title)}" class="w-full bg-transparent text-headline-md text-on-surface focus:outline-none ${t.done ? 'line-through opacity-60' : ''}" />
        <span data-due-label class="text-label-sm ${due.cls}">${due.text}</span>
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
        <span data-due-display class="${t.due ? 'text-on-surface' : 'text-secondary'}">${dueDisplay(t)}</span>
        ${icon('calendar', 'text-secondary')}
      </button>
      <span class="text-label-md uppercase tracking-wider text-secondary block mb-3">Priority</span>
      ${priorityPills(t.priority)}
    </div>

    <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md">
      <span class="text-label-md uppercase tracking-wider text-secondary block mb-2">Subtasks</span>
      <div data-sub-list>
        ${t.subtasks.map(subRow).join('')}
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
  if (!getTask(id)) return;

  // Nothing on this screen re-renders it. Every edit here is a small, local
  // change — a strikethrough, a label, a row moving — and rebuilding the page for
  // one of them threw away the scroll position and the caret, which is the whole
  // reason ticking a subtask near the bottom of a long list used to jump.
  const titleInput = root.querySelector('[data-field="title"]');
  const dueLabelEl = root.querySelector('[data-due-label]');
  const dueDisplayEl = root.querySelector('[data-due-display]');
  const subList = root.querySelector('[data-sub-list]');

  const strike = (el, on) => {
    el.classList.toggle('line-through', on);
    el.classList.toggle('opacity-60', on);
  };
  const paintDue = (task) => {
    const due = dueLabel(task);
    dueLabelEl.textContent = due.text;
    dueLabelEl.className = `text-label-sm ${due.cls}`;
    dueDisplayEl.textContent = dueDisplay(task);
    dueDisplayEl.className = task.due ? 'text-on-surface' : 'text-secondary';
  };

  root.querySelector('[data-action="toggle"]').addEventListener('change', () => {
    const next = toggleTask(id);
    strike(titleInput, next.done);
    paintDue(next); // "Completed" replaces the due date once it's ticked off
  });

  root.querySelector('[data-field="title"]').addEventListener('change', (e) => {
    const v = e.target.value.trim();
    if (v) updateTask(id, { title: v });
    else e.target.value = getTask(id).title;
  });
  root.querySelector('[data-field="description"]').addEventListener('change', (e) => {
    updateTask(id, { description: e.target.value });
  });

  root.querySelector('#due-picker-trigger').addEventListener('click', () => {
    openDateTimeSheet({
      initial: getTask(id).due,
      onSave: (date) => paintDue(updateTask(id, { due: date.toISOString() })),
    });
  });

  // bindPriorityPills already moves the selection to the tapped pill.
  bindPriorityPills(root, (priority) => updateTask(id, { priority }));

  // A textarea rather than an input, so a long subtask wraps instead of running off
  // the side where you can only read it by scrolling. rows=1 plus this is the auto-grow.
  const autoGrow = (ta) => {
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  };
  const growAll = () => subList.querySelectorAll('[data-sub-title]').forEach(autoGrow);

  // Which move buttons are at an end is read off the DOM, so this stays right
  // after a row is added, removed, or swapped without re-rendering the list.
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

  const patchSubtasks = (fn) => updateTask(id, { subtasks: fn(getTask(id).subtasks) });

  root.querySelector('[data-sub-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = e.target.title.value.trim();
    if (!title) return;
    const st = { id: uid(), title, done: false };
    patchSubtasks((subtasks) => [...subtasks, st]);
    subList.insertAdjacentHTML('beforeend', subRow(st));
    autoGrow(subList.querySelector(`[data-sub-title="${st.id}"]`));
    refreshMoveBtns();
    e.target.reset();
  });

  // Delegated, so rows added after mount are wired without rebinding anything.
  subList.addEventListener('change', (e) => {
    const cb = e.target.closest('[data-sub-toggle]');
    if (cb) {
      const subId = cb.getAttribute('data-sub-toggle');
      patchSubtasks((subtasks) => subtasks.map((st) => (st.id === subId ? { ...st, done: cb.checked } : st)));
      strike(subList.querySelector(`[data-sub-title="${subId}"]`), cb.checked);
      return;
    }
    // `change` fires on blur, like the parent task title above. The field already
    // shows what you typed, so there is nothing to paint back.
    const ta = e.target.closest('[data-sub-title]');
    if (!ta) return;
    const subId = ta.getAttribute('data-sub-title');
    const title = ta.value.trim();
    if (!title) {
      ta.value = getTask(id).subtasks.find((st) => st.id === subId)?.title || '';
      autoGrow(ta);
      return;
    }
    patchSubtasks((subtasks) => subtasks.map((st) => (st.id === subId ? { ...st, title } : st)));
  });

  subList.addEventListener('input', (e) => {
    const ta = e.target.closest('[data-sub-title]');
    if (ta) autoGrow(ta);
  });
  // A subtask is one line of text — Enter should commit it, not grow a paragraph.
  subList.addEventListener('keydown', (e) => {
    const ta = e.target.closest('[data-sub-title]');
    if (ta && e.key === 'Enter') {
      e.preventDefault();
      ta.blur();
    }
  });

  subList.addEventListener('click', (e) => {
    const del = e.target.closest('[data-sub-del]');
    if (del) {
      const subId = del.getAttribute('data-sub-del');
      patchSubtasks((subtasks) => subtasks.filter((st) => st.id !== subId));
      del.closest('[data-sub-row]').remove();
      refreshMoveBtns();
      return;
    }
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
    patchSubtasks(() => [...subList.querySelectorAll('[data-sub-row]')]
      .map((r) => byId.get(r.getAttribute('data-sub-row')))
      .filter(Boolean));
    refreshMoveBtns();
  });

  growAll();
  refreshMoveBtns();

  root.querySelector('[data-action="delete"]').addEventListener('click', () => {
    confirmSheet({
      title: 'Delete task?',
      message: `"${getTask(id).title}" will be removed.`,
      onConfirm: () => { deleteTask(id); location.hash = '#/tasks'; },
    });
  });
}
