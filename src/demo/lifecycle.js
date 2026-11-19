// Run something only while an element is on screen and the tab is showing. Browser only.

/**
 * Calls start() when the element is on screen and the tab is visible, stop() when either stops being true.
 * Without IntersectionObserver the element counts as on screen and only the tab's visibility matters.
 * With a `pause` (src/demo/pause.js), it also runs only while not paused: pausing calls stop(), and no scroll or
 * tab change starts it again until the pause ends. Returns a cleanup function that stops and detaches everything.
 */
export function runWhileVisible(el, { start, stop, pause = null }) {
  let onScreen = true;
  let running = false;

  const update = () => {
    const should = onScreen && !document.hidden && !(pause && pause.paused);
    if (should === running) return;
    running = should;
    if (should) start();
    else stop();
  };

  let observer = null;
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver((entries) => {
      const last = entries[entries.length - 1];
      if (last) onScreen = last.isIntersecting;
      update();
    });
    observer.observe(el);
  }
  document.addEventListener('visibilitychange', update);
  const unsubscribe = pause ? pause.subscribe(update) : null;
  update();

  return () => {
    document.removeEventListener('visibilitychange', update);
    if (unsubscribe) unsubscribe();
    if (observer) observer.disconnect();
    if (running) {
      running = false;
      stop();
    }
  };
}
