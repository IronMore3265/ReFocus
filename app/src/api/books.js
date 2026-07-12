// Book search — free keyless APIs (Google Books + Open Library) with an
// optional Goodreads fallback via an Apify actor (user supplies their own token).
// Every source is mapped to one shape:
//   { title, author, synopsis, totalPages, coverUrl, source }

const GOODREADS_ACTOR = 'thescrapelab~Apify-Goodreads-Scraper';

// Google Books key — raises the free quota for cover/synopsis lookups. Baked
// into the bundle (not surfaced anywhere in the UI, unlike the user-supplied
// Apify token in Settings); it only unlocks read-only volume search.
const GOOGLE_BOOKS_KEY = 'AIzaSyA5-0m9LR17wEPToidsbXpECtA6M4lZ28Q';

// Dedupe key: lowercase alphanumerics only, but keep Bengali script so
// Bangla titles don't all collapse to the same empty key.
function dedupeKey(b) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9ঀ-৿]+/g, '');
  return `${norm(b.title)}|${norm(b.author)}`;
}

function pick(...vals) {
  return vals.find((v) => v !== undefined && v !== null && v !== '') ?? null;
}

async function searchGoogle(query) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&printType=books&key=${GOOGLE_BOOKS_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Books HTTP ${res.status}`);
  const data = await res.json();
  return (data.items || []).map((item) => {
    const v = item.volumeInfo || {};
    const thumb = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || null;
    return {
      title: v.title || '',
      author: (v.authors || []).join(', '),
      synopsis: v.description || '',
      totalPages: Number(v.pageCount) || 0,
      // Android WebView blocks cleartext http
      coverUrl: thumb ? thumb.replace(/^http:/, 'https:') : null,
      source: 'Google Books',
    };
  }).filter((b) => b.title);
}

async function searchOpenLibrary(query) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=title,author_name,number_of_pages_median,cover_i,first_sentence`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Library HTTP ${res.status}`);
  const data = await res.json();
  return (data.docs || []).map((d) => ({
    title: d.title || '',
    author: (d.author_name || []).join(', '),
    synopsis: Array.isArray(d.first_sentence) ? d.first_sentence[0] : (d.first_sentence || ''),
    totalPages: Number(d.number_of_pages_median) || 0,
    coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
    source: 'Open Library',
  })).filter((b) => b.title);
}

// Both sources in parallel; Google results first (richer synopses), Open
// Library fills in what Google missed. Throws only if BOTH fail (offline).
export async function searchBooksFree(query) {
  const [g, o] = await Promise.allSettled([searchGoogle(query), searchOpenLibrary(query)]);
  if (g.status === 'rejected' && o.status === 'rejected') throw g.reason;
  const out = g.status === 'fulfilled' ? [...g.value] : [];
  const seen = new Set(out.map(dedupeKey));
  for (const b of o.status === 'fulfilled' ? o.value : []) {
    const key = dedupeKey(b);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
}

// Goodreads via Apify's synchronous run endpoint: one POST that starts the
// actor, waits for it, and returns the dataset items. Slow (~20-60 s).
export async function searchGoodreads(query, token) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const url = `https://api.apify.com/v2/acts/${GOODREADS_ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        targets: [query],
        searchMode: 'books',
        depth: 'shallow',
        maxSearchResultsPerQuery: 6,
        maxItems: 6,
      }),
    });
    if (res.status === 401 || res.status === 403) throw new Error('Apify token was rejected — check it in Settings.');
    if (!res.ok) throw new Error(`Goodreads search failed (HTTP ${res.status})`);
    const items = await res.json();
    // Field names vary between scraper versions, so probe common aliases.
    return (Array.isArray(items) ? items : []).map((it) => ({
      title: pick(it.title, it.bookTitle, it.name) || '',
      author: typeof it.author === 'object'
        ? pick(it.author?.name) || ''
        : pick(it.author, (it.authors || []).map((a) => a?.name || a).join(', ')) || '',
      synopsis: pick(it.description, it.synopsis, it.summary) || '',
      totalPages: Number(pick(it.pages, it.numPages, it.pageCount, it.numberOfPages)) || 0,
      coverUrl: pick(it.coverImage, it.imageUrl, it.image, it.cover, it.coverUrl),
      source: 'Goodreads',
    })).filter((b) => b.title);
  } finally {
    clearTimeout(timer);
  }
}

// Covers render in the app bar/list on every screen and must survive offline
// in the APK, so store them as data URIs (same reasoning as inlineAvatar in
// profile.js). Falls back to the remote URL if the fetch is blocked/offline.
export async function inlineCover(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}
