// The IAFE page's two small decisions: which card was scanned, and what the booth heading says.
import { setAskVariant } from '../form/ask-form.js';
import { ASK_VARIANTS } from '../form/variants.js';
import { showPhase } from '../show.js';

/** 'walgreens' only when the first utm_content, trimmed and lower-cased, is 'walgreens-card'. */
export function iafeVariant(search = location.search) {
  const value = new URLSearchParams(search).get('utm_content');
  return value !== null && value.trim().toLowerCase() === 'walgreens-card' ? 'walgreens' : 'standard';
}

/**
 * The Walgreens card's page: the form, both links to it and the lead switch together or not at all.
 * The lead is un-hidden last; if any step throws, what changed is put back and the page stays standard.
 */
export function applyIafeVariant(doc, variant) {
  if (variant !== 'walgreens') return;
  const leads = [...doc.querySelectorAll('[data-iafe-lead="walgreens"]')];
  const asks = [...doc.querySelectorAll('[data-ask]')];
  if (!leads.length || !asks.length) return;
  const ctas = [...doc.querySelectorAll('[data-iafe-cta]')];
  const before = {
    asks: asks.map((ask) => ask.getAttribute('data-ask-variant') || 'talk'),
    ctas: ctas.map((cta) => cta.textContent),
  };
  try {
    for (const ask of asks) setAskVariant(ask, 'mockup');
    for (const cta of ctas) cta.textContent = ASK_VARIANTS.mockup.link;
    for (const lead of leads) lead.hidden = false;
  } catch (err) {
    asks.forEach((ask, i) => { try { setAskVariant(ask, before.asks[i]); } catch { /* keep undoing */ } });
    ctas.forEach((cta, i) => { try { cta.textContent = before.ctas[i]; } catch { /* keep undoing */ } });
    for (const lead of leads) lead.hidden = true;
    console.error(err);
  }
}

/** Before and during the show the heading invites people to the booth; afterwards it looks back. */
export function applyBoothHeading(doc, now = new Date()) {
  const text = showPhase(now) === 'after' ? 'What we showed in Louisville' : 'See it live at Booth #410';
  for (const heading of doc.querySelectorAll('[data-booth-heading]')) heading.textContent = text;
}
