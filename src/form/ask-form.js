// Makes the red ask band's form work. The HTML ships with the email and phone fallback showing
// and the form hidden; this swaps the form in only when the lead can be delivered or simulated.
import { ASK_VARIANTS, askHeadingHtml } from './variants.js';
import { validateLead, buildLead } from './lead.js';
import { readUtm } from './utm.js';
import { deliveryMode, sendLead } from './delivery.js';
import { trackEvent } from '../analytics.js';
import { LEAD_EMAIL, TOLL_FREE, TOLL_FREE_TEL } from '../site-config.js';

const FIELDS = ['name', 'event', 'email'];
let formCount = 0;

/** Plain text and elements into a parent. Text always goes in as a text node, never parsed. */
function put(doc, parent, ...parts) {
  for (const part of parts) parent.appendChild(typeof part === 'string' ? doc.createTextNode(part) : part);
}

function link(doc, href, label) {
  const a = doc.createElement('a');
  a.href = href;
  a.textContent = label;
  return a;
}

export function setAskVariant(askEl, variant) {
  const v = ASK_VARIANTS[variant];
  if (!v) return;
  askEl.setAttribute('data-ask-variant', variant);
  const heading = askEl.querySelector('[data-ask-heading]');
  if (heading) heading.innerHTML = askHeadingHtml(variant); // built from ASK_VARIANTS only
  const button = askEl.querySelector('[data-ask-submit]');
  if (button) button.textContent = v.button;
}

function wire(askEl, doc, { mode, send, track }) {
  const form = askEl.querySelector('form[data-ask-form]');
  const fallback = askEl.querySelector('[data-ask-fallback]');
  const thanks = askEl.querySelector('[data-ask-thanks]');
  const status = askEl.querySelector('[data-ask-status]');
  const button = askEl.querySelector('[data-ask-submit]');
  if (!form || !thanks || !status || !button) return;

  const uid = `ask${++formCount}`;
  thanks.tabIndex = -1;
  status.tabIndex = -1;
  fallback?.setAttribute('hidden', '');
  form.noValidate = true; // our own messages replace the browser's pop-ups
  form.hidden = false;

  const clearErrors = () => {
    for (const name of FIELDS) {
      const el = form.elements[name];
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
      doc.getElementById(`${uid}-${name}-error`)?.remove();
    }
  };

  const showErrors = (errors) => {
    let first = null;
    for (const name of FIELDS) {
      if (!errors[name]) continue;
      const el = form.elements[name];
      const msg = doc.createElement('span');
      msg.id = `${uid}-${name}-error`;
      msg.className = 'ask-error';
      msg.textContent = errors[name];
      el.closest('label').appendChild(msg);
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', msg.id);
      first = first || el;
    }
    first?.focus();
  };

  const showFailure = () => {
    status.textContent = '';
    put(
      doc, status,
      'That did not send. Your details are still here. Try again, or email ',
      link(doc, `mailto:${LEAD_EMAIL}`, LEAD_EMAIL),
      ' or call toll free ',
      link(doc, `tel:${TOLL_FREE_TEL}`, TOLL_FREE),
      '.',
    );
    status.focus();
  };

  const showThanks = (name) => {
    const p = doc.createElement('p');
    if (mode === 'simulate') {
      // Off the live site nothing is sent, so nothing here may read as a promise of a reply.
      put(
        doc, p,
        'Test mode: nothing was sent. On the live site this is where the thank-you shows. Toll free, 24/7: ',
        link(doc, `tel:${TOLL_FREE_TEL}`, TOLL_FREE),
        '.',
      );
    } else {
      const first = name.trim().split(/\s+/)[0];
      put(
        doc, p,
        `Thanks, ${first}. Anthony will be in touch soon. If it cannot wait, call toll free, 24/7: `,
        link(doc, `tel:${TOLL_FREE_TEL}`, TOLL_FREE),
        '.',
      );
    }
    thanks.textContent = '';
    thanks.appendChild(p);
    form.hidden = true;
    thanks.hidden = false;
    thanks.focus();
  };

  let sending = false;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (sending) return;
    clearErrors();
    status.textContent = '';
    sending = true;
    button.disabled = true;
    let label = null; // the button's own words, put back once the send is over
    try {
      const fields = Object.fromEntries(
        ['name', 'event', 'email', 'message'].map((n) => [n, form.elements[n].value]),
      );
      const check = validateLead(fields);
      if (!check.ok) {
        showErrors(check.errors);
        return;
      }
      // On weak signal a send can take seconds: show that it is under way, so the button never looks dead.
      label = button.textContent;
      button.textContent = 'Sending...';
      button.setAttribute('aria-busy', 'true');
      if (form.elements.botcheck?.checked) { // a bot: look done, send nothing
        showThanks(fields.name);
        return;
      }
      const variant = askEl.getAttribute('data-ask-variant') || 'talk';
      const lead = buildLead(fields, { page: location.pathname, utm: readUtm(), request: variant });
      const result = await send(lead, { mode });
      if (!result || !result.ok) {
        showFailure();
        return;
      }
      try { track('lead_submitted', { request: variant }); } catch { /* the lead is sent; analytics must not turn that into a failure */ }
      showThanks(fields.name);
    } catch {
      showFailure(); // anything unexpected: keep what was typed and say so, never go silent
    } finally {
      sending = false;
      button.disabled = false;
      if (label !== null) button.textContent = label;
      button.removeAttribute('aria-busy');
    }
  });
}

/** deps (for tests): { mode, send, track } */
export function initAskForms(doc = document, deps = {}) {
  const mode = deps.mode ?? deliveryMode();
  if (mode === 'off') return;
  const send = deps.send ?? ((lead, opts) => sendLead(lead, opts));
  const track = deps.track ?? trackEvent;
  for (const askEl of doc.querySelectorAll('[data-ask]')) wire(askEl, doc, { mode, send, track });
}
