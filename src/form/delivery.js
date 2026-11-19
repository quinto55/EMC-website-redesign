// All delivery sits here, so the form service can be swapped without touching the pages.
import { PROD_HOSTNAMES, FORM_ENDPOINT, FORM_ACCESS_KEY } from '../site-config.js';

/**
 * live     real email (live domain, key present)
 * test     real email, subject marked [TEST] (off the live domain with ?formtest=1 and a key)
 * simulate nothing is sent (off the live domain, no test switch or no key)
 * off      no delivery: the page keeps the email and phone fallback
 */
export function deliveryMode({ hostname = location.hostname, search = location.search, key = FORM_ACCESS_KEY } = {}) {
  if (PROD_HOSTNAMES.includes(hostname)) return key ? 'live' : 'off';
  const testSwitch = new URLSearchParams(search).get('formtest') === '1';
  return testSwitch && key ? 'test' : 'simulate';
}

export async function sendLead(lead, { mode, fetchImpl = globalThis.fetch, timeoutMs = 15000, accessKey = FORM_ACCESS_KEY } = {}) {
  if (mode === 'simulate') return { ok: true };
  if (mode !== 'live' && mode !== 'test') return { ok: false, reason: 'rejected' };
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const subject = mode === 'test' ? `[TEST] ${lead.subject}` : lead.subject;
    const res = await fetchImpl(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...lead, subject, from_name: lead.name, access_key: accessKey }),
      signal: controller.signal,
      keepalive: true, // a send in flight survives the visitor leaving the page (the lead is far under the 64 KB keepalive cap)
    });
    let body = null;
    try { body = await res.json(); } catch { /* judged on the status alone */ }
    if (!res.ok || (body && body.success === false)) return { ok: false, reason: 'rejected' };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: timedOut || err?.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}
