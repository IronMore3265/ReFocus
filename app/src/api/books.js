// Book search — free APIs (Google Books + Open Library) with an optional
// Goodreads fallback via an Apify actor (user supplies their own token).
// Every source is mapped to one shape:
//   { title, author, synopsis, totalPages, coverUrl, source }

const GOODREADS_ACTOR = 'shahidirfan~Goodreads-Book-Scraper';

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
        startUrls: [{ url: `https://www.goodreads.com/search?q=${encodeURIComponent(query)}` }],
        results_wanted: 6,
        max_pages: 1,
      }),
    });
    if (res.status === 401 || res.status === 403) throw new Error('Apify token was rejected — check it in Settings.');
    if (!res.ok) throw new Error(`Goodreads search failed (HTTP ${res.status})`);
    const items = await res.json();
    // Documented schema: title, author, description, pages, image — but probe
    // aliases anyway since scraper output shapes drift between versions.
    return (Array.isArray(items) ? items : []).map((it) => ({
      title: pick(it.title, it.bookTitle, it.name) || '',
      author: typeof it.author === 'object'
        ? pick(it.author?.name) || ''
        : pick(it.author, (it.authors || []).map((a) => a?.name || a).join(', ')) || '',
      synopsis: pick(it.description, it.synopsis, it.summary) || '',
      totalPages: Number(pick(it.pages, it.numPages, it.pageCount, it.numberOfPages)) || 0,
      coverUrl: pick(it.image, it.coverImage, it.imageUrl, it.cover, it.coverUrl),
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
