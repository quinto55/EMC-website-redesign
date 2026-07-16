import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export const INTRO_SEEN_KEY = 'emcIntroSeen';

let registered = false;

export function prefersReducedMotion(mq = window.matchMedia) {
  return mq('(prefers-reduced-motion: reduce)').matches;
}

export function hasSeenIntro(storage = window.sessionStorage) {
  try {
    return storage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    // Storage unavailable (privacy mode): behave as if seen so we never trap
    // the visitor behind an intro that can't record its own completion.
    return true;
  }
}

export function markIntroSeen(storage = window.sessionStorage) {
  try {
    storage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function initMotion() {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return { gsap, ScrollTrigger, reduced: prefersReducedMotion() };
}
