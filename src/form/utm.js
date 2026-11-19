// Campaign tags (utm_*) from the visitor's first tagged page view, kept for the session
// so the lead can say which card or link brought them.
const KEY = 'emc-utm';
const TAGS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
let memory = null; // used when storage is unavailable (private mode)

const clean = (v) => String(v ?? '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 80);
const empty = () => Object.fromEntries(TAGS.map((t) => [t, '']));

/** The session's storage, or null when merely reading it throws (site data blocked). */
function getStorage() {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

function load(storage) {
  try {
    const raw = storage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return memory; // storage unavailable: use this page's copy
  }
}

export function captureUtm(search = location.search, storage = getStorage()) {
  if (load(storage)) return;
  const params = new URLSearchParams(search);
  const found = empty();
  for (const t of TAGS) found[t] = clean(params.get(t));
  if (!TAGS.some((t) => found[t])) return;
  try {
    if (!storage) throw new Error('no storage');
    storage.setItem(KEY, JSON.stringify(found));
  } catch {
    memory = found;
  }
}

export function readUtm(storage = getStorage()) {
  const saved = load(storage) || {};
  const out = empty();
  for (const t of TAGS) out[t] = clean(saved[t]);
  return out;
}
