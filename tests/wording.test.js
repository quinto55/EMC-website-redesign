import { describe, it, expect } from 'vitest';
import { renderAll, allText } from './helpers/pages.js';

const rendered = renderAll();
const PHONE = '800-290-2090';
const APPROVED_NUMBERS = new Set([
  '40', '8,000', '78', '5', '30', '24/7', '410', '2026', '2027',
  '01', '02', '03', '1', '2', '3', '4', '8409', '34638',
]);

/** Every text node under root whose nearest element is not inside a script or style. */
function textNodes(root) {
  const out = [];
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) out.push(child);
      else if (child.nodeType === 1 && !['SCRIPT', 'STYLE'].includes(child.tagName)) walk(child);
    }
  };
  walk(root);
  return out;
}

describe('wording', () => {
  it('no page has an em dash', () => {
    for (const { page, html } of rendered) {
      expect(html.includes('—'), page.file).toBe(false);
      expect(html.includes('&mdash;'), page.file).toBe(false);
    }
  });

  it('the only phone number is the toll-free number', () => {
    const phone = /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g;
    for (const { page, doc } of rendered) {
      for (const m of allText(doc).match(phone) ?? []) expect(m, page.file).toBe(PHONE);
      for (const a of doc.querySelectorAll('a[href^="tel:"]')) expect(a.getAttribute('href'), page.file).toBe('tel:+18002902090');
    }
  });

  it('dollar amounts appear only inside sample containers', () => {
    for (const { page, doc } of rendered) {
      for (const node of textNodes(doc.body)) {
        if (/\$\s?\d/.test(node.textContent)) {
          expect(node.parentElement.closest('[data-sample]'), `${page.file}: ${node.textContent.trim()}`).not.toBeNull();
        }
      }
    }
  });

  it('every sample container says it is sample data', () => {
    for (const { page, doc } of rendered) {
      for (const el of doc.querySelectorAll('[data-sample]')) expect(el.textContent, page.file).toMatch(/Sample/);
    }
  });

  it('no price claim', () => {
    for (const { page, doc } of rendered) {
      const t = allText(doc).replace(/No credit card fees\./g, '');
      expect(t, page.file).not.toMatch(/lowest price|best price|cheapest|no fees\b/i);
    }
  });

  it('only approved numbers appear outside samples and the legal pages', () => {
    for (const { page, doc } of rendered.filter((r) => !['privacy', 'terms'].includes(r.page.key))) {
      const body = doc.body.cloneNode(true);
      body.querySelectorAll('[data-sample]').forEach((n) => n.remove());
      const t = allText({ body }).split(PHONE).join(' ');
      for (const raw of t.match(/\d[\d,/]*/g) ?? []) {
        const token = raw.replace(/,+$/, '');
        expect(APPROVED_NUMBERS.has(token), `${page.file}: ${token}`).toBe(true);
      }
    }
  });
});
