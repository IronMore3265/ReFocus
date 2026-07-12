// Book search — free APIs (Google Books + Open Library) with an optional
// Goodreads fallback via an Apify actor (user supplies their own token).
// Every source is mapped to one shape:
//   { title, author, synopsis, totalPages, coverUrl, source }

const GOODREADS_ACTOR = 'thescrapelab~Apify-Goodreads-Scraper';

// Google Books key — raises the free quota for cover/synopsis lookups. Lives
// in gitignored app/.env (Vite inlines it at build time); search still works
// keyless when the var is absent, just with a lower shared quota.
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_KEY || '';

function pick(...vals) {
  return vals.find((v) => v !== undefined && v !== null && v !== '') ?? null;
}

async function searchGoogle(query) {
  const key = GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : '';
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&printType=books${key}`;
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

// Both sources in parallel, kept separate so the UI can tab between them.
// Throws only if BOTH fail (offline).
export async function searchBooksFree(query) {
  const [g, o] = await Promise.allSettled([searchGoogle(query), searchOpenLibrary(query)]);
  if (g.status === 'rejected' && o.status === 'rejected') throw g.reason;
  return {
    google: g.status === 'fulfilled' ? g.value : [],
    openLibrary: o.status === 'fulfilled' ? o.value : [],
  };
}

// Search-result covers come back as Goodreads' list thumbnails (…/110._SY75_.jpg);
// dropping the size segment yields the full-resolution image.
function fullSizeCover(url) {
  return typeof url === 'string' ? url.replace(/\._S[XY]\d+_(?=\.\w+$)/, '') : url;
}

function authorNames(it) {
  if (typeof it.author === 'string' && it.author) return it.author;
  return (it.authors || []).map((a) => a?.name).filter(Boolean).join(', ');
}

// Goodreads via Apify's synchronous run endpoint: one POST that starts the
// actor, waits for it, and returns the dataset items. Slow (~15-60 s).
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
        // The actor emits a `search_result` row AND a richer `book` row per match,
        // so the item cap has to cover both or the last few books lose their
        // synopsis. It defaults to 1 — always send it.
        maxItems: 14,
        proxyConfiguration: { useApifyProxy: true },
      }),
    });
    if (res.status === 401 || res.status === 403) throw new Error('Apify token was rejected — check it in Settings.');
    if (!res.ok) throw new Error(`Goodreads search failed (HTTP ${res.status})`);
    const items = await res.json();
    const rows = Array.isArray(items) ? items : [];

    // `search_result` rows carry the author and the ranking; `book` rows carry the
    // synopsis and a full-size cover. Same book, two rows — join them on goodreadsId.
    const details = new Map();
    rows.filter((it) => it.recordType === 'book')
      .forEach((it) => { if (it.goodreadsId) details.set(String(it.goodreadsId), it); });

    const matches = rows.filter((it) => it.recordType === 'search_result');
    // Fall back to the detail rows if the actor ever stops labelling matches.
    const ordered = matches.length ? matches : [...details.values()];

    return ordered.map((it) => {
      const d = details.get(String(it.goodreadsId)) || {};
      return {
        title: pick(it.title, d.title, d.fullTitle) || '',
        author: authorNames(it) || authorNames(d),
        synopsis: pick(d.description, it.description) || '',
        totalPages: Number(pick(it.pageCount, d.pageCount)) || 0,
        coverUrl: pick(d.bookCoverImageUrl, fullSizeCover(it.coverImageUrl)),
        source: 'Goodreads',
      };
    }).filter((b) => b.title);
  } finally {
    clearTimeout(timer);
  }
}

// A cover picked from the device. Books live in localStorage, so a raw phone
// photo (several MB once base64'd) would blow the quota — downscale to a
// thumbnail first. ~40 KB at 400px wide, which is plenty at the sizes we render.
export function coverFromFile(file, maxWidth = 400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't an image we can read."));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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
