/**
 * Pins the header to the top of the window, so the pages stay in reach while a visitor scrolls.
 *
 * It puts `pinned` on <html> and the header's height in --top-h; chrome.css then fixes the header in place and gives
 * the page the room the header had (the home page's stage keeps its first row, every other page's <main> starts that
 * far down), so nothing moves when it pins. Once the page has scrolled it adds `scrolled`, and the bar floats on a
 * card. Nothing in either state changes the header's size, so the height can be read at any time.
 *
 * It only pins a header whose menu works (`nav-ready`, from initNav): until then a phone's header may be showing
 * every link laid out, which is too tall to pin. A header with no height (not laid out) is left alone too, because
 * the page would slide up under it. Returns whether it pinned.
 */
export const SCROLLED_AFTER = 4; // px: past this, the bar floats on its card

export function initPin(doc = document, win = window) {
  const root = doc.documentElement;
  const top = doc.querySelector('header.top');
  if (!top || !root.classList.contains('nav-ready')) return false;

  const measure = () => {
    const height = top.offsetHeight;
    if (height > 0) root.style.setProperty('--top-h', `${height}px`);
    return height;
  };
  if (!(measure() > 0)) return false;
  root.classList.add('pinned');

  const mark = () => root.classList.toggle('scrolled', win.scrollY > SCROLLED_AFTER);
  mark(); // a page can open already scrolled: an #anchor address, or the back button
  win.addEventListener('scroll', mark, { passive: true });

  // The header's height changes with the window's width (and, on the home page, its height).
  if (typeof win.ResizeObserver === 'function') new win.ResizeObserver(measure).observe(top);
  else win.addEventListener('resize', measure);
  return true;
}
