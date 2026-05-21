export function wireVideoReady(v, { readyClass = 'is-ready' } = {}) {
  const reveal = () => v.classList.add(readyClass);
  if (v.readyState >= 3) reveal();
  v.addEventListener('canplay', reveal, { once: true });
  v.addEventListener('loadeddata', reveal, { once: true });
  v.addEventListener('error', () => { v.style.display = 'none'; });
  const p = v.play();
  if (p && p.catch) p.catch(() => {});
}

export function initAutoplayVideos(selector) {
  document.querySelectorAll(selector).forEach((v) => wireVideoReady(v));
}
