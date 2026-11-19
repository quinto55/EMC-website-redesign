import { describe, it, expect, vi } from 'vitest';
import { deliveryMode, sendLead } from '../src/form/delivery.js';

const lead = { subject: 'Website inquiry: Demo County Fair', name: 'Pat', email: 'pat@example.org' };
const okFetch = () => vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true }) }));

describe('deliveryMode', () => {
  it('picks the mode', () => {
    expect(deliveryMode({ hostname: 'emctickets.com', search: '', key: 'k' })).toBe('live');
    expect(deliveryMode({ hostname: 'www.emctickets.com', search: '', key: '' })).toBe('off');
    expect(deliveryMode({ hostname: 'quinto55.github.io', search: '', key: 'k' })).toBe('simulate');
    expect(deliveryMode({ hostname: 'quinto55.github.io', search: '?formtest=1', key: 'k' })).toBe('test');
    expect(deliveryMode({ hostname: 'localhost', search: '?formtest=1', key: '' })).toBe('simulate');
  });
  it('the real config has no key, so the live domain is off', () => {
    expect(deliveryMode({ hostname: 'emctickets.com', search: '' })).toBe('off');
  });
});

describe('sendLead', () => {
  it('simulate never touches the network', async () => {
    const f = vi.fn();
    expect(await sendLead(lead, { mode: 'simulate', fetchImpl: f })).toEqual({ ok: true });
    expect(f).not.toHaveBeenCalled();
  });
  it('live posts JSON with the access key and returns ok on success', async () => {
    const f = okFetch();
    expect(await sendLead(lead, { mode: 'live', fetchImpl: f, accessKey: 'KEY' })).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://api.web3forms.com/submit');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body);
    expect(body.access_key).toBe('KEY');
    expect(body.subject).toBe('Website inquiry: Demo County Fair');
    expect(body.from_name).toBe('Pat');
  });
  it('the request survives the visitor leaving the page (keepalive)', async () => {
    for (const mode of ['live', 'test']) {
      const f = okFetch();
      await sendLead(lead, { mode, fetchImpl: f, accessKey: 'KEY' });
      expect(f.mock.calls[0][1].keepalive, mode).toBe(true);
    }
  });
  it('test mode prefixes the subject with [TEST]', async () => {
    const f = okFetch();
    await sendLead(lead, { mode: 'test', fetchImpl: f, accessKey: 'KEY' });
    expect(JSON.parse(f.mock.calls[0][1].body).subject).toBe('[TEST] Website inquiry: Demo County Fair');
  });
  it('a rejected response, a thrown fetch and a timeout each return ok false with the reason', async () => {
    const rejected = vi.fn(async () => ({ ok: false, status: 400, json: async () => ({ success: false }) }));
    expect(await sendLead(lead, { mode: 'live', fetchImpl: rejected, accessKey: 'K' })).toEqual({ ok: false, reason: 'rejected' });
    const unsuccessful = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: false }) }));
    expect(await sendLead(lead, { mode: 'live', fetchImpl: unsuccessful, accessKey: 'K' })).toEqual({ ok: false, reason: 'rejected' });
    const thrown = vi.fn(async () => { throw new TypeError('offline'); });
    expect(await sendLead(lead, { mode: 'live', fetchImpl: thrown, accessKey: 'K' })).toEqual({ ok: false, reason: 'network' });
    const hang = vi.fn((url, init) => new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    expect(await sendLead(lead, { mode: 'live', fetchImpl: hang, accessKey: 'K', timeoutMs: 20 })).toEqual({ ok: false, reason: 'timeout' });
  });
  it('off returns ok false without calling fetch', async () => {
    const f = vi.fn();
    expect((await sendLead(lead, { mode: 'off', fetchImpl: f })).ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
