// The home page's proof strip: "40+" counts up while the fairs line and the logos fade in, then the "+" pops in, a
// marker draws under it and "years in the industry" rises in as the punchline. The strip as served is the final
// state. This adds .is-armed (the starting state, which also starts those two fades) only in the task that starts the
// play, then .is-counted when the figures land on 40 (CSS runs the "+", the marker and the words from there). Every
// way out (the end, a hidden tab, the safety timer, destroy) removes both, back to the final state. Browser only.

const COUNT_MS = 1200;      // 0 to 40
const STEPS = 72;           // one number a frame at 60 frames a second
const TAIL_MS = 700;        // the "+", the marker and the words after the count (home.css, .is-counted)
const SAFETY_MS = 2500;     // after arming: the final state, whatever happened
const LOAD_WAIT_MS = 300;   // a strip already on screen at load starts after this
const IN_VIEW = 0.6;        // share of the strip on screen that starts the play

/**
 * The numbers shown while counting from 0 up to `to`, one per step: whole numbers, never decreasing, never above
 * `to`, the last exactly `to`. An exponential ease-out: half the count goes by in the first fifth of the time, and
 * each of the last few numbers holds a little longer than the one before, so the count settles onto `to`.
 */
export function countFrames(to, steps) {
  const n = Math.max(1, Math.floor(steps));
  const ease = (t) => (1 - 2 ** (-5 * t)) / (1 - 2 ** -5);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? to : Math.min(to, Math.round(to * ease(i / (n - 1))))));
}

/**
 * Plays the strip once per page view, when at least 60% of it is on screen (after 300 ms if it already is at load).
 * Reduced motion, no IntersectionObserver or no requestAnimationFrame: the final state at once, never armed.
 */
export function initProofCount(doc = document, { reducedMotion, now = () => performance.now() } = {}) {
  const digits = doc.querySelector('.proof [data-count-to]');
  const strip = digits && digits.closest('.proof');
  if (!strip) return { destroy() {} };
  const target = Number(digits.dataset.countTo);
  if (reducedMotion === undefined) {
    reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches === true;
  }

  let observer = null;
  let raf = null;
  let wait = null;
  let safety = null;
  let tail = null;
  let settled = false;

  const show = (n) => {
    const s = String(n);
    if (digits.textContent !== s) digits.textContent = s;
  };
  const onVisibility = () => {
    if (doc.hidden) finish();
  };
  function finish() {
    if (settled) return;
    settled = true;
    if (observer) observer.disconnect();
    if (raf !== null) cancelAnimationFrame(raf);
    for (const t of [wait, safety, tail]) clearTimeout(t);
    doc.removeEventListener('visibilitychange', onVisibility);
    show(target);
    strip.classList.remove('is-armed', 'is-counted');
    strip.classList.add('is-done');
  }

  if (reducedMotion || typeof IntersectionObserver !== 'function' || typeof requestAnimationFrame !== 'function') {
    finish();
    return { destroy: finish };
  }

  function play() {
    observer.disconnect(); // once per page view
    if (doc.hidden) return finish();
    safety = setTimeout(finish, SAFETY_MS);
    doc.addEventListener('visibilitychange', onVisibility);
    const frames = countFrames(target, STEPS);
    const last = frames.length - 1;
    strip.classList.add('is-armed');
    show(frames[0]);
    const start = now();
    const step = () => {
      raf = null;
      const i = Math.min(last, Math.floor(((now() - start) / COUNT_MS) * last));
      show(frames[i]);
      if (i < last) raf = requestAnimationFrame(step);
      else {
        strip.classList.add('is-counted');
        tail = setTimeout(finish, TAIL_MS);
      }
    };
    raf = requestAnimationFrame(step);
  }

  let first = true;
  observer = new IntersectionObserver((entries) => {
    const inView = entries[entries.length - 1].intersectionRatio >= IN_VIEW;
    clearTimeout(wait);
    if (inView) {
      if (first) wait = setTimeout(play, LOAD_WAIT_MS);
      else play();
    }
    first = false;
  }, { threshold: IN_VIEW });
  observer.observe(strip);

  return { destroy: finish };
}
