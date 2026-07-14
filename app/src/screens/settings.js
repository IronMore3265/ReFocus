// Settings — appearance, timer defaults, alerts, data management.
import { getSettings, setSettings, resetAllData, restoreAll, todayKey, getApifyToken, setApifyToken } from '../store.js';
import { exportCsv, importCsv, deliverCsv } from '../csv.js';
import { refreshIdleTimer } from '../engine.js';
import { playChime } from '../notify.js';
import { nativeTimer, stopNativeTimer } from '../native/timer-service.js';
import {
  subHeader, icon, confirmSheet, showSheet, esc, inputCls, primaryBtn,
  stepperRow, bindSteppers, setStepperValue, mountPresetChips,
  themeChooser, bindThemeChooser,
} from '../ui.js';
import { checkForUpdate, releasesUrl } from '../api/updates.js';
import { nativeUpdater, downloadUpdate, installUpdate } from '../native/updater.js';

// Offers the new version, then downloads and installs it on request. On the web
// build there's no installer to hand the APK to, so it just opens the release.
function openUpdateSheet(update) {
  const { el, close } = showSheet(`
    <h2 class="text-headline-md text-on-surface mb-1">ReFocus v${esc(update.version)} is available</h2>
    <p class="text-body-sm text-secondary mb-4">You're on v${esc(__APP_VERSION__)}.</p>
    ${update.notes ? `
    <div class="bg-surface-container-low rounded-xl p-4 mb-stack-md max-h-64 overflow-y-auto">
      <p class="text-body-md text-on-surface whitespace-pre-line">${esc(update.notes)}</p>
    </div>` : ''}

    <div data-choice>
      ${primaryBtn(nativeUpdater ? 'Update now' : 'Open release page', 'data-action="update-now"')}
      <button data-close class="w-full py-3 mt-2 text-label-md text-secondary">Maybe later</button>
    </div>

    <div data-progress class="hidden">
      <div class="flex justify-between items-baseline mb-2">
        <span class="text-body-md text-on-surface">Downloading…</span>
        <span data-percent class="text-label-md text-secondary">0%</span>
      </div>
      <div class="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
        <div data-bar class="h-full bg-accent-soft rounded-full transition-[width] duration-200" style="width:0%"></div>
      </div>
      <p data-progress-note class="text-label-sm text-secondary mt-3">Keep ReFocus open until the download finishes.</p>
    </div>

    <p data-error class="hidden text-body-md text-error mt-4"></p>`);

  const choice = el.querySelector('[data-choice]');
  const progress = el.querySelector('[data-progress]');
  const percentEl = el.querySelector('[data-percent]');
  const barEl = el.querySelector('[data-bar]');
  const noteEl = el.querySelector('[data-progress-note]');
  const errorEl = el.querySelector('[data-error]');

  const fail = (message) => {
    progress.classList.add('hidden');
    choice.classList.remove('hidden');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  };

  el.querySelector('[data-action="update-now"]').addEventListener('click', async () => {
    if (!nativeUpdater || !update.apkUrl) {
      window.open(update.htmlUrl || releasesUrl, '_blank', 'noopener');
      close();
      return;
    }

    errorEl.classList.add('hidden');
    choice.classList.add('hidden');
    progress.classList.remove('hidden');

    try {
      await downloadUpdate({
        url: update.apkUrl,
        version: update.version,
        onProgress: (percent) => {
          percentEl.textContent = `${percent}%`;
          barEl.style.width = `${percent}%`;
        },
      });
      noteEl.textContent = 'Downloaded — opening the installer…';
      const { permissionRequired } = await installUpdate(update.version);
      if (permissionRequired) {
        // Android has just sent them to the "install unknown apps" screen; there
        // is nothing to install until they come back and ask again.
        noteEl.textContent = '';
        fail('Allow ReFocus to install unknown apps, then tap Update now again.');
      } else {
        close();
      }
    } catch (err) {
      fail(err.message || 'The update could not be downloaded.');
    }
  });
}

function toggleRow(label, key, on) {
  return `
  <button data-toggle="${key}" aria-pressed="${on}" class="w-full flex items-center justify-between py-4 border-b border-surface-container">
    <span class="text-body-md text-on-surface">${label}</span>
    <span data-track class="toggle-track w-12 h-7 rounded-full relative ${on ? 'bg-accent' : 'bg-surface-container-highest'}">
      <span data-knob class="toggle-knob absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm" style="left:${on ? '1.5rem' : '0.25rem'}"></span>
    </span>
  </button>`;
}

export function render() {
  const s = getSettings();
  return `
  ${subHeader('Settings')}
  <main class="pt-page pb-page-sub px-margin-mobile max-w-2xl mx-auto page-enter stagger">

    <section class="bg-surface-container-lowest border border-surface-container-high rounded-xl px-stack-md py-2 mb-gutter">
      <h2 class="text-label-md uppercase tracking-wider text-secondary pt-4 pb-3">Appearance</h2>
      <div class="pb-4">${themeChooser()}</div>
    </section>

    <section class="bg-surface-container-lowest border border-surface-container-high rounded-xl px-stack-md py-2 mb-gutter">
      <h2 class="text-label-md uppercase tracking-wider text-secondary pt-4 pb-3">Timer</h2>
      <div data-presets class="pb-3 border-b border-surface-container"></div>
      ${stepperRow('Focus length', 'focusMin', s.focusMin, { min: 1, max: 180, step: 5 })}
      ${stepperRow('Break length', 'breakMin', s.breakMin, { min: 1, max: 60 })}
      ${stepperRow('Sessions per round', 'sessionsPerRound', s.sessionsPerRound, { min: 1, max: 12, unit: '' })}
      ${stepperRow('Daily goal', 'dailyGoalMin', s.dailyGoalMin, { min: 15, max: 720, step: 15 })}
      <div class="h-2"></div>
    </section>

    <section class="bg-surface-container-lowest border border-surface-container-high rounded-xl px-stack-md py-2 mb-gutter">
      <h2 class="text-label-md uppercase tracking-wider text-secondary pt-4 pb-1">Alerts</h2>
      ${toggleRow('Sound', 'sound', s.sound)}
      ${toggleRow('Vibration', 'vibration', s.vibration)}
      <div class="py-4">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-body-md text-on-surface block">Completion sound</span>
            <span class="text-body-sm text-secondary">ReFocus chime</span>
          </div>
          <button data-action="preview" class="p-3 rounded-full border border-surface-container-highest text-accent-soft active:scale-95 transition-transform">
            ${icon('play', '', true)}
          </button>
        </div>
        <p class="text-label-sm text-secondary mt-3">${nativeTimer
          ? 'Repeats for 15 seconds when a session ends, unless you tap Done.'
          : 'The browser plays the chime once when a session ends.'}</p>
      </div>
    </section>

    <section class="bg-surface-container-lowest border border-surface-container-high rounded-xl px-stack-md py-2 mb-gutter">
      <h2 class="text-label-md uppercase tracking-wider text-secondary pt-4 pb-1">Book Search</h2>
      <p class="text-body-sm text-secondary py-3">
        Book search uses free sources (Google Books &amp; Open Library). To also search
        Goodreads for hard-to-find titles, paste a free Apify API token —
        create one at apify.com under Settings → API &amp; Integrations.
      </p>
      <input data-apify-token type="password" autocomplete="off" value="${esc(getApifyToken())}"
        class="${inputCls} mb-4" placeholder="apify_api_…" />
    </section>

    <section class="bg-surface-container-lowest border border-surface-container-high rounded-xl px-stack-md py-2">
      <h2 class="text-label-md uppercase tracking-wider text-secondary pt-4 pb-1">Data Management</h2>
      <p class="text-body-sm text-secondary py-3">
        ReFocus stores everything — sessions, books, tasks, and preferences — only on this device.
        Nothing is sent to a server. Export a CSV backup to keep your progress safe or move it to another device.
      </p>
      <button data-action="export" class="w-full flex items-center gap-3 py-4 text-on-surface border-t border-surface-container">
        ${icon('upload', 'text-secondary')}
        <span class="text-body-md">Export data (CSV)</span>
      </button>
      <button data-action="import" class="w-full flex items-center gap-3 py-4 text-on-surface border-t border-surface-container">
        ${icon('download', 'text-secondary')}
        <span class="text-body-md">Import data (CSV)</span>
      </button>
      <input data-import-file type="file" accept=".csv,text/csv,text/plain" class="hidden" />
      <button data-action="reset" class="w-full flex items-center gap-3 py-4 text-error border-t border-surface-container">
        ${icon('reset', 'text-error')}
        <span class="text-body-md font-semibold">Erase all data & start fresh</span>
      </button>
    </section>

    <section class="bg-surface-container-lowest border border-surface-container-high rounded-xl px-stack-md py-2 mt-gutter">
      <h2 class="text-label-md uppercase tracking-wider text-secondary pt-4 pb-1">About</h2>
      <button data-action="check-updates" class="w-full flex items-center gap-3 py-4 text-on-surface border-t border-surface-container">
        ${icon('app-update', 'text-secondary')}
        <span class="text-body-md flex-grow text-left">Check for updates</span>
        <span data-update-status class="text-label-sm text-secondary shrink-0">v${esc(__APP_VERSION__)}</span>
      </button>
      <button data-nav="#/changelog" class="w-full flex items-center gap-3 py-4 text-on-surface border-t border-surface-container">
        ${icon('sparkle', 'text-secondary')}
        <span class="text-body-md flex-grow text-left">What's new</span>
        ${icon('chevron-right', 'text-secondary')}
      </button>
    </section>

    <footer class="pt-stack-lg pb-2 text-center">
      <p class="text-label-md text-on-surface">ReFocus <span class="text-secondary">v${esc(__APP_VERSION__)}</span></p>
      <p class="text-body-sm text-secondary mt-1">Developed &amp; Created by <strong class="font-semibold text-on-surface">Nabil Fuad Raiyan</strong></p>
      <p class="text-label-sm text-secondary mt-1">© ${new Date().getFullYear()} Nabil Fuad Raiyan. All rights reserved.</p>
    </footer>
  </main>`;
}

export function mount(root) {
  bindThemeChooser(root);

  // --- timer steppers + preset chips ---
  const redrawChips = mountPresetChips(root.querySelector('[data-presets]'), {
    getCurrent: getSettings,
    onApply: (p) => {
      setSettings({ focusMin: p.focusMin, breakMin: p.breakMin, sessionsPerRound: p.sessionsPerRound });
      refreshIdleTimer();
      ['focusMin', 'breakMin', 'sessionsPerRound'].forEach((k) => setStepperValue(root, k, getSettings()[k]));
    },
  });
  bindSteppers(root, (key, v) => {
    setSettings({ [key]: v });
    refreshIdleTimer();
    redrawChips();
  });

  // --- toggles: animate the knob in place, no page re-render ---
  root.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-toggle');
      const on = !getSettings()[key];
      setSettings({ [key]: on });
      btn.setAttribute('aria-pressed', String(on));
      const track = btn.querySelector('[data-track]');
      track.classList.toggle('bg-accent', on);
      track.classList.toggle('bg-surface-container-highest', !on);
      btn.querySelector('[data-knob]').style.left = on ? '1.5rem' : '0.25rem';
    });
  });

  // --- completion sound: one bundled chime, previewed in-app either way ---
  root.querySelector('[data-action="preview"]').addEventListener('click', playChime);

  // --- book search: Apify token ---
  root.querySelector('[data-apify-token]').addEventListener('change', (e) => {
    setApifyToken(e.target.value.trim());
  });

  // --- data management ---
  root.querySelector('[data-action="export"]').addEventListener('click', () => {
    deliverCsv(`refocus-backup-${todayKey()}.csv`, exportCsv());
  });

  const importInput = root.querySelector('[data-import-file]');
  root.querySelector('[data-action="import"]').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', () => {
    const file = importInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      importInput.value = '';
      let data;
      try {
        data = importCsv(reader.result);
      } catch (err) {
        showSheet(`
          <h2 class="text-headline-md text-on-surface mb-2">Import failed</h2>
          <p class="text-body-md text-secondary mb-6">${esc(err.message)}</p>
          <button data-close class="w-full py-3 rounded-full border border-on-surface text-on-surface text-label-md">Close</button>`);
        return;
      }
      confirmSheet({
        title: 'Replace all data?',
        message: 'Everything currently on this device will be replaced by the contents of this backup. This cannot be undone.',
        confirmLabel: 'Import & replace',
        onConfirm: () => {
          restoreAll(data);
          localStorage.removeItem('fs.timer');
          localStorage.removeItem('fs.timerRev');
          stopNativeTimer();
          location.reload();
        },
      });
    };
    reader.readAsText(file);
  });

  // --- about: update check ---
  const checkBtn = root.querySelector('[data-action="check-updates"]');
  const updateStatus = root.querySelector('[data-update-status]');
  let checking = false;
  checkBtn.addEventListener('click', async () => {
    if (checking) return;
    checking = true;
    updateStatus.textContent = 'Checking…';
    try {
      const update = await checkForUpdate();
      updateStatus.textContent = `v${__APP_VERSION__}`;
      if (update) {
        openUpdateSheet(update);
      } else {
        showSheet(`
          <h2 class="text-headline-md text-on-surface mb-2">You're up to date</h2>
          <p class="text-body-md text-secondary mb-6">ReFocus v${esc(__APP_VERSION__)} is the latest version.</p>
          <button data-close class="w-full py-3 rounded-full border border-on-surface text-on-surface text-label-md">Close</button>`);
      }
    } catch (err) {
      updateStatus.textContent = `v${__APP_VERSION__}`;
      showSheet(`
        <h2 class="text-headline-md text-on-surface mb-2">Couldn't check for updates</h2>
        <p class="text-body-md text-secondary mb-6">${esc(err.message)}</p>
        <button data-close class="w-full py-3 rounded-full border border-on-surface text-on-surface text-label-md">Close</button>`);
    } finally {
      checking = false;
    }
  });

  root.querySelector('[data-action="reset"]').addEventListener('click', () => {
    confirmSheet({
      title: 'Erase all data?',
      message: 'Sessions, books, tasks, achievements, and preferences will be permanently removed from this device. This cannot be undone.',
      confirmLabel: 'Erase everything',
      onConfirm: () => {
        resetAllData();
        localStorage.removeItem('fs.timer');
        localStorage.removeItem('fs.timerRev');
        stopNativeTimer();
        location.hash = '#/onboarding';
        location.reload();
      },
    });
  });
}
