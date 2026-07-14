// CSV backup — one sectioned file: a version line, then one section per
// collection (`[books]`, `[tasks]`, …), each with its own header row.
// Cells are RFC-4180 escaped; nested fields (notes, subtasks) are JSON strings.
import {
  getBooks, getTasks, getSessions, getReadingLog, getPresets, getSettings, getProfile,
} from './store.js';

const VERSION = 'refocus-export-v1';

// Column types drive import coercion (CSV cells are all strings):
// s = string, sn = nullable string ('' → null), n = number ('' → null),
// b = boolean, j = JSON ('' → []).
const col = (name, type = 's') => ({ name, type });

const SECTIONS = {
  books: {
    columns: [col('id'), col('title'), col('author'), col('totalPages', 'n'), col('currentPage', 'n'),
      col('cover', 'sn'), col('synopsis'), col('finished', 'b'), col('finishedAt', 'n'),
      col('createdAt', 'n'), col('updatedAt', 'n'), col('notes', 'j'), col('vocab', 'j')],
    get: getBooks,
  },
  tasks: {
    columns: [col('id'), col('title'), col('description'), col('due', 'sn'), col('priority'),
      col('done', 'b'), col('completedAt', 'n'), col('createdAt', 'n'), col('subtasks', 'j')],
    get: getTasks,
  },
  sessions: {
    columns: [col('id'), col('day'), col('startedAt', 'n'), col('endedAt', 'n'), col('minutes', 'n'), col('note')],
    get: getSessions,
  },
  readingLog: {
    columns: [col('id'), col('bookId'), col('day'), col('from', 'n'), col('to', 'n'), col('at', 'n')],
    get: getReadingLog,
  },
  presets: {
    columns: [col('id'), col('name'), col('focusMin', 'n'), col('breakMin', 'n'),
      col('sessionsPerRound', 'n'), col('custom', 'b')],
    get: () => getPresets().filter((p) => p.custom),
  },
  settings: {
    columns: [col('focusMin', 'n'), col('breakMin', 'n'), col('sessionsPerRound', 'n'),
      col('sound', 'b'), col('vibration', 'b'), col('dailyGoalMin', 'n'), col('theme')],
    get: () => [getSettings()],
  },
  profile: {
    columns: [col('name'), col('picture'), col('onboarded', 'b')],
    get: () => [getProfile()],
  },
};

const coerce = {
  s: (v) => v,
  sn: (v) => (v === '' ? null : v),
  n: (v) => (v === '' ? null : Number(v)),
  b: (v) => v === 'true',
  j: (v) => (v === '' ? [] : JSON.parse(v)),
};

function cell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Minimal RFC-4180 parser — handles quoted cells with commas, quotes, and newlines.
function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += c;
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',') {
      row.push(cur); cur = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      rows.push(row); row = [];
    } else {
      cur += c;
    }
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

export function exportCsv() {
  const lines = [[VERSION, new Date().toISOString()].map(cell).join(',')];
  for (const [name, sec] of Object.entries(SECTIONS)) {
    lines.push(`[${name}]`);
    lines.push(sec.columns.map((c) => cell(c.name)).join(','));
    for (const item of sec.get()) {
      lines.push(sec.columns.map((c) => {
        const v = item[c.name];
        return cell(c.type === 'j' ? JSON.stringify(v ?? []) : v);
      }).join(','));
    }
  }
  return lines.join('\r\n');
}

// Parses a backup into { books, tasks, … } arrays ready for store.restoreAll().
// Throws with a readable message on anything that isn't a ReFocus export.
export function importCsv(text) {
  const rows = parseCsv(String(text));
  if (!rows.length || rows[0][0] !== VERSION) {
    throw new Error('This file is not a ReFocus backup (missing the export header).');
  }
  const data = {};
  let section = null;
  let header = null;
  for (const row of rows.slice(1)) {
    if (row.length === 1 && row[0].trim() === '') continue;
    const marker = row.length === 1 && row[0].match(/^\[(\w+)\]$/);
    if (marker) {
      section = SECTIONS[marker[1]] ? marker[1] : null;
      header = null;
      continue;
    }
    if (!section) continue;
    if (!header) { header = row; continue; }
    const item = {};
    header.forEach((name, i) => {
      const spec = SECTIONS[section].columns.find((c) => c.name === name);
      if (!spec) return; // unknown column from a newer export — skip
      try {
        item[name] = coerce[spec.type](row[i] ?? '');
      } catch {
        throw new Error(`Backup file is corrupted (bad "${name}" value in [${section}]).`);
      }
    });
    (data[section] = data[section] || []).push(item);
  }
  if (!Object.keys(data).length) {
    throw new Error('Backup file contains no data sections.');
  }
  return data;
}

// Hands the CSV to the user: native share sheet in the APK, plain download on web.
export async function deliverCsv(filename, text) {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const res = await Filesystem.writeFile({
        path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8,
      });
      await Share.share({ title: filename, url: res.uri }).catch(() => { /* user closed the share sheet */ });
      return;
    }
  } catch { /* plugins unavailable — fall through to the web download */ }
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
