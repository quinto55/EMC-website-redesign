/**
 * Pins the header's bar to the top of the window, so the pages stay in reach while a visitor scrolls.
 *
 * It puts `pinned` on <html> and the bar's height in --top-h; chrome.css then fixes the bar to the window, while the
 * header stays in the page at that height as the room the bar had. No other box changes, so nothing moves when it
 * pins. Once the page has scrolled it adds `scrolled`, and the bar floats on a card. Nothing in either state changes
 * the bar's size, so its height can be read at any time.
 *
 * It only pins once the menu works (`nav-ready`, from initNav): until then a phone's header may be showing every
 * link laid out under the bar. A bar with no height (not laid out) is left alone too, because the header would
 * collapse and the page slide up under the bar. Returns whether it pinned.
 */
export const SCROLLED_AFTER = 4; // px: past this, the bar floats on its card

export function initPin(doc = document, win = window) {
  const root = doc.documentElement;
  const bar = doc.querySelector('header.top .top-bar');
  if (!bar || !root.classList.contains('nav-ready')) return false;

  const measure = () => {
    const height = bar.offsetHeight;
    if (height > 0) root.style.setProperty('--top-h', `${height}px`);
    return height;
  };
  if (!(measure() > 0)) return false;
  root.classList.add('pinned');

  const mark = () => root.classList.toggle('scrolled', win.scrollY > SCROLLED_AFTER);
  mark(); // a page can open already scrolled: an #anchor address, or the back button
  win.addEventListener('scroll', mark, { passive: true });

  // The bar's height changes with the window's width (and, on the home page, its height).
  if (typeof win.ResizeObserver === 'function') new win.ResizeObserver(measure).observe(bar);
  else win.addEventListener('resize', measure);
  return true;
}
