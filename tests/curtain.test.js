import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { shouldShowCurtain, curtainInputs, CURTAIN_SEEN_KEY } from '../src/curtain/should-show.js';
import { mountCurtain, createCurtainVideo } from '../src/curtain/curtain.js';
import { renderAll } from './helpers/pages.js';

const rendered = renderAll();
const home = rendered.find((r) => r.page.key === 'home');

const YES = { path: '/', width: 1280, reducedMotion: false, hash: '', seen: false };
const CASES = [
  YES,
  { ...YES, width: 1000 },
  { ...YES, width: 1001 },
  { ...YES, width: 390 },
  { ...YES, width: 1920 },
  { ...YES, reducedMotion: true },
  { ...YES, hash: '#talk' },
  { ...YES, seen: true },
  { ...YES, path: '/platform/' },
  { ...YES, path: '/index.html' },
  { ...YES, width: 1000, seen: true, hash: '#talk' },
];

/** A window as the head script and curtainInputs read it: the address, the width, the motion setting and the session. */
function fakeWindow({ path, width, reducedMotion, hash, seen }, { storage } = {}) {
  const store = storage ?? makeStorage();
  if (seen) store.map.set(CURTAIN_SEEN_KEY, '1');
  return {
    location: { pathname: path, hash },
    innerWidth: width,
    matchMedia: (q) => ({ matches: q === '(prefers-reduced-motion: reduce)' ? reducedMotion : false }),
    get sessionStorage() {
      if (store.blocked) throw new DOMException('The operation is insecure.', 'SecurityError');
      return store;
    },
  };
}

/** sessionStorage: a Map, a record of writes, and optionally every call throwing (storage blocked). */
function makeStorage({ throws = false } = {}) {
  const map = new Map();
  const writes = [];
  return {
    map,
    writes,
    blocked: false,
    getItem(k) {
      if (throws) throw new DOMException('The operation is insecure.', 'SecurityError');
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      writes.push([k, v]);
      if (throws) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      map.set(k, String(v));
    },
  };
}

/** The inline script in the home page's head, as rendered. */
const headScript = () => home.html.match(/<script>([^<]*curtain-pending[^<]*)<\/script>/)?.[1];
/** Runs the head script against a fake window; true when it marked the page for the curtain. */
function runHead(src, win) {
  const classes = new Set();
  const doc = { documentElement: { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) } } };
  new Function('window', 'document', src)(win, doc);
  return classes.has('curtain-pending');
}

// ---------- the module, driven by hand: frames, the clock, images, fonts and the video are all the test's ----------

const POSTER = { naturalWidth: 1120, naturalHeight: 630, name: 'poster' };
const LOGO = { naturalWidth: 309, naturalHeight: 250, name: 'logo' };

let frames;
let frameSeq;
let clock;
let painted;
let videos;
let images;
let handle;

const raf = (cb) => {
  frameSeq += 1;
  frames.set(frameSeq, cb);
  return frameSeq;
};
const caf = (id) => frames.delete(id);
/** One animation frame: the clock and the timers move on together, then the waiting frame callbacks run. */
const frame = (ms = 16) => {
  clock += ms;
  vi.advanceTimersByTime(ms);
  const due = [...frames.values()];
  frames.clear();
  for (const cb of due) cb(clock);
};
const frameFor = (total, ms = 16) => {
  for (let t = 0; t < total; t += ms) frame(ms);
};
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

/** A drawing context that accepts every call and draws nothing (happy-dom has no canvas). */
function ctxStub() {
  const target = {};
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (prop === 'measureText') return () => ({ width: 300 });
      if (prop === 'createLinearGradient') return () => ({ addColorStop() {} });
      return () => {};
    },
    set(t, prop, v) {
      t[prop] = v;
      return true;
    },
  });
}

/** The real video element, with playback stubbed (happy-dom plays nothing). */
function stubbedVideo(doc) {
  const v = createCurtainVideo(doc);
  v.play = vi.fn(() => Promise.resolve());
  v.pause = vi.fn();
  v.load = vi.fn();
  let ready = 0;
  Object.defineProperty(v, 'readyState', { configurable: true, get: () => ready });
  Object.defineProperty(v, 'videoWidth', { configurable: true, get: () => 1120 });
  Object.defineProperty(v, 'videoHeight', { configurable: true, get: () => 630 });
  v.becomeReady = () => {
    ready = 4;
    v.dispatchEvent(new Event('playing'));
  };
  videos.push(v);
  return v;
}

const html = () => document.documentElement;
const root = () => document.querySelector('.curtain');
const cue = () => root()?.querySelector('button');
const isOpening = () => Boolean(root()?.classList.contains('is-opening')) || Boolean(root()?.classList.contains('is-sliding'));

function wheel(deltaY, target = document) {
  const ev = new Event('wheel', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'deltaY', { value: deltaY });
  Object.defineProperty(ev, 'ctrlKey', { value: false });
  target.dispatchEvent(ev);
  return ev;
}
function key(k, target = document.body) {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  target.dispatchEvent(ev);
  return ev;
}

/** Mounts as the home page does after the head script marked it, then lets the images and fonts arrive. */
async function mount({ inputs = {}, storage = makeStorage(), pending = true, ...opts } = {}) {
  if (pending) html().classList.add('curtain-pending');
  handle = mountCurtain(document, {
    inputs: { ...YES, ...inputs },
    storage,
    raf,
    caf,
    now: () => clock,
    getContext: () => ctxStub(),
    paint: (cloth, f) => {
      painted.push({ ...f });
    },
    loadImage: async (src) => {
      images.push(src);
      return src.includes('poster') ? POSTER : LOGO;
    },
    fontsReady: async () => {},
    createVideo: stubbedVideo,
    ...opts,
  });
  await settle();
  return { handle, storage };
}

beforeEach(() => {
  vi.useFakeTimers();
  frames = new Map();
  frameSeq = 0;
  clock = 900; // the module arrives shortly after the page starts
  painted = [];
  videos = [];
  images = [];
  handle = null;
  document.body.innerHTML =
    '<a class="skip-link" href="#main">Skip to content</a><header class="top"><a href="/">EMC Tickets</a></header>' +
    '<main id="main"><section class="hero"><h1>One system from first ticket to final report.</h1></section></main>';
  html().className = 'js';
});
afterEach(() => {
  handle?.destroy();
  vi.restoreAllMocks();
  vi.useRealTimers();
  html().className = '';
  document.body.innerHTML = '';
});

describe('when the curtain shows', () => {
  it('shows only on the home page, on a wide screen, with motion allowed, no anchor, first time this session', () => {
    const yes = { path: '/', width: 1280, reducedMotion: false, hash: '', seen: false };
    expect(shouldShowCurtain(yes)).toBe(true);
    expect(shouldShowCurtain({ ...yes, width: 1000 })).toBe(false);
    expect(shouldShowCurtain({ ...yes, width: 1001 })).toBe(true);
    expect(shouldShowCurtain({ ...yes, reducedMotion: true })).toBe(false);
    expect(shouldShowCurtain({ ...yes, hash: '#talk' })).toBe(false);
    expect(shouldShowCurtain({ ...yes, seen: true })).toBe(false);
    expect(shouldShowCurtain({ ...yes, path: '/platform/' })).toBe(false);
    expect(CURTAIN_SEEN_KEY).toBe('emc-curtain-seen');
  });

  it('the inline head script and the module apply the same rule', async () => {
    const src = headScript();
    expect(src, 'the home page head carries the curtain script').toBeTruthy();
    // It runs before the stylesheets, so the cover is there at the first paint.
    expect(home.html.indexOf(src)).toBeLessThan(home.html.indexOf('rel="stylesheet"'));
    // Only the home page has it.
    for (const r of rendered.filter((x) => x.page.key !== 'home')) expect(r.html, r.page.file).not.toContain('curtain-pending');

    for (const c of CASES) {
      const want = shouldShowCurtain(c);
      expect(runHead(src, fakeWindow(c)), JSON.stringify(c)).toBe(want);
      expect(shouldShowCurtain(curtainInputs(fakeWindow(c), CURTAIN_SEEN_KEY)), JSON.stringify(c)).toBe(want);
    }
    // Storage that throws reads as "not seen" in both.
    const blocked = makeStorage();
    blocked.blocked = true;
    expect(runHead(src, fakeWindow(YES, { storage: blocked }))).toBe(true);
    expect(curtainInputs(fakeWindow(YES, { storage: blocked }), CURTAIN_SEEN_KEY).seen).toBe(false);

    // The module mounts exactly when the rule holds, given what the head saw, and only over the head's cover.
    const opts = (c) => ({
      inputs: curtainInputs(fakeWindow(c), CURTAIN_SEEN_KEY),
      raf, caf, now: () => clock, getContext: () => ctxStub(), paint: () => {},
      loadImage: async () => POSTER, fontsReady: async () => {}, createVideo: stubbedVideo,
      storage: makeStorage(),
    });
    for (const c of CASES) {
      // Without the head's mark the hero has already been painted, so a cloth now would be a flash: never.
      expect(mountCurtain(document, opts(c)), JSON.stringify(c)).toBeNull();
      expect(root()).toBeNull();
      html().classList.add('curtain-pending');
      const h = mountCurtain(document, opts(c));
      expect(Boolean(h), JSON.stringify(c)).toBe(shouldShowCurtain(c));
      expect(Boolean(root()), JSON.stringify(c)).toBe(shouldShowCurtain(c));
      expect(html().classList.contains('curtain-pending'), 'the head mark is always taken over or cleared').toBe(false);
      h?.destroy();
      expect(html().className).toBe('js');
    }
  });

  it('as served, the hero is in the HTML and nothing hides it', () => {
    const { doc } = home;
    const h1 = doc.querySelector('main .hero h1');
    expect(h1.textContent.replace(/\s+/g, ' ').trim()).toBe('One system from first ticket to final report.');
    expect(doc.querySelector('.hero [data-board]')).not.toBeNull();
    expect(h1.closest('[hidden], [aria-hidden], [inert]')).toBeNull();
    expect(doc.querySelector('.hero [data-board]').closest('[hidden], [aria-hidden], [inert]')).toBeNull();
    // The cover is the head script's to add: as served, nothing on <html> or anywhere asks for it.
    expect(doc.documentElement.className).not.toMatch(/curtain/);
    expect(doc.querySelector('.curtain, [class*="curtain"]')).toBeNull();
    // No footage in the HTML: no video element and no preload; the module asks for it only when the curtain shows.
    expect(home.html).not.toMatch(/<video\b/);
    expect(home.html).not.toMatch(/fair-loop|fair-poster/);
  });

  it('a module that arrives late, or a page without a drawing surface, leaves the page as it is', async () => {
    clock = 7500; // the CSS cover gives up at 8 s: too late to start a cloth over it
    await mount();
    expect(handle).toBeNull();
    expect(root()).toBeNull();
    expect(html().classList.contains('curtain-pending')).toBe(false);
    expect(html().classList.contains('curtain-closed')).toBe(false);
    clock = 900;
    await mount({ getContext: () => null });
    expect(handle).toBeNull();
    expect(root()).toBeNull();
    expect(html().className).toBe('js');
  });
});

describe('opening', () => {
  const TRIGGERS = {
    'scroll down': () => wheel(120),
    Space: () => key(' '),
    ArrowDown: () => key('ArrowDown'),
    PageDown: () => key('PageDown'),
    End: () => key('End'),
    Enter: () => key('Enter'),
    'a click on the cloth': () => root().querySelector('canvas').dispatchEvent(new MouseEvent('click', { bubbles: true })),
    'the cue button': () => cue().click(),
    'a swipe': () => document.dispatchEvent(new Event('touchmove', { bubbles: true, cancelable: true })),
  };

  it('opens on scroll down, Space, ArrowDown, PageDown, Enter, a click on the cloth and the cue button, and only once', async () => {
    for (const [name, trigger] of Object.entries(TRIGGERS)) {
      const { storage } = await mount();
      frame();
      expect(isOpening(), name).toBe(false);
      expect(html().classList.contains('curtain-closed'), name).toBe(true);
      trigger();
      expect(isOpening(), name).toBe(true);
      // The hero starts rising into place the moment it opens (CSS runs it when the closed state goes).
      expect(html().classList.contains('curtain-closed'), name).toBe(false);
      expect(storage.writes, name).toEqual([[CURTAIN_SEEN_KEY, '1']]);
      // Every other trigger now does nothing more.
      for (const again of Object.values(TRIGGERS)) {
        if (root()) again();
      }
      expect(storage.writes, name).toHaveLength(1);
      handle.destroy();
      html().className = 'js';
      frames.clear();
    }
  });

  it('scrolling up or pressing ArrowUp does not open it and does not scroll the page', async () => {
    await mount();
    frame();
    for (const ev of [wheel(-120), key('ArrowUp'), key('PageUp'), key('Home'), wheel(0)]) {
      expect(ev.defaultPrevented, ev.type + (ev.key ?? ev.deltaY)).toBe(true);
    }
    expect(isOpening()).toBe(false);
    expect(html().classList.contains('curtain-closed')).toBe(true);
    // While closed, scrolling down is held too: the cloth opens instead of the page moving.
    expect(wheel(120).defaultPrevented).toBe(true);
    expect(key('ArrowDown').defaultPrevented).toBe(true);
    // Keys the curtain does not use are left alone.
    expect(key('Tab').defaultPrevented).toBe(false);
  });

  it('opens by itself after about 6 seconds with no input', async () => {
    await mount();
    vi.advanceTimersByTime(5900);
    expect(isOpening()).toBe(false);
    vi.advanceTimersByTime(200);
    expect(isOpening()).toBe(true);
  });

  it('opens when keyboard focus moves into the page under it', async () => {
    await mount();
    frame();
    cue().focus();
    expect(isOpening()).toBe(false);
    document.querySelector('header a').focus();
    expect(isOpening()).toBe(true);
  });

  it('marks the session when it starts to open, and does not show again in that session', async () => {
    const storage = makeStorage();
    await mount({ storage });
    frame();
    expect(storage.map.has(CURTAIN_SEEN_KEY)).toBe(false);
    wheel(120);
    expect(storage.map.get(CURTAIN_SEEN_KEY)).toBe('1');
    frameFor(1800);
    expect(root()).toBeNull();
    // The next home page view in this tab reads the mark (the head and the module alike) and goes straight to the page.
    const win = fakeWindow(YES, { storage });
    expect(curtainInputs(win, CURTAIN_SEEN_KEY).seen).toBe(true);
    expect(runHead(headScript(), win)).toBe(false);
    await mount({ inputs: curtainInputs(win, CURTAIN_SEEN_KEY), storage });
    expect(handle).toBeNull();
    expect(root()).toBeNull();
  });

  it('storage that throws does not stop it from showing or opening', async () => {
    const storage = makeStorage({ throws: true });
    storage.blocked = true;
    const inputs = curtainInputs(fakeWindow(YES, { storage }), CURTAIN_SEEN_KEY);
    expect(shouldShowCurtain(inputs)).toBe(true);
    await mount({ inputs, storage });
    expect(handle).not.toBeNull();
    frame();
    expect(() => wheel(120)).not.toThrow();
    expect(isOpening()).toBe(true);
    frameFor(1800);
    expect(root()).toBeNull();
  });
});

describe('the footage', () => {
  it('requests the video only when the curtain shows; never on a narrow screen', async () => {
    await mount({ inputs: { width: 390 } });
    expect(handle).toBeNull();
    frameFor(500);
    expect(videos).toHaveLength(0);
    expect(images, 'not even the still').toHaveLength(0);
    expect(document.querySelector('video, .curtain')).toBeNull();
    expect(html().className).toBe('js');

    await mount();
    expect(handle).not.toBeNull();
    // The still is drawn first; the video is asked for only once that frame is on screen.
    expect(painted.length).toBeGreaterThan(0);
    expect(painted[0].source).toBe(POSTER);
    expect(videos).toHaveLength(0);
    frame();
    expect(videos).toHaveLength(1);
    frameFor(300);
    expect(videos).toHaveLength(1);
    const v = videos[0];
    expect([...v.querySelectorAll('source')].map((s) => [s.getAttribute('src'), s.getAttribute('type')])).toEqual([
      ['/emc-site/curtain/fair-loop.webm', 'video/webm'],
      ['/emc-site/curtain/fair-loop.mp4', 'video/mp4'],
    ]);
    expect(v.muted).toBe(true);
    expect(v.loop).toBe(true);
    expect(v.hasAttribute('playsinline')).toBe(true);
    expect(v.play).toHaveBeenCalled();
    // Until it can play, the cloth shows the still; then the footage.
    expect(painted.at(-1).source).toBe(POSTER);
    v.becomeReady();
    frame();
    expect(painted.at(-1).source).toBe(v);
  });

  it('a video that fails to load leaves the still on the cloth and the curtain still opens', async () => {
    await mount();
    frame();
    const v = videos[0];
    for (const s of v.querySelectorAll('source')) s.dispatchEvent(new Event('error'));
    v.dispatchEvent(new Event('error'));
    frameFor(200);
    expect(painted.at(-1).source).toBe(POSTER);
    wheel(120);
    frameFor(800);
    expect(painted.at(-1).source).toBe(POSTER);
    expect(painted.at(-1).progress).toBeGreaterThan(0);
    frameFor(1000);
    expect(root()).toBeNull();
  });
});

describe('smoothness', () => {
  it('keeps the cloth when frames come at 60 a second', async () => {
    await mount();
    frameFor(800, 16);
    expect(root().classList.contains('is-slide')).toBe(false);
    expect(frames.size).toBe(1);
  });

  it('one slow frame among fast ones is a hiccup, not a slow machine; a very slow machine still gets the slide', async () => {
    await mount();
    frameFor(16 * 6, 16);
    frame(200); // a busy moment
    frameFor(16 * 20, 16);
    expect(root().classList.contains('is-slide')).toBe(false);
    expect(frames.size).toBe(1);
    handle.destroy();
    frames.clear();
    html().className = 'js';
    await mount();
    for (let i = 0; i < 16; i++) frame(300); // three frames a second (and well before the 6-second opening)
    expect(root().classList.contains('is-slide')).toBe(true);
    expect(frames.size).toBe(0);
  });

  it('falls back to a plain slide when frames are slow', async () => {
    await mount();
    frameFor(1200, 40);
    expect(root().classList.contains('is-slide')).toBe(true);
    // The loop has stopped: no frame is waiting and the canvas holds one flat still.
    expect(frames.size).toBe(0);
    expect(painted.at(-1).flat).toBe(true);
    const count = painted.length;
    expect(videos[0].pause).toHaveBeenCalled();
    wheel(120);
    expect(root().classList.contains('is-sliding')).toBe(true);
    expect(html().classList.contains('curtain-closed')).toBe(false);
    vi.advanceTimersByTime(800);
    expect(root()).not.toBeNull();
    vi.advanceTimersByTime(300);
    expect(root()).toBeNull();
    expect(painted).toHaveLength(count);
  });

  it('an opening asked for before the first frame is ready uses the slide', async () => {
    await mount({ loadImage: () => new Promise(() => {}) }); // the still never arrives
    expect(root()).not.toBeNull();
    expect(painted).toHaveLength(0);
    wheel(120);
    expect(root().classList.contains('is-sliding')).toBe(true);
    vi.advanceTimersByTime(1100);
    expect(root()).toBeNull();
    expect(videos).toHaveLength(0);
  });

  it('draws with a real context stub without throwing, closed and opening', async () => {
    await mount({ paint: undefined });
    frameFor(200);
    wheel(120);
    frameFor(1800);
    expect(root()).toBeNull();
  });
});

describe('access and clean-up', () => {
  it('the cue is a real button with the text "Scroll to pull back the curtain"; the page content is never aria-hidden or inert', async () => {
    await mount();
    frame();
    const b = cue();
    expect(b.tagName).toBe('BUTTON');
    expect(b.getAttribute('type')).toBe('button');
    expect(b.textContent).toBe('Scroll to pull back the curtain');
    expect(b.hasAttribute('disabled')).toBe(false);
    expect(b.hasAttribute('tabindex')).toBe(false);
    expect(b.closest('[aria-hidden], [hidden], [inert]')).toBeNull();
    // First in the tab order, so a keyboard visitor reaches it before anything under the cloth.
    expect(document.body.firstElementChild).toBe(root());
    // Nothing outside the curtain is hidden from assistive technology; inside it, only the drawing is.
    for (const el of document.querySelectorAll('[aria-hidden], [inert]')) {
      expect(root().contains(el), el.outerHTML.slice(0, 60)).toBe(true);
      expect(el.tagName).toBe('CANVAS');
    }
    expect(document.querySelector('[inert]')).toBeNull();
  });

  it('after it has opened, page scrolling is no longer blocked and the cloth is gone from the page', async () => {
    await mount();
    frameFor(200);
    wheel(120);
    // Held while the cloth is moving.
    frameFor(800);
    expect(wheel(120).defaultPrevented).toBe(true);
    frameFor(1000);
    expect(root()).toBeNull();
    expect(document.querySelector('canvas, video')).toBeNull();
    expect(html().className).toBe('js');
    expect(wheel(120).defaultPrevented).toBe(false);
    expect(wheel(-120).defaultPrevented).toBe(false);
    expect(key(' ').defaultPrevented).toBe(false);
    expect(key('ArrowUp').defaultPrevented).toBe(false);
    // Nothing of it runs any more.
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(videos[0].pause).toHaveBeenCalled();
    expect(videos[0].querySelector('source')).toBeNull();
  });

  it('destroy() removes every listener, timer, frame and the video', async () => {
    const added = [];
    const removed = [];
    for (const target of [window, document]) {
      const add = target.addEventListener.bind(target);
      const remove = target.removeEventListener.bind(target);
      vi.spyOn(target, 'addEventListener').mockImplementation((type, fn, o) => {
        added.push([target, type, fn]);
        return add(type, fn, o);
      });
      vi.spyOn(target, 'removeEventListener').mockImplementation((type, fn, o) => {
        removed.push([target, type, fn]);
        return remove(type, fn, o);
      });
    }
    await mount();
    frameFor(100);
    expect(added.length).toBeGreaterThan(0);
    expect(frames.size).toBe(1);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    handle.destroy();
    for (const a of added) expect(removed.some((r) => r[0] === a[0] && r[1] === a[1] && r[2] === a[2]), a[1]).toBe(true);
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(root()).toBeNull();
    expect(html().className).toBe('js');
    const v = videos[0];
    expect(v.pause).toHaveBeenCalled();
    expect(v.querySelector('source')).toBeNull();
    expect(v.hasAttribute('src')).toBe(false);
    expect(v.isConnected).toBe(false);
    // Still nothing after a while (not even the 6-second opening), and a second destroy is harmless.
    const n = painted.length;
    frameFor(7000, 100);
    expect(painted).toHaveLength(n);
    expect(root()).toBeNull();
    expect(() => handle.destroy()).not.toThrow();
  });
});
