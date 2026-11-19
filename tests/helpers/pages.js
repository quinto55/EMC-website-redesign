import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { PAGES } from '../../build/pages.js';
import { renderPage } from '../../build/render.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Every registry page, rendered from its source file and parsed. */
export function renderAll() {
  return PAGES.map((page) => {
    const source = readFileSync(join(ROOT, page.file), 'utf8');
    const html = renderPage(source, page);
    // happy-dom tries to fetch the stylesheets and scripts it parses; the tests never need them.
    const parsable = html
      .replace(/<link rel="stylesheet"[^>]*>/g, '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    const doc = new DOMParser().parseFromString(parsable, 'text/html');
    return { page, html, doc };
  });
}

/** The body's text, minus script, style and [hidden] subtrees, whitespace collapsed. */
export function visibleText(doc) {
  const body = doc.body.cloneNode(true);
  body.querySelectorAll('script, style, [hidden]').forEach((n) => n.remove());
  return body.textContent.replace(/\s+/g, ' ').trim();
}

/**
 * All the body's text a visitor can ever see, whitespace collapsed: only script and style are removed.
 * [hidden] text stays, because scripts reveal it (the form, the phone menu, the booth notes, the Walgreens lead).
 */
export function allText(doc) {
  const body = doc.body.cloneNode(true);
  body.querySelectorAll('script, style').forEach((n) => n.remove());
  return body.textContent.replace(/\s+/g, ' ').trim();
}
