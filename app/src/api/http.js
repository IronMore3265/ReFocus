// The one thing every JSON API call here wants and `fetch` doesn't give: a
// deadline. Without one a hung request leaves the UI on "Looking up…" forever —
// fetch has no default timeout and a stalled mobile connection never rejects.
//
// Deliberately not a client library. It returns { res, body } and leaves status
// mapping to the caller, because what a 404 or a 403 *means* is different for
// every endpoint and only the call site knows.

// Distinguishes "we never got an answer" from "the answer was bad", so callers
// can word the two differently.
export class NetworkError extends Error {}

export async function fetchJson(url, { timeoutMs = 8000, signal } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  // An abort from the caller has to reach our controller too, or their cancel
  // would be ignored once we've swapped in our own signal.
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    // A non-JSON body is normal on an error status; hand the caller the status
    // rather than throwing a parse error over the top of it.
    const body = await res.json().catch(() => null);
    return { res, body };
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new NetworkError(
        signal?.aborted ? 'Lookup cancelled.' : 'The lookup timed out — check your connection.',
      );
    }
    throw new NetworkError("Couldn't reach the dictionary — check your connection.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
