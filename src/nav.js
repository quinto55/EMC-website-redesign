/**
 * The phone menu: [data-menu-toggle] shows and hides the panel its aria-controls names.
 * Escape closes it and puts focus back on the toggle; following a link or tapping
 * anywhere outside closes it too. Pages without a toggle are left alone. Once the toggle works it puts `nav-ready`
 * on <html>: until then (and if this script never loads) the phone header shows the page links laid out, and the
 * button, which would do nothing, stays out of sight (chrome.css).
 */
export function initNav(doc = document) {
  const toggle = doc.querySelector('[data-menu-toggle]');
  const menu = toggle && doc.getElementById(toggle.getAttribute('aria-controls'));
  if (!toggle || !menu) return;

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  };

  toggle.addEventListener('click', () => setOpen(!isOpen()));
  menu.addEventListener('click', (ev) => {
    if (ev.target.closest('a')) setOpen(false);
  });
  doc.addEventListener('click', (ev) => {
    if (isOpen() && !menu.contains(ev.target) && !toggle.contains(ev.target)) setOpen(false);
  });
  doc.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !isOpen()) return;
    setOpen(false);
    toggle.focus();
  });  doc.documentElement.classList.add('nav-ready');
}
