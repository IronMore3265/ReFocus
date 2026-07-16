// Merriam-Webster — the Collegiate Dictionary and Collegiate Thesaurus.
//
// This is not the app's primary dictionary; api/dictionary.js is, and it stays
// that way because it's free, keyless and returns IPA. MW fills the three holes
// that one leaves:
//   - audio: dictionaryapi.dev has no recording for a great many words
//   - synonyms: it often returns none at all
//   - the word itself: it 404s on words MW knows perfectly well
//
// Two references, two endpoints, two separate keys — a thesaurus key is rejected
// by the dictionary endpoint and vice versa. Both are free and capped at 1000
// calls/key/day, which is why lookupWord only reaches for them when the free API
// has actually come up short.
import { fetchJson } from './http.js';
import { getMwDictKey, getMwThesKey } from '../store.js';

const DICT = 'https://www.dictionaryapi.com/api/v3/references/collegiate/json';
const THES = 'https://www.dictionaryapi.com/api/v3/references/thesaurus/json';

// Shipped defaults. A VITE_ var is inlined into the bundle, so this is not a
// secret — it keeps the key out of git, nothing more. Settings lets anyone put
// their own key in when this one's daily quota runs dry.
const DEFAULT_DICT_KEY = import.meta.env.VITE_MW_DICT_KEY || '';
const DEFAULT_THES_KEY = import.meta.env.VITE_MW_THES_KEY || '';

export function mwKeys() {
  return {
    dict: getMwDictKey() || DEFAULT_DICT_KEY,
    thes: getMwThesKey() || DEFAULT_THES_KEY,
  };
}

// A rejected key is worth saying out loud — it's the one MW failure the user can
// actually do something about.
export class MwKeyError extends Error {}

// MW's audio files aren't URLs in the response, only bare filenames; the
// subdirectory has to be derived. The bix/gg/number cases are MW's own rules, not
// a guess — https://dictionaryapi.com/products/json#sec-2.prs
function audioUrl(file) {
  if (!file) return '';
  let subdir;
  if (file.startsWith('bix')) subdir = 'bix';
  else if (file.startsWith('gg')) subdir = 'gg';
  else if (/^[^a-zA-Z]/.test(file)) subdir = 'number';
  else subdir = file[0];
  return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${file}.mp3`;
}

// A miss doesn't 404 — it answers 200 with an array of spelling suggestions as
// bare strings. So "is this an array of objects" is the real hit test.
const isEntries = (body) => Array.isArray(body) && body.length > 0 && typeof body[0] === 'object';
const isSuggestions = (body) => Array.isArray(body) && body.every((x) => typeof x === 'string');

// MW returns every homograph: "bass" the fish and "bass" the sound, each with its
// own recording. meta.id is "bass:1" / "bass:2", so match on the headword and only
// fall back to the first entry when nothing matches exactly — same reasoning as
// the pronunciation picker in dictionary.js.
function matching(entries, word) {
  const w = word.toLowerCase();
  const exact = entries.filter((e) => String(e.meta?.id || '').split(':')[0].toLowerCase() === w);
  return exact.length ? exact : entries;
}

async function mwFetch(url) {
  const { res, body } = await fetchJson(url);
  // MW answers 403 for a bad key, but also sometimes 200 with a non-array body
  // (an HTML error page). Both mean the same thing to the caller.
  if (res.status === 401 || res.status === 403) {
    throw new MwKeyError('Merriam-Webster rejected the key — check it in Settings.');
  }
  if (!res.ok) throw new Error(`Merriam-Webster lookup failed (HTTP ${res.status}).`);
  if (!Array.isArray(body)) {
    throw new MwKeyError('Merriam-Webster rejected the key — check it in Settings.');
  }
  return body;
}

// The dictionary reference. Returns what MW knows that we might want:
// { audio, phonetic, meanings, suggestions } — every field independently optional.
export async function mwLookup(word, key) {
  if (!key) return null;
  const body = await mwFetch(`${DICT}/${encodeURIComponent(word.toLowerCase())}?key=${encodeURIComponent(key)}`);

  if (isSuggestions(body)) return { suggestions: body.slice(0, 5), audio: '', phonetic: '', meanings: [] };
  if (!isEntries(body)) return null;

  const entries = matching(body, word);
  const withPrs = entries.find((e) => e.hwi?.prs?.length);
  const prs = withPrs?.hwi?.prs?.[0] || null;

  // MW gives its own respelling (\ˈbas\), not IPA. Only ever used when the free
  // API had no IPA to give — a different notation beats an empty field.
  const meanings = entries
    .filter((e) => Array.isArray(e.shortdef) && e.shortdef.length)
    .map((e) => ({
      partOfSpeech: e.fl || '',
      definitions: e.shortdef.slice(0, 3).map((d) => ({ definition: d, example: '' })),
      synonyms: [],
    }));

  return {
    audio: audioUrl(prs?.sound?.audio || ''),
    phonetic: prs?.mw ? `\\${prs.mw}\\` : '',
    meanings,
    suggestions: [],
  };
}

// The thesaurus reference. Synonyms only — MW nests them as groups of groups.
export async function mwSynonyms(word, key) {
  if (!key) return [];
  const body = await mwFetch(`${THES}/${encodeURIComponent(word.toLowerCase())}?key=${encodeURIComponent(key)}`);
  if (!isEntries(body)) return [];
  const syns = matching(body, word).flatMap((e) => (e.meta?.syns || []).flat());
  return [...new Set(syns)].slice(0, 12);
}
