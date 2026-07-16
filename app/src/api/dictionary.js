// Word lookup — https://dictionaryapi.dev (free, no key) as the primary source,
// with Merriam-Webster (api/merriam.js) filling its gaps.
//
// The free API answers with an array of entries, each carrying its own phonetics
// and meanings. We flatten that into one record per word:
//   { word, phonetic, audio, meanings: [{ partOfSpeech, definitions: [{definition, example}], synonyms }], synonyms }
//
// That shape is a contract, not an implementation detail: store.js persists it to
// localStorage so a saved word re-reads offline. Whatever a source returns gets
// normalised into it here, and entries saved by older versions still render.
//
// Why the free API stays in front: it needs no key, it returns IPA, and it costs
// nothing per call. MW is metered (1000/key/day), so it's only consulted when the
// free answer is actually missing something — see lookupWord.
import { fetchJson, NetworkError } from './http.js';
import { mwKeys, mwLookup, mwSynonyms, MwKeyError } from './merriam.js';

const ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en';

// The API reports an unknown word as a 404, which is an answer rather than a
// failure — the caller shows it as "no definition", not as an error.
export class WordNotFoundError extends Error {}

// Some entries carry a protocol-relative audio URL.
const normalise = (url) => (url.startsWith('//') ? `https:${url}` : url);

// The spelling and the recording have to come from the *same* phonetics object.
// A word like "bass" arrives as several entries — the fish and the sound — and
// picking the IPA from one while picking the audio from another would show you
// one word's pronunciation and play you the other's.
//
// So: prefer a phonetics element that has both text and a non-empty audio, and
// only fall back to a text-only or audio-only one if no element has the pair.
// (`audio: ""` is extremely common — the first element usually has no recording.)
function pronunciation(entries) {
  const all = entries.flatMap((e) => [
    // An entry's top-level `phonetic` is a bare spelling with no audio of its own.
    ...(e.phonetic ? [{ text: e.phonetic, audio: '' }] : []),
    ...(e.phonetics || []),
  ]);

  const both = all.find((p) => p.text && p.audio);
  if (both) return { phonetic: both.text, audio: normalise(both.audio) };

  return {
    phonetic: all.find((p) => p.text)?.text || '',
    audio: normalise(all.find((p) => p.audio)?.audio || ''),
  };
}

// The free API, parsed into the shared shape. Returns null for "no entry" rather
// than throwing — at this level a miss isn't yet a failure, because MW gets a turn.
async function lookupFree(word) {
  const { res, body: entries } = await fetchJson(`${ENDPOINT}/${encodeURIComponent(word.toLowerCase())}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Dictionary lookup failed (HTTP ${res.status}).`);
  if (!Array.isArray(entries) || !entries.length) return null;

  const meanings = entries
    .flatMap((e) => e.meanings || [])
    .map((m) => ({
      partOfSpeech: m.partOfSpeech || '',
      definitions: (m.definitions || [])
        .slice(0, 3) // three senses is plenty for a reading aid
        .map((d) => ({ definition: d.definition || '', example: d.example || '' }))
        .filter((d) => d.definition),
      synonyms: [...new Set(m.synonyms || [])],
    }))
    .filter((m) => m.definitions.length);

  if (!meanings.length) return null;

  // Synonyms hang off both the meaning and its individual senses; the union of
  // the lot, de-duplicated, is what's actually useful to see.
  const synonyms = [...new Set([
    ...entries.flatMap((e) => (e.meanings || []).flatMap((m) => [
      ...(m.synonyms || []),
      ...(m.definitions || []).flatMap((d) => d.synonyms || []),
    ])),
  ])];

  return {
    word: entries[0].word || word,
    ...pronunciation(entries),
    meanings,
    synonyms,
  };
}

// Just the recording for a word, straight from Merriam-Webster.
//
// For the speaker button on a word that has no `audio` stored — every word saved
// before v1.3.0, plus any the free dictionary had no recording for. Without this
// the button falls through to the device voice, and an Android WebView ships no
// speech-synthesis voices at all, so "fall back to the device" means silence.
export async function pronunciationFor(rawWord) {
  const word = String(rawWord || '').trim();
  const { dict } = mwKeys();
  if (!word || !dict) return '';
  try {
    const mw = await mwLookup(word, dict);
    return mw?.audio || '';
  } catch {
    return ''; // no recording is not an error worth interrupting a tap for
  }
}

// The full lookup: free API first, Merriam-Webster only where it's needed.
//
// The two MW references are metered per key, so this deliberately does not call
// them on every word. A common word with IPA, audio and synonyms already attached
// makes exactly one request, to the free API, as it always did.
export async function lookupWord(rawWord) {
  const word = String(rawWord || '').trim();
  if (!word) throw new Error('Type a word to look up.');

  const keys = mwKeys();
  let base = null;
  let baseErr = null;
  try {
    base = await lookupFree(word);
  } catch (err) {
    // A free-API outage shouldn't sink the lookup if MW can still answer. Hold the
    // error in case MW can't either.
    baseErr = err;
  }

  // Nothing to fill in — the common case, and the cheap one.
  if (base && base.audio && base.synonyms.length) return base;

  const needDict = keys.dict && (!base || !base.audio || !base.phonetic || !base.meanings.length);
  const needSyn = keys.thes && (!base || !base.synonyms.length);
  if (!needDict && !needSyn) {
    if (base) return base;
    throw baseErr || new WordNotFoundError(`No dictionary entry for “${word}”.`);
  }

  // allSettled, not all: MW is a supplement. A rejected key or a dead thesaurus
  // must never turn a perfectly good definition into an error.
  const [dictRes, synRes] = await Promise.allSettled([
    needDict ? mwLookup(word, keys.dict) : Promise.resolve(null),
    needSyn ? mwSynonyms(word, keys.thes) : Promise.resolve([]),
  ]);

  const mw = dictRes.status === 'fulfilled' ? dictRes.value : null;
  const mwSyns = synRes.status === 'fulfilled' ? synRes.value : [];
  const keyRejected = [dictRes, synRes].some(
    (r) => r.status === 'rejected' && r.reason instanceof MwKeyError,
  );

  if (!base) {
    // The free API had nothing. MW's shortdef is a real definition, so this is a
    // lookup that would have failed outright before.
    if (mw?.meanings?.length) {
      return {
        word,
        phonetic: mw.phonetic,
        audio: mw.audio,
        meanings: mw.meanings,
        synonyms: mwSyns,
        ...(keyRejected ? { notice: 'Merriam-Webster rejected the key — check it in Settings.' } : {}),
      };
    }
    // Both missed. If MW offered spellings, they're more use than the miss itself.
    if (mw?.suggestions?.length) {
      throw new WordNotFoundError(`No entry for “${word}”. Did you mean: ${mw.suggestions.join(', ')}?`);
    }
    // A network error that stopped us reaching the free API is a failure, not a
    // verdict on the word — say so rather than claiming it doesn't exist.
    if (baseErr && !(baseErr instanceof NetworkError && mw)) throw baseErr;
    throw new WordNotFoundError(`No dictionary entry for “${word}”.`);
  }

  return {
    ...base,
    // MW's respelling (\ˈbas\) is not IPA, so it only stands in for an empty field
    // — never over the top of the free API's IPA.
    phonetic: base.phonetic || mw?.phonetic || '',
    audio: base.audio || mw?.audio || '',
    synonyms: base.synonyms.length ? base.synonyms : mwSyns,
    // Transient — addBookVocab destructures the fields it stores, so this is shown
    // once and never persisted.
    ...(keyRejected ? { notice: 'Merriam-Webster rejected the key — check it in Settings.' } : {}),
  };
}
