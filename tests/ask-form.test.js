import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES } from '../build/pages.js';
import { renderPage } from '../build/render.js';
import { ROOT } from './helpers/pages.js';
import { initAskForms, setAskVariant, initAskSwitches } from '../src/form/ask-form.js';
import { LIMITS } from '../src/form/lead.js';

const contact = PAGES.find((p) => p.key === 'contact');
const retail = PAGES.find((p) => p.key === 'retail');
const bodyOf = (page) => {
  const html = renderPage(readFileSync(join(ROOT, page.file), 'utf8'), page);
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  return m;
};
const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();

let form, fallback, thanks, status, button, band;
const q = (sel) => document.querySelector(sel);
const fill = (v = {}) => {
  const d = { name: 'Pat Smith', event: 'Demo County Fair', email: 'pat@example.org', message: 'Hello', ...v };
  for (const [k, val] of Object.entries(d)) form.elements[k].value = val;
};
const submit = () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
const flush = () => new Promise((r) => setTimeout(r, 0));

function setup(page = contact, deps = {}) {
  document.body.innerHTML = bodyOf(page);
  const d = { mode: 'simulate', send: vi.fn(async () => ({ ok: true })), track: vi.fn(), ...deps };
  initAskForms(document, d);
  band = q('[data-ask]');
  form = q('[data-ask-form]');
  fallback = q('[data-ask-fallback]');
  thanks = q('[data-ask-thanks]');
  status = q('[data-ask-status]');
  button = q('[data-ask-submit]');
  return d;
}

beforeEach(() => { document.body.innerHTML = ''; });

describe('delivery mode decides what shows', () => {
  it('mode off leaves the fallback showing and the form hidden', () => {
    setup(contact, { mode: 'off' });
    expect(fallback.hidden).toBe(false);
    expect(form.hidden).toBe(true);
  });
  it('live, test and simulate show the form and hide the fallback', () => {
    for (const mode of ['live', 'test', 'simulate']) {
      setup(contact, { mode });
      expect(form.hidden, mode).toBe(false);
      expect(fallback.hidden, mode).toBe(true);
    }
  });
});

describe('validation', () => {
  it('invalid input shows each message, marks the field aria-invalid, focuses the first bad field and sends nothing', () => {
    const d = setup();
    fill({ name: ' ', event: '', email: 'nope' });
    submit();
    expect(d.send).not.toHaveBeenCalled();
    for (const [name, msg] of [['name', 'Enter your name.'], ['event', 'Enter your fair or event.'], ['email', 'Enter an email address we can reply to.']]) {
      const el = form.elements[name];
      expect(el.getAttribute('aria-invalid')).toBe('true');
      const err = document.getElementById(el.getAttribute('aria-describedby'));
      expect(text(err)).toBe(msg);
      // Right after the label, never inside it: inside, it was read twice (in the field's name and its description).
      expect(el.closest('label').contains(err)).toBe(false);
      expect(el.closest('label').nextElementSibling).toBe(err);
    }
    expect(document.activeElement).toBe(form.elements.name);
  });
  it("each field stops at the length the lead keeps, so nothing typed is cut off unseen", () => {
    setup();
    for (const [name, max] of Object.entries(LIMITS)) expect(form.elements[name].maxLength, name).toBe(max);
  });
  it('error ids are unique across forms and clear once fixed', () => {
    setup();
    fill({ name: '' });
    submit();
    const id = form.elements.name.getAttribute('aria-describedby');
    expect(document.querySelectorAll(`#${id}`)).toHaveLength(1);
    fill();
    submit();
    expect(form.elements.name.hasAttribute('aria-invalid')).toBe(false);
    expect(document.getElementById(id)).toBeNull();
  });
});

describe('sending', () => {
  it('a good submission disables the button, sends once, then shows the thank-you naming the visitor', async () => {
    let release;
    const send = vi.fn(() => new Promise((r) => { release = r; }));
    const d = setup(contact, { send, mode: 'live' });
    fill();
    submit();
    expect(button.disabled).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    release({ ok: true });
    await flush();
    expect(thanks.hidden).toBe(false);
    expect(form.hidden).toBe(true);
    expect(text(thanks)).toBe('Thanks, Pat. Anthony will be in touch soon. If it cannot wait, call toll free, 24/7: 800-290-2090.');
    expect(document.activeElement).toBe(thanks);
    const lead = send.mock.calls[0][0];
    expect(lead.page).toBe('/');
    expect(lead.name).toBe('Pat Smith');
    expect(d.track).toHaveBeenCalledTimes(1);
  });
  it('while a send is pending the button reads "Sending...", and its own label again after a failure', async () => {
    for (const [page, label] of [[contact, 'Send to Anthony'], [retail, 'Request my mockup']]) {
      let release;
      setup(page, { send: vi.fn(() => new Promise((r) => { release = r; })), mode: 'live' });
      expect(text(button), page.key).toBe(label);
      fill();
      submit();
      expect(text(button), page.key).toBe('Sending...');
      expect(button.getAttribute('aria-busy'), page.key).toBe('true');
      expect(button.disabled, page.key).toBe(true);
      release({ ok: false, reason: 'timeout' });
      await flush();
      expect(text(button), page.key).toBe(label);
      expect(button.hasAttribute('aria-busy'), page.key).toBe(false);
      expect(button.disabled, page.key).toBe(false);
    }
  });
  it('the label comes back after a send that throws, too', async () => {
    setup(contact, { send: vi.fn(async () => { throw new Error('boom'); }) });
    fill();
    submit();
    expect(text(button)).toBe('Sending...');
    await flush();
    expect(text(button)).toBe('Send to Anthony');
    expect(button.hasAttribute('aria-busy')).toBe(false);
  });
  it('a form that fails validation never shows the sending state', () => {
    setup();
    fill({ email: 'nope' });
    submit();
    expect(text(button)).toBe('Send to Anthony');
    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(button.disabled).toBe(false);
  });
  it('a second click while sending does not send twice', async () => {
    const d = setup(contact, { send: vi.fn(() => new Promise(() => {})) });
    fill();
    submit();
    submit();
    expect(d.send).toHaveBeenCalledTimes(1);
  });
  it('a name with markup is shown as text', async () => {
    setup(contact, { mode: 'live' }); // live mode's thank-you names the visitor; the send is a stub
    fill({ name: '<img src=x onerror=1>' });
    submit();
    await flush();
    expect(thanks.querySelector('img')).toBeNull();
    expect(text(thanks)).toContain('<img');
  });
  it('a failed send keeps what was typed and shows the failure message', async () => {
    const d = setup(contact, { send: vi.fn(async () => ({ ok: false, reason: 'network' })) });
    fill();
    submit();
    await flush();
    expect(text(status)).toBe('That did not send. Your details are still here. Try again, or email anthony@emctickets.com or call toll free 800-290-2090.');
    expect(status.querySelector('a[href="mailto:anthony@emctickets.com"]')).not.toBeNull();
    expect(status.querySelector('a[href="tel:+18002902090"]')).not.toBeNull();
    expect(form.elements.name.value).toBe('Pat Smith');
    expect(form.elements.message.value).toBe('Hello');
    expect(button.disabled).toBe(false);
    expect(form.hidden).toBe(false);
    expect(document.activeElement).toBe(status);
    expect(d.track).not.toHaveBeenCalled();
    // the next success clears the message
    d.send.mockResolvedValueOnce({ ok: true });
    submit();
    await flush();
    expect(status.textContent).toBe('');
  });
  it('a send that throws is a failure, not a lost lead', async () => {
    setup(contact, { send: vi.fn(async () => { throw new Error('boom'); }) });
    fill();
    submit();
    await flush();
    expect(text(status)).toContain('That did not send.');
    expect(button.disabled).toBe(false);
  });
  it('a step that throws before sending ends in the failure message, with the text kept', async () => {
    const real = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    const d = setup(contact, { mode: 'live' });
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
    try {
      fill();
      submit();
      await flush();
      // blocked storage alone must not lose the lead
      expect(d.send).toHaveBeenCalledTimes(1);
      expect(text(thanks)).toContain('Thanks, Pat');
    } finally {
      if (real) Object.defineProperty(globalThis, 'sessionStorage', real);
      else delete globalThis.sessionStorage;
    }
    // and a throwing tracker does not turn a sent lead into a failure
    setup(contact, { mode: 'live', track: vi.fn(() => { throw new Error('x'); }) });
    fill();
    submit();
    await flush();
    expect(text(thanks)).toContain('Thanks, Pat');
    // an unexpected throw while sending says so and keeps the form usable
    setup(contact, { send: vi.fn(() => { throw new Error('sync boom'); }) });
    fill();
    submit();
    await flush();
    expect(text(status)).toContain('That did not send.');
    expect(form.elements.name.value).toBe('Pat Smith');
    expect(button.disabled).toBe(false);
  });
  it('a filled trap field shows the thank-you without sending', async () => {
    const d = setup();
    fill();
    form.elements.botcheck.checked = true;
    submit();
    await flush();
    expect(d.send).not.toHaveBeenCalled();
    expect(d.track).not.toHaveBeenCalled();
    expect(thanks.hidden).toBe(false);
  });
  it('simulate mode leads with the test notice and promises nothing', async () => {
    setup(contact, { mode: 'simulate' });
    fill();
    submit();
    await flush();
    expect(thanks.hidden).toBe(false);
    expect(text(thanks)).toBe('Test mode: nothing was sent. On the live site this is where the thank-you shows. Toll free, 24/7: 800-290-2090.');
    expect(text(thanks)).not.toContain('Anthony');
    expect(thanks.querySelector('a[href="tel:+18002902090"]')).not.toBeNull();
    expect(document.activeElement).toBe(thanks);
  });
  it('live and test modes show the thank-you naming the visitor, with no test notice', async () => {
    for (const mode of ['live', 'test']) {
      setup(contact, { mode });
      fill();
      submit();
      await flush();
      expect(text(thanks), mode).toBe('Thanks, Pat. Anthony will be in touch soon. If it cannot wait, call toll free, 24/7: 800-290-2090.');
      expect(text(thanks), mode).not.toContain('Test mode');
    }
  });
  it('fires lead_submitted once on success', async () => {
    const d = setup();
    fill();
    submit();
    await flush();
    expect(d.track).toHaveBeenCalledTimes(1);
    expect(d.track).toHaveBeenCalledWith('lead_submitted', { request: 'talk' });
  });
  it('the mockup page sends the mockup request type', async () => {
    const d = setup(retail);
    fill();
    submit();
    await flush();
    expect(d.send.mock.calls[0][0].request).toBe('In-store mockup');
    expect(d.track).toHaveBeenCalledWith('lead_submitted', { request: 'mockup' });
  });
});

describe('setAskVariant', () => {
  it('swaps the heading, the button and the request type', async () => {
    const d = setup();
    setAskVariant(band, 'mockup');
    expect(band.getAttribute('data-ask-variant')).toBe('mockup');
    expect(text(q('[data-ask-heading]'))).toBe('Get a free in-store mockup of your event.');
    expect(q('[data-ask-heading] .nowrap').textContent).toBe('in-store');
    expect(text(button)).toBe('Request my mockup');
    fill();
    submit();
    await flush();
    expect(d.send.mock.calls[0][0].request).toBe('In-store mockup');
    setAskVariant(band, 'talk');
    expect(text(q('[data-ask-heading]'))).toBe("Let's talk about your fair.");
  });
  it('a switch link turns the form into its request; a plain link to the form afterwards puts it back', () => {
    setup();
    document.body.insertAdjacentHTML('afterbegin', '<a id="offer" href="#talk" data-ask-switch="mockup"><b>Offer</b></a><a id="plain" href="#talk">Talk</a>');
    initAskSwitches(document);
    const go = (id) => document.getElementById(id).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    go('plain'); // before any switch, a plain link changes nothing
    expect(band.getAttribute('data-ask-variant')).toBe('talk');
    document.querySelector('#offer b').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(band.getAttribute('data-ask-variant')).toBe('mockup');
    expect(text(button)).toBe('Request my mockup');
    go('plain');
    expect(band.getAttribute('data-ask-variant')).toBe('talk');
    expect(text(button)).toBe('Send to Anthony');
  });
  it('ignores an unknown variant', () => {
    setup();
    setAskVariant(band, 'nope');
    expect(band.getAttribute('data-ask-variant')).toBe('talk');
  });
});
