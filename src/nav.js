export function applyNavScrollState(nav, scrollY, threshold) {
  if (scrollY > threshold) nav.classList.add('is-scrolled');
  else nav.classList.remove('is-scrolled');
}

export function setNavActiveLink(nav, pathname) {
  const normalize = (p) => (p === '/' ? '/index.html' : p);
  const target = normalize(pathname);
  nav.querySelectorAll('a').forEach((a) => {
    const href = new URL(a.getAttribute('href'), 'http://x').pathname;
    a.classList.toggle('is-active', normalize(href) === target);
  });
}

export function initNav() {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;
  const threshold = Math.max(80, window.innerHeight * 0.8);
  applyNavScrollState(nav, window.scrollY, threshold);
  window.addEventListener(
    'scroll',
    () => applyNavScrollState(nav, window.scrollY, threshold),
    { passive: true }
  );
  setNavActiveLink(nav, window.location.pathname);
}
