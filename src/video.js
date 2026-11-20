// The videos (platform and fair services pages) are native players that work with JavaScript off. This only adds
// two things: starting one video pauses the others, and each video's first play is reported once.
import { trackEvent } from './analytics.js';

export function initVideos(doc = document, track = trackEvent) {
  const videos = [...doc.querySelectorAll('[data-video] video')];
  const reported = new Set();
  for (const video of videos) {
    video.addEventListener('play', () => {
      for (const other of videos) if (other !== video) other.pause();
      const id = video.closest('[data-video]').getAttribute('data-video');
      if (reported.has(id)) return;
      reported.add(id);
      track('video_play', { id });
    });
  }
}
