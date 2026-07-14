// Update check — asks GitHub for the newest published release and compares it
// against the version this build was cut from (__APP_VERSION__, injected from
// package.json by vite.config.js).
//
// Installing the downloaded APK on top of the running one only works because
// every ReFocus release is signed with the same key. See README.

const REPO = 'IronMore3265/ReFocus';
const LATEST = `https://api.github.com/repos/${REPO}/releases/latest`;

export const currentVersion = __APP_VERSION__;
export const releasesUrl = `https://github.com/${REPO}/releases/latest`;

// "v1.2.3" → [1, 2, 3]. Missing parts count as 0, so v0.4 and v0.4.0 are equal.
function parts(version) {
  return String(version).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
}

// Is `candidate` a later version than `base`?
export function isNewer(candidate, base) {
  const a = parts(candidate);
  const b = parts(base);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

// → { version, notes, apkUrl, sizeBytes, htmlUrl } for the newest release, or
// null when this build is already current.
export async function checkForUpdate() {
  let res;
  try {
    res = await fetch(LATEST, { headers: { Accept: 'application/vnd.github+json' } });
  } catch {
    throw new Error("Couldn't reach GitHub — check your connection.");
  }
  // Unauthenticated API calls are rate-limited per IP; say so rather than
  // leaving the user staring at a bare HTTP code.
  if (res.status === 403 || res.status === 429) {
    throw new Error('GitHub is rate-limiting update checks right now. Try again in a little while.');
  }
  if (!res.ok) throw new Error(`Update check failed (HTTP ${res.status}).`);

  const release = await res.json();
  const version = String(release.tag_name || '').replace(/^v/i, '');
  if (!version || !isNewer(version, currentVersion)) return null;

  const apk = (release.assets || []).find((a) => a.name?.toLowerCase().endsWith('.apk'));
  return {
    version,
    notes: release.body || '',
    apkUrl: apk?.browser_download_url || null,
    sizeBytes: apk?.size || 0,
    htmlUrl: release.html_url || releasesUrl,
  };
}
