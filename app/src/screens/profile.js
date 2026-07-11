// Profile — name + lifetime totals.
import { getProfile, setProfile, lifetimeStats } from '../store.js';
import { subHeader, icon, esc, inputCls } from '../ui.js';

export function render() {
  const p = getProfile();
  const s = lifetimeStats();
  const initial = (p.name || 'F')[0].toUpperCase();
  const avatarHtml = p.picture
    ? `<img src="${p.picture}" class="w-full h-full rounded-full object-cover" />`
    : `<span class="text-headline-lg text-on-primary font-bold">${esc(initial)}</span>`;

  const stat = (value, label) => `
    <div class="bg-surface-container-lowest border border-surface-container-high rounded-xl p-4 text-center">
      <div class="text-headline-md text-on-surface">${value}</div>
      <div class="text-label-sm text-secondary uppercase mt-1">${label}</div>
    </div>`;

  return `
  ${subHeader('Profile')}
  <main class="pt-page pb-page-sub px-margin-mobile max-w-2xl mx-auto page-enter">

    <div class="flex flex-col items-center mb-stack-lg">
      <button data-action="change-pic" class="w-24 h-24 rounded-full bg-accent flex items-center justify-center mb-4 relative overflow-hidden group">
        ${avatarHtml}
        <div class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          ${icon('edit', 'text-white')}
        </div>
      </button>
      <input data-name value="${esc(p.name)}" placeholder="Your name"
        class="${inputCls} !bg-transparent !border-transparent text-center !text-2xl font-semibold focus:!border-surface-container-highest max-w-xs" />
      <span class="text-label-sm text-secondary mt-1 flex items-center gap-1">${icon('edit', 'text-[12px]')} tap name to edit</span>
    </div>

    <h2 class="text-label-md uppercase tracking-wider text-secondary mb-3 px-1">Lifetime</h2>
    <div class="grid grid-cols-2 gap-4 mb-gutter">
      ${stat(`${Math.floor(s.focusMinutes / 60)}h ${s.focusMinutes % 60}m`, 'Focus time')}
      ${stat(s.sessions, 'Sessions')}
      ${stat(s.tasksDone, 'Tasks done')}
      ${stat(s.booksFinished, 'Books finished')}
    </div>
    <div class="grid grid-cols-1 gap-4">
      ${stat(s.pagesRead, 'Pages read')}
    </div>
  </main>`;
}

export function mount(root) {
  root.querySelector('[data-name]').addEventListener('change', (e) => {
    setProfile({ name: e.target.value.trim() });
  });

  root.querySelector('[data-action="change-pic"]').addEventListener('click', () => {
    const seeds = ['Felix', 'Aneka', 'Jocelyn', 'Robert', 'Jack', 'Oliver', 'Bella', 'Luna', 'Cleo', 'Leo', 'Kitty', 'Simba', 'Loki', 'Nala', 'Oreo', 'Coco', 'Angel', 'Misty', 'Smokey', 'Mia', 'Peanut', 'Lucky', 'Sam', 'Milo'];
    const grid = seeds.map(s => `
      <button data-avatar="https://api.dicebear.com/7.x/notionists/svg?seed=${s}&backgroundColor=transparent" class="w-16 h-16 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors p-2 active:scale-95">
        <img src="https://api.dicebear.com/7.x/notionists/svg?seed=${s}&backgroundColor=transparent" class="w-full h-full" />
      </button>
    `).join('');
    
    import('../ui.js').then(({ showSheet, rerender }) => {
      showSheet(`
        <h2 class="text-headline-md text-on-surface mb-4 px-2">Choose Avatar</h2>
        <div class="grid grid-cols-4 gap-4 pb-8 px-2" data-avatar-grid>
          ${grid}
        </div>
      `);

      setTimeout(() => {
        const gridEl = document.querySelector('[data-avatar-grid]');
        if(gridEl) {
          gridEl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-avatar]');
            if (btn) {
              setProfile({ picture: btn.getAttribute('data-avatar') });
              document.querySelector('.modal-backdrop')?.click(); // close sheet
              setTimeout(rerender, 100);
            }
          });
        }
      }, 100);
    });
  });
}
