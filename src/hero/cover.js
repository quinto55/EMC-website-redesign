const STAR_COUNT = 140;

function seedStars(wrap) {
  for (let i = 0; i < STAR_COUNT; i++) {
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 65 + '%';
    s.style.animationDelay = (Math.random() * 4) + 's';
    s.style.opacity = String(0.3 + Math.random() * 0.6);
    s.style.transform = `scale(${0.5 + Math.random() * 1.5})`;
    wrap.appendChild(s);
  }
}

function wireVideo(v) {
  const reveal = () => v.classList.add('is-ready');
  if (v.readyState >= 3) reveal();
  v.addEventListener('canplay', reveal, { once: true });
  v.addEventListener('loadeddata', reveal, { once: true });
  v.addEventListener('error', () => { v.style.display = 'none'; });
  const p = v.play();
  if (p && p.catch) p.catch(() => {});
}

export function initHeroCover() {
  const stars = document.querySelector('.hero__stars');
  if (stars && !stars.children.length) seedStars(stars);
  const video = document.querySelector('.hero__video');
  if (video) wireVideo(video);
}
