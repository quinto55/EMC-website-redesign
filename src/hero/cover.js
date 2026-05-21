import { wireVideoReady } from '../video-ready.js';

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

export function initHeroCover() {
  const stars = document.querySelector('.hero__stars');
  if (stars && !stars.children.length) seedStars(stars);
  const video = document.querySelector('.hero__video');
  if (video) wireVideoReady(video);
}
