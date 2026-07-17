import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

export function prefersReducedMotion(mq = window.matchMedia) {
  return mq('(prefers-reduced-motion: reduce)').matches;
}

export function initMotion() {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return { gsap, ScrollTrigger, reduced: prefersReducedMotion() };
}
