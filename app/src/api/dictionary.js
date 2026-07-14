// Word lookup — https://dictionaryapi.dev (free, no key, no rate limit worth
// worrying about). Same plain-fetch shape as api/books.js; the app already holds
// the INTERNET permission.
//
// The API answers with an array of entries, each carrying its own phonetics and
// meanings. We flatten that into one record per word:
//   { word, phonetic, audio, meanings: [{ partOfSpeech, definitions: [{definition, example}], synonyms }], synonyms }

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

export async function lookupWord(rawWord) {
  const word = String(rawWord || '').trim();
  if (!word) throw new Error('Type a word to look up.');

  let res;
  try {
    res = await fetch(`${ENDPOINT}/${encodeURIComponent(word.toLowerCase())}`);
  } catch {
    throw new Error("Couldn't reach the dictionary — check your connection.");
  }
  if (res.status === 404) throw new WordNotFoundError(`No dictionary entry for “${word}”.`);
  if (!res.ok) throw new Error(`Dictionary lookup failed (HTTP ${res.status}).`);

  const entries = await res.json();
  if (!Array.isArray(entries) || !entries.length) {
    throw new WordNotFoundError(`No dictionary entry for “${word}”.`);
  }

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

  if (!meanings.length) throw new WordNotFoundError(`No dictionary entry for “${word}”.`);

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
