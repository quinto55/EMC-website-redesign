// When the home page's curtain shows (spec 5.4), in one place for both of its users: the module, and the small script
// build/render.js writes into the home page's head, which decides before the first paint whether to cover the hero.
// The head gets these two functions' own source text, so each must stay self-contained: no imports and no names from
// outside the function (the session key is passed in), and nothing newer than the browsers that run module scripts.

/** sessionStorage key, set when the curtain starts to open; while it is there, this tab skips the curtain. */
export const CURTAIN_SEEN_KEY = 'emc-curtain-seen';

/** Only on the home page, at least 1001px wide, with motion allowed, no #anchor, and not yet seen in this session. */
export function shouldShowCurtain({ path, width, reducedMotion, hash, seen }) {
  return path === '/' && width >= 1001 && !reducedMotion && !hash && !seen;
}

/** What the rule needs, read from a window. Storage that throws (blocked, private modes) reads as not seen. */
export function curtainInputs(win, seenKey) {
  var seen = false;
  var reducedMotion = false;
  try {
    seen = win.sessionStorage.getItem(seenKey) !== null;
  } catch (e) {
    seen = false;
  }
  try {
    reducedMotion = win.matchMedia('(prefers-reduced-motion: reduce)').matches === true;
  } catch (e) {
    reducedMotion = false;
  }
  return { path: win.location.pathname, width: win.innerWidth, reducedMotion: reducedMotion, hash: win.location.hash, seen: seen };
}
