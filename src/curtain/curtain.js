// The home page's curtain (spec 5.4). On computers the first view is a cloth printed with looping fair footage, the
// EMC logo, "Behind every great fair." and a cue. The first scroll down (or a swipe, Space, the down arrow, Page Down,
// End, Enter, a click, keyboard focus moving into the page, or 6 idle seconds) gathers it and sweeps it off to the
// right in 1.6 s, while the photo behind eases back and the copy and board rise into place (curtain.css). Browser only.
//
// It never stands between a visitor and the page:
// - It shows only over the cover the head script already put up (html.curtain-pending, by the same rule), so the hero
//   never flashes first, and it takes that cover over at once with the same still.
// - A late arrival (the CSS cover gives up at 8 s), no canvas, or any error: the page, as served. Slow frames: a plain
//   slide of the still instead of the cloth.
// - Once open, everything it added is gone: its element, the canvases, the video, every listener, timer and frame.
// All drawing is in paintCloth(); the rest (when, input, the session mark, the video, the slow-frame fallback and the
// clean-up) is plain logic the tests drive with stubs.
import { CURTAIN_SEEN_KEY, shouldShowCurtain, curtainInputs } from './should-show.js';

const POSTER_SRC = '/emc-site/curtain/fair-poster.jpg';
const VIDEO_SOURCES = [
  ['/emc-site/curtain/fair-loop.webm', 'video/webm'],
  ['/emc-site/curtain/fair-loop.mp4', 'video/mp4'],
];
const POSTER_AT_S = 1; // fair-poster.jpg is the footage's frame at 1 s, so the video starts there and the switch is seamless
const LOGO_SRC = '/emc-site/img/emc-logo-on-dark.png';
const LOGO = { top: 26, width: 96, height: (96 * 250) / 309 }; // the on-dark logo (309 x 250), as curtain.css places it
const CUE_TEXT = 'Scroll to pull back the curtain';
const CUE_BASELINE = 44; // px above the bottom of the window; the button (curtain.css) is centred 5px above it
const COVER = 1.1; // the picture covers 110% of the window's width (curtain.css: max(110%, ...)), so the swaying hem
// never shows its edge

const OPEN_MS = 1600; // the cloth's sweep
const SLIDE_MS = 900; // the plain slide (curtain.css, .is-sliding)
const IDLE_MS = 6000; // with no input, it opens by itself
const READY_MS = 1500; // the longest the first frame waits for the still, the logo and the fonts
const LATE_MS = 7000; // arriving later than this, it leaves the page alone: the CSS cover goes at 8 s
const SLOW_FRAME_MS = 24; // an average frame slower than this, while closed, switches to the slide
const SKIP_FRAMES = 3; // the first frames include start-up work, not the machine's pace
const SAMPLE_FRAMES = 10; // averaged, after the one slowest of SAMPLE_FRAMES + 1 is set aside as a passing hiccup
const OPEN_KEYS = new Set([' ', 'Spacebar', 'ArrowDown', 'Down', 'PageDown', 'End', 'Enter']);
const HOLD_KEYS = new Set(['ArrowUp', 'Up', 'PageUp', 'Home']);

/** The footage, muted, looping and inline: WebM first, MP4 second. Adding the sources starts the download. */
export function createCurtainVideo(doc) {
  const video = doc.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute('muted', '');
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.preload = 'auto';
  for (const [src, type] of VIDEO_SOURCES) {
    const source = doc.createElement('source');
    source.setAttribute('src', src);
    source.setAttribute('type', type);
    video.appendChild(source);
  }
  return video;
}

function loadImageWith(win) {
  return (src) =>
    new Promise((resolve) => {
      const img = new win.Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
}

function loadFonts(doc) {
  const fonts = doc.fonts;
  if (!fonts || typeof fonts.load !== 'function') return Promise.resolve();
  return Promise.all([fonts.load('700 100px "Bricolage Grotesque"'), fonts.load('500 14px "DM Mono"')]);
}

function sessionOf(win) {
  try {
    return win.sessionStorage;
  } catch {
    return null; // blocked: the curtain still shows and opens, it just cannot remember
  }
}

/**
 * Puts the curtain up over the home page, or returns null and leaves the page as it is. Options are for the tests:
 * inputs (what the rule reads), storage, raf/caf, now, getContext, paint, loadImage, fontsReady, createVideo.
 */
export function mountCurtain(doc = document, opts = {}) {
  const win = doc.defaultView;
  const html = doc.documentElement;
  const clearMarks = () => html.classList.remove('curtain-pending', 'curtain-closed');
  const now = opts.now ?? (() => win.performance.now());
  const inputs = opts.inputs ?? curtainInputs(win, CURTAIN_SEEN_KEY);
  // Only over the head's cover: without it the hero has been painted, and a cloth now would be a flash.
  if (!html.classList.contains('curtain-pending') || !shouldShowCurtain(inputs) || now() > LATE_MS) {
    clearMarks();
    return null;
  }
  const getContext = opts.getContext ?? ((c) => (typeof c.getContext === 'function' ? c.getContext('2d') : null));
  const canvas = doc.createElement('canvas');
  const print = doc.createElement('canvas'); // the footage and the words, flat: what the cloth is cut from
  const overlay = doc.createElement('canvas'); // the words, logo and shades, drawn once per size
  const ctx = getContext(canvas);
  const pctx = ctx && getContext(print);
  const octx = pctx && getContext(overlay);
  if (!octx) {
    clearMarks();
    return null;
  }

  const raf = opts.raf ?? ((cb) => win.requestAnimationFrame(cb));
  const caf = opts.caf ?? ((id) => win.cancelAnimationFrame(id));
  const paint = opts.paint ?? paintCloth;
  const storage = opts.storage !== undefined ? opts.storage : sessionOf(win);
  const createVideo = opts.createVideo ?? createCurtainVideo;

  const root = doc.createElement('div');
  root.className = 'curtain';
  canvas.className = 'curtain-cloth';
  canvas.setAttribute('aria-hidden', 'true'); // a picture of the words; the button carries the cue
  const cue = doc.createElement('button');
  cue.type = 'button';
  cue.className = 'curtain-cue';
  cue.textContent = CUE_TEXT;
  root.append(canvas, cue);

  const cloth = {
    root, win, canvas, ctx, print, pctx, overlay, octx,
    dpr: Math.min(win.devicePixelRatio || 1, 2),
    poster: null, logo: null, sized: false, overlayDirty: true, printDirty: true, frameDriven: false,
    W: 0, H: 0, PW: 0, L0: 0, RR: 0, wts: new Float32Array(SLICES), printed: null, printedAt: -1,
  };

  let mode = 'closed'; // closed, opening, done
  let slide = false; // the plain slide instead of the cloth
  let drawn = false; // the cloth's first frame is on the canvas
  let rafId = null;
  let t0 = 0;
  let idleTimer = null;
  let readyTimer = null;
  let finishTimer = null;
  let video = null;
  let videoAsked = false;
  let videoLive = false;
  let videoFrameId = null;
  const videoListeners = [];
  let lastFrameAt = 0;
  let skipped = 0;
  const samples = [];
  let measured = false;
  const listeners = [];

  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    listeners.push([target, type, fn, options]);
  };

  function teardown() {
    mode = 'done';
    for (const [target, type, fn, options] of listeners) target.removeEventListener(type, fn, options);
    listeners.length = 0;
    if (rafId !== null) caf(rafId);
    rafId = null;
    for (const t of [idleTimer, readyTimer, finishTimer]) clearTimeout(t);
    idleTimer = readyTimer = finishTimer = null;
    releaseVideo();
    root.remove();
    clearMarks();
  }
  /** Runs a step; if it throws, the visitor gets the page. */
  function guard(step) {
    try {
      step();
    } catch (err) {
      console.error(err);
      teardown();
    }
  }

  function releaseVideo() {
    if (!video) return;
    const v = video;
    video = null;
    videoLive = false;
    for (const [type, fn] of videoListeners) v.removeEventListener(type, fn);
    videoListeners.length = 0;
    if (videoFrameId !== null && typeof v.cancelVideoFrameCallback === 'function') v.cancelVideoFrameCallback(videoFrameId);
    videoFrameId = null;
    cloth.frameDriven = false;
    try {
      v.pause();
      v.removeAttribute('src');
      while (v.firstChild) v.removeChild(v.firstChild);
      v.load(); // drops what it was fetching
    } catch {
      /* nothing playing */
    }
    v.remove();
  }
  function startVideo() {
    videoAsked = true;
    video = createVideo(doc);
    const on = (type, fn) => {
      video.addEventListener(type, fn);
      videoListeners.push([type, fn]);
    };
    on('loadedmetadata', () => {
      try {
        video.currentTime = POSTER_AT_S;
      } catch {
        /* it starts from the beginning instead */
      }
    });
    on('playing', () => {
      videoLive = true;
    });
    // Where the browser says when a new frame is shown, the print is redrawn only then (24 a second, not every frame).
    if (typeof video.requestVideoFrameCallback === 'function') {
      const v = video;
      const onFrame = () => {
        cloth.printDirty = true;
        if (video === v) videoFrameId = v.requestVideoFrameCallback(onFrame);
      };
      videoFrameId = v.requestVideoFrameCallback(onFrame);
      cloth.frameDriven = true;
    }
    // An error or a refusal to play leaves videoLive false: the still stays on the cloth.
    const played = video.play();
    if (played && typeof played.catch === 'function') played.catch(() => {});
  }

  let cueSway = 0;
  function paintNow(progress, time, flat = false) {
    const source = videoLive && video && video.readyState >= 2 && !video.seeking ? video : cloth.poster;
    const sway = Number(paint(cloth, { progress, time, source, flat })) || 0;
    if (Math.abs(sway - cueSway) >= 0.5 || (!sway && cueSway)) {
      cueSway = sway;
      cue.style.transform = sway ? `translateX(${sway.toFixed(1)}px)` : '';
    }
  }

  /** Average frame time over the first frames while closed; slower than SLOW_FRAME_MS, the plain slide. */
  function measure(t) {
    if (lastFrameAt && t > lastFrameAt) {
      if (skipped < SKIP_FRAMES) skipped += 1;
      else samples.push(t - lastFrameAt);
    }
    lastFrameAt = t;
    if (samples.length <= SAMPLE_FRAMES) return;
    measured = true;
    const kept = samples.sort((a, b) => a - b).slice(0, SAMPLE_FRAMES); // one hiccup is not the machine's pace
    const average = kept.reduce((a, b) => a + b, 0) / kept.length;
    if (average > SLOW_FRAME_MS) toSlide();
  }
  function toSlide() {
    slide = true;
    releaseVideo();
    if (drawn) paintNow(0, 0, true); // one flat still of the cloth, which the slide moves
    root.classList.add('is-slide');
  }

  function loop(t) {
    rafId = null;
    guard(() => {
      if (mode === 'done') return;
      if (!videoAsked && !slide) startVideo(); // the still has been on screen for a frame
      if (mode === 'closed' && !measured) measure(t);
      if (slide) return; // the slide needs no frames
      const progress = mode === 'opening' ? Math.min(1, Math.max(0, (t - t0) / OPEN_MS)) : 0;
      paintNow(progress, t);
      if (progress >= 1) {
        teardown();
        return;
      }
      rafId = raf(loop);
    });
  }

  function firstFrame() {
    if (mode !== 'closed' || drawn) return; // already sliding away, or gone
    clearTimeout(readyTimer);
    readyTimer = null;
    guard(() => {
      paintNow(0, now());
      drawn = true;
      root.classList.add('is-drawn');
      rafId = raf(loop);
    });
  }

  function open() {
    if (mode !== 'closed') return;
    guard(() => {
      mode = 'opening';
      try {
        storage?.setItem(CURTAIN_SEEN_KEY, '1');
      } catch {
        /* storage blocked: it may show again next time, that is all */
      }
      clearTimeout(idleTimer);
      idleTimer = null;
      if (root.contains(doc.activeElement)) doc.activeElement.blur();
      html.classList.remove('curtain-closed'); // the photo eases back, the copy and board rise (curtain.css)
      if (slide || !drawn) {
        slide = true;
        releaseVideo();
        if (rafId !== null) caf(rafId);
        rafId = null;
        root.classList.add('is-slide', 'is-sliding');
        finishTimer = setTimeout(teardown, SLIDE_MS + 60);
      } else {
        t0 = now();
        root.classList.add('is-opening');
        finishTimer = setTimeout(teardown, OPEN_MS + 1000); // if frames stop (a hidden tab), it still finishes
      }
    });
  }

  // While it is up, the page does not scroll: what would scroll it opens the curtain instead (downward) or nothing.
  function onWheel(e) {
    if (e.ctrlKey) return; // the browser's zoom
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // a sideways swipe (back and forward on a trackpad)
    if (e.cancelable) e.preventDefault();
    if (e.deltaY > 0) open();
  }
  function onTouchMove(e) {
    if (e.cancelable) e.preventDefault();
    open();
  }
  function onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (OPEN_KEYS.has(e.key)) {
      if (e.key !== 'Enter') e.preventDefault(); // Enter scrolls nothing; on the cue it is the button's own press
      open();
    } else if (HOLD_KEYS.has(e.key)) {
      e.preventDefault();
    }
  }
  function onFocusIn(e) {
    if (!root.contains(e.target)) open(); // the keyboard has gone on into the page
  }
  function onScroll() {
    if (win.scrollY <= 0 && win.scrollX <= 0) return;
    try {
      win.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch {
      win.scrollTo(0, 0);
    }
    open();
  }
  function onVisibility() {
    lastFrameAt = 0; // the gap while the tab was hidden says nothing about the machine's pace
    if (doc.hidden) {
      clearTimeout(idleTimer);
      idleTimer = null;
    } else if (mode === 'closed' && idleTimer === null) {
      idleTimer = setTimeout(open, IDLE_MS);
    }
  }
  function onResize() {
    cloth.sized = false;
    if (slide && drawn && mode === 'closed') guard(() => paintNow(0, 0, true));
  }

  try {
    doc.body.prepend(root); // first in the tab order, so the cue comes before anything under the cloth
    html.classList.add('curtain-closed');
    html.classList.remove('curtain-pending'); // the same still, now the module's
    listen(doc, 'wheel', onWheel, { passive: false });
    listen(doc, 'touchmove', onTouchMove, { passive: false });
    listen(doc, 'keydown', onKey);
    listen(doc, 'focusin', onFocusIn);
    listen(doc, 'visibilitychange', onVisibility);
    listen(win, 'scroll', onScroll, { passive: true });
    listen(win, 'resize', onResize, { passive: true });
    listen(root, 'click', open);
    if (!doc.hidden) idleTimer = setTimeout(open, IDLE_MS);

    const loadImage = opts.loadImage ?? loadImageWith(win);
    const fontsReady = opts.fontsReady ?? (() => loadFonts(doc));
    const fonts = Promise.resolve().then(fontsReady).catch(() => {});
    const poster = loadImage(POSTER_SRC).then((img) => {
      cloth.poster = img;
      cloth.printDirty = true;
    });
    const logo = loadImage(LOGO_SRC).then((img) => {
      cloth.logo = img;
      cloth.overlayDirty = true;
    });
    // Late fonts redraw the words when they come; the first frame waits for them only so long.
    fonts.then(() => {
      cloth.overlayDirty = true;
    });
    const enough = new Promise((resolve) => {
      readyTimer = setTimeout(resolve, READY_MS);
    });
    Promise.race([Promise.all([poster, logo, fonts]), enough]).then(firstFrame, firstFrame);
  } catch (err) {
    teardown();
    throw err;
  }

  return { open, destroy: teardown };
}

// ---------- drawing: the approved mockup's cloth ----------
// The footage and words are drawn flat onto `print`, then the print is drawn as SLICES vertical slices whose widths
// bunch into pleats as the cloth gathers, sheared so the hem trails, each shaded for its fold, with a soft shadow cast
// on the page at its leading edge. Coordinates are CSS pixels; the canvases are scaled by the device pixel ratio.

const SLICES = 120;
const FOLDS = 14;
const TAU = Math.PI * 2;

/** Draws one frame and returns how far the cloth's sway has moved the drawn cue (the button follows it). */
function paintCloth(c, { progress, time, source, flat }) {
  const W = c.root.clientWidth || c.win.innerWidth;
  const H = c.root.clientHeight || c.win.innerHeight;
  if (!W || !H) return 0;
  if (!c.sized || W !== c.W || H !== c.H) sizeCloth(c, W, H);
  if (c.overlayDirty) drawOverlay(c);
  const at = source && 'currentTime' in source ? source.currentTime : -1;
  if (c.printDirty || source !== c.printed || (!c.frameDriven && at !== c.printedAt)) drawPrint(c, source, at);
  return flat ? drawFlat(c) : drawCloth(c, progress, time);
}

function sizeCloth(c, W, H) {
  c.W = W;
  c.H = H;
  c.L0 = -0.03 * W; // the cloth's left edge, just off screen, so the sheared hem never shows a gap
  c.RR = 1.16 * W; // where it gathers to, off screen right
  c.PW = Math.ceil(c.RR - c.L0);
  c.canvas.width = Math.round(W * c.dpr);
  c.canvas.height = Math.round(H * c.dpr);
  c.print.width = c.overlay.width = Math.round(c.PW * c.dpr);
  c.print.height = c.overlay.height = Math.round(H * c.dpr);
  c.sized = true;
  c.overlayDirty = true;
  c.printDirty = true;
}

/** The words, the logo, the two shades and the hem, in print coordinates. */
function drawOverlay(c) {
  const { octx: o, W, H, PW, L0, dpr } = c;
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(0, 0, c.overlay.width, c.overlay.height);
  o.setTransform(dpr, 0, 0, dpr, 0, 0);
  // The two shades, exactly as curtain.css lays them over the still.
  let g = o.createLinearGradient(0, H * 0.3, 0, H);
  g.addColorStop(0, 'rgba(7,9,15,0)');
  g.addColorStop(1, 'rgba(7,9,15,.86)');
  o.fillStyle = g;
  o.fillRect(0, 0, PW, H);
  g = o.createLinearGradient(0, 0, 0, 150);
  g.addColorStop(0, 'rgba(7,9,15,.55)');
  g.addColorStop(1, 'rgba(7,9,15,0)');
  o.fillStyle = g;
  o.fillRect(0, 0, PW, 150);
  const x = W * 0.055 - L0; // the print x that lands 5.5% across the window
  if (c.logo) o.drawImage(c.logo, x, LOGO.top, LOGO.width, LOGO.height);
  const fs = Math.round(Math.min(W * 0.088, H * 0.17, 136));
  const spacing = 'letterSpacing' in o;
  o.fillStyle = '#fff';
  o.textBaseline = 'alphabetic';
  o.font = `700 ${fs}px "Bricolage Grotesque", system-ui, sans-serif`;
  if (spacing) o.letterSpacing = `${-fs * 0.03}px`;
  const base = H - 92;
  o.fillText('Behind every', x, base - fs);
  o.fillText('great fair.', x, base);
  // The cue, and its arrow drawn rather than typed (the self-hosted fonts have no arrow glyph).
  const cueText = CUE_TEXT.toUpperCase();
  const y = H - CUE_BASELINE;
  if (spacing) o.letterSpacing = '1.5px';
  o.font = '500 14px "DM Mono", ui-monospace, monospace';
  o.fillStyle = o.strokeStyle = 'rgba(255,255,255,.9)';
  o.fillText(cueText, x, y);
  const ax = x + o.measureText(cueText).width + 14;
  o.lineWidth = 1.6;
  o.lineCap = 'round';
  o.lineJoin = 'round';
  o.beginPath();
  o.moveTo(ax, y - 11);
  o.lineTo(ax, y - 0.5);
  o.moveTo(ax - 4, y - 4.5);
  o.lineTo(ax, y - 0.5);
  o.lineTo(ax + 4, y - 4.5);
  o.stroke();
  if (spacing) o.letterSpacing = '0px';
  o.fillStyle = 'rgba(0,0,0,.28)';
  o.fillRect(0, H - 16, PW, 3); // the stitched hem
  c.overlayDirty = false;
  c.printDirty = true;
}

/** The footage (or the still) under the overlay. */
function drawPrint(c, source, at) {
  const { pctx: p, W, H, PW, L0, dpr } = c;
  p.setTransform(dpr, 0, 0, dpr, 0, 0);
  p.fillStyle = '#0b0d14';
  p.fillRect(0, 0, PW, H);
  const iw = source ? source.videoWidth || source.naturalWidth : 0;
  const ih = source ? source.videoHeight || source.naturalHeight : 0;
  if (iw && ih) {
    // Over the window it is curtain.css's still exactly (centred, covering 110% of the width). Where the print reaches
    // further than that, the picture carries on mirrored; that part only ever shows inside the gathered folds.
    const s = Math.max((W * COVER) / iw, H / ih);
    const w = iw * s;
    const h = ih * s;
    const x = (W - w) / 2 - L0;
    const y = (H - h) / 2;
    p.drawImage(source, x, y, w, h);
    const mirrorAt = (edge) => {
      p.save();
      p.translate(2 * edge, 0);
      p.scale(-1, 1);
      p.drawImage(source, x, y, w, h);
      p.restore();
    };
    if (x > 0) mirrorAt(x);
    if (x + w < PW) mirrorAt(x + w);
  }
  p.setTransform(1, 0, 0, 1, 0, 0);
  p.drawImage(c.overlay, 0, 0);
  c.printed = source;
  c.printedAt = at;
  c.printDirty = false;
}

function drawFlat(c) {
  const { ctx } = c;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, c.canvas.width, c.canvas.height);
  ctx.drawImage(c.print, c.L0 * c.dpr, 0);
  return 0;
}

function drawCloth(c, progress, t) {
  const { ctx, W, H, L0, RR, dpr, wts } = c;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, c.canvas.width, c.canvas.height);
  if (progress >= 0.995) return 0;
  const p = progress;
  const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; // a slow tug, a fast sweep, a soft finish
  const L = L0 + (RR - L0) * e; // the cloth's top-left corner
  const span = RR - L;
  const gather = 1 - span / (RR - L0); // 0 flat, 1 fully gathered
  const lag = W * (0.013 + 0.011 * Math.sin(t * 0.0011)) + W * 0.105 * Math.sin(Math.PI * e); // the hem trails the top
  const shear = -lag / H;
  const drift = Math.sin(t * 0.0005) * 0.5;
  const amp = 0.07 + 0.78 * Math.pow(gather, 0.7);
  let sum = 0;
  for (let i = 0; i < SLICES; i++) {
    wts[i] = 1 + amp * Math.cos(((i + 0.5) / SLICES) * FOLDS * TAU + drift);
    sum += wts[i];
  }
  if (e > 0.01) {
    // the soft shadow the cloth throws on the page
    ctx.setTransform(dpr, 0, shear * dpr, dpr, (L - 70) * dpr, 0);
    const sg = ctx.createLinearGradient(0, 0, 70, 0);
    sg.addColorStop(0, 'rgba(60,35,0,0)');
    sg.addColorStop(1, 'rgba(60,35,0,.28)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, 70, H);
  }
  const sw = c.print.width / SLICES;
  const sh = c.print.height;
  const dark = 0.1 + 0.5 * gather;
  const lite = 0.03 + 0.16 * gather;
  let x = L;
  for (let i = 0; i < SLICES; i++) {
    const w = (span * wts[i]) / sum;
    const ph = ((i + 0.5) / SLICES) * FOLDS * TAU + drift;
    ctx.setTransform(dpr, 0, shear * dpr, dpr, x * dpr, 0);
    ctx.drawImage(c.print, i * sw, 0, sw, sh, 0, 0, w + 0.6, H);
    const s = -Math.sin(ph);
    const v = Math.max(0, -Math.cos(ph));
    const a = (s > 0 ? 0 : -s * dark) + v * dark * 0.55;
    if (a > 0.004) {
      ctx.fillStyle = `rgba(8,6,14,${Math.min(0.85, a).toFixed(3)})`;
      ctx.fillRect(0, 0, w + 0.6, H);
    }
    if (s > 0) {
      ctx.fillStyle = `rgba(255,240,215,${(s * lite).toFixed(3)})`;
      ctx.fillRect(0, 0, w + 0.6, H);
    }
    x += w;
  }
  return shear * (H - CUE_BASELINE - 5);
}
