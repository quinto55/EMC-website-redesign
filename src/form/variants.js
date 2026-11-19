/** The two asks a page can end on. A page picks one with `ask` in build/pages.js.
 *  `link` is the words on a plain link that points up to the form. */
export const ASK_VARIANTS = {
  talk:   { heading: "Let's talk about your fair.", button: 'Send to Anthony', link: "Let's talk about your fair" },
  mockup: { heading: 'Get a free in-store mockup of your event.', button: 'Request my mockup', link: 'Request my mockup' },
};

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The heading's HTML, with each hyphenated word kept on one line (phones broke "in-" / "store").
 * Built only from the constants above, never from anything a visitor typed.
 */
export function askHeadingHtml(variant) {
  const v = ASK_VARIANTS[variant];
  if (!v) return '';
  return escapeHtml(v.heading).replace(/[A-Za-z]+(?:-[A-Za-z]+)+/g, '<span class="nowrap">$&</span>');
}
