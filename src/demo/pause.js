// The pause control of a ticking sample board (WCAG 2.2.2: moving, updating content that starts on its own can be
// paused). One pause state can serve several boards (the home page's two share a day), and each board has its own
// button. The button is in the markup the build generates but `hidden`; the board's view shows it when it mounts, so
// with JavaScript off there is no dead control.

/** The button's HTML. `cls` is the board's own class for it; `what` names what it pauses, for a screen reader. */
export function pauseButtonHTML(cls, what) {
  return `<button type="button" class="${cls}" data-pause hidden><span data-pause-label>Pause</span><span class="visually-hidden"> ${what}</span></button>`;
}

export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches === true;

/** One pause state: `paused`, set(), toggle(), and subscribe(fn) (fn(paused) on every change; returns an unsubscribe). */
export function createPause(paused = false) {
  const listeners = new Set();
  const set = (value) => {
    value = Boolean(value);
    if (value === paused) return;
    paused = value;
    for (const fn of [...listeners]) fn(paused);
  };
  return {
    get paused() { return paused; },
    set,
    toggle: () => set(!paused),
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/**
 * Shows the board's pause button (when it has one), makes it toggle `pause` and keeps its word in step: "Pause", and
 * "Resume" while paused. `root`, the board, carries `data-paused` while paused, so its live dots stop pulsing too
 * (base.css). Returns a function that undoes all of it: the listener goes and the button is hidden again.
 */
export function bindPauseButton(button, pause, root = null) {
  if (!button) return () => {};
  const word = button.querySelector('[data-pause-label]');
  const show = (paused) => {
    const text = paused ? 'Resume' : 'Pause';
    if (word && word.textContent !== text) word.textContent = text;
    root?.toggleAttribute('data-paused', paused);
  };
  const onClick = () => pause.toggle();
  show(pause.paused);
  button.addEventListener('click', onClick);
  const unsubscribe = pause.subscribe(show);
  button.removeAttribute('hidden');
  return () => {
    button.removeEventListener('click', onClick);
    unsubscribe();
    root?.removeAttribute('data-paused');
    button.setAttribute('hidden', '');
  };
}
