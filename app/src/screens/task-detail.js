// Task detail — description, due picker, priority, subtasks, delete.
import { getTask, updateTask, toggleTask, deleteTask, uid, dueLabel, dayKey } from '../store.js';
import { subHeader, icon, esc, confirmSheet, emptyState, inputCls, rerender, showSheet } from '../ui.js';

const PRIORITIES = ['low', 'medium', 'high'];

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
        ${icon('calendar_month', 'text-secondary')}
      </button>
      <span class="text-label-md uppercase tracking-wider text-secondary block mb-3">Priority</span>
      <div class="flex gap-2">
        ${PRIORITIES.map((p) => `
        <button data-priority="${p}" class="flex-1 py-2 rounded-full text-label-md capitalize border transition-colors ${
          t.priority === p
            ? 'bg-accent text-on-primary border-accent-soft'
            : 'border-surface-container-highest text-secondary'
        }">${p}</button>`).join('')}
      </div>
    </div>

    <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-stack-md">
      <span class="text-label-md uppercase tracking-wider text-secondary block mb-2">Subtasks</span>
      ${t.subtasks.map((st) => `
      <div class="flex items-center gap-3 py-2 border-b border-surface-container">
        <input data-sub-toggle="${st.id}" class="task-checkbox" type="checkbox" ${st.done ? 'checked' : ''} />
        <span class="text-body-md text-on-surface flex-grow ${st.done ? 'line-through opacity-60' : ''}">${esc(st.title)}</span>
        <button data-sub-del="${st.id}" class="text-secondary">${icon('close', 'text-[18px]')}</button>
      </div>`).join('')}
      <form data-sub-form class="flex items-center gap-3 pt-3">
        ${icon('add', 'text-secondary')}
        <input name="title" type="text" placeholder="Add subtask" class="flex-grow bg-transparent text-body-md text-on-surface focus:outline-none" />
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
    const curDue = getTask(id).due;
    const now = new Date();
    const d = curDue ? new Date(curDue) : now;
    
    const dates = [];
    for(let i = -30; i < 365; i++) {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      dates.push(dt);
    }
    
    const pad = (n) => String(n).padStart(2, '0');
    
    showSheet(`
      <div class="flex justify-between items-center mb-4 px-2">
        <button data-close class="text-secondary px-2 py-1 text-label-md">Cancel</button>
        <h3 class="text-headline-md font-bold text-on-surface">Set Date & Time</h3>
        <button id="picker-save" class="text-accent px-2 py-1 text-label-md font-bold">Save</button>
      </div>
      
      <div class="wheel-picker mb-4">
        <div class="wheel-column" id="wheel-date">
          <div class="wheel-pad"></div>
          ${dates.map(dt => {
            const isToday = dt.toDateString() === now.toDateString();
            const label = isToday ? 'Today' : dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const val = dt.toISOString().split('T')[0];
            return `<div class="wheel-item" data-val="${val}">${label}</div>`;
          }).join('')}
          <div class="wheel-pad"></div>
        </div>
        <div class="wheel-column" id="wheel-hour">
          <div class="wheel-pad"></div>
          ${Array.from({length: 12}).map((_, i) => `<div class="wheel-item" data-val="${i === 0 ? 12 : i}">${i === 0 ? 12 : i}</div>`).join('')}
          <div class="wheel-pad"></div>
        </div>
        <div class="wheel-column" id="wheel-min">
          <div class="wheel-pad"></div>
          ${Array.from({length: 60}).map((_, i) => `<div class="wheel-item" data-val="${i}">${pad(i)}</div>`).join('')}
          <div class="wheel-pad"></div>
        </div>
        <div class="wheel-column" id="wheel-ampm">
          <div class="wheel-pad"></div>
          <div class="wheel-item" data-val="AM">AM</div>
          <div class="wheel-item" data-val="PM">PM</div>
          <div class="wheel-pad"></div>
        </div>
      </div>
    `);

    const sheet = document.querySelector('.modal-sheet');
    const dCol = sheet.querySelector('#wheel-date');
    const hCol = sheet.querySelector('#wheel-hour');
    const mCol = sheet.querySelector('#wheel-min');
    const aCol = sheet.querySelector('#wheel-ampm');

    const setupWheel = (col, initialVal) => {
      const items = [...col.querySelectorAll('.wheel-item')];
      let activeIdx = items.findIndex(el => el.dataset.val == initialVal);
      if(activeIdx === -1) activeIdx = 0;
      
      const updateActive = () => {
        const idx = Math.round(col.scrollTop / 40);
        items.forEach((el, i) => el.classList.toggle('active', i === idx));
      };

      setTimeout(() => {
        col.scrollTop = activeIdx * 40;
        updateActive();
      }, 10);
      
      col.addEventListener('scroll', () => requestAnimationFrame(updateActive));
      col.addEventListener('click', (e) => {
        const item = e.target.closest('.wheel-item');
        if(item) {
          col.scrollTo({ top: items.indexOf(item) * 40, behavior: 'smooth' });
        }
      });
    };

    const initialDate = curDue ? d.toISOString().split('T')[0] : now.toISOString().split('T')[0];
    const h = d.getHours();
    let h12 = h % 12 || 12;
    const ampm = h >= 12 ? 'PM' : 'AM';

    setupWheel(dCol, initialDate);
    setupWheel(hCol, h12);
    setupWheel(mCol, d.getMinutes());
    setupWheel(aCol, ampm);
    
    sheet.querySelector('#picker-save').onclick = () => {
      const getVal = (col) => {
        const idx = Math.round(col.scrollTop / 40);
        const items = col.querySelectorAll('.wheel-item');
        return items[Math.min(idx, items.length - 1)].dataset.val;
      };
      
      const dateStr = getVal(dCol);
      let hour = parseInt(getVal(hCol));
      const min = getVal(mCol);
      const ap = getVal(aCol);
      
      if(ap === 'PM' && hour < 12) hour += 12;
      if(ap === 'AM' && hour === 12) hour = 0;
      
      const finalDate = new Date(`${dateStr}T${pad(hour)}:${pad(min)}:00`);
      updateTask(id, { due: finalDate.toISOString() });
      document.querySelector('.modal-backdrop').click();
      rerender();
    };
  });

  root.querySelectorAll('[data-priority]').forEach((btn) => {
    btn.addEventListener('click', () => {
      updateTask(id, { priority: btn.getAttribute('data-priority') });
      rerender();
    });
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
