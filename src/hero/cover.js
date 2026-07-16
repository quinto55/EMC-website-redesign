import { wireVideoReady } from '../video-ready.js';

export function initHeroCover() {
  const video = document.querySelector('.hero__video');
  if (video) wireVideoReady(video);
}
