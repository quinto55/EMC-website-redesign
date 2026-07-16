# Homepage Visual Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the EMC homepage a cinematic masked-EMC intro, ambient scroll parallax with curtain reveals, a pinned scroll-scrubbed "40 years" scene, and premium micro-interactions (hotspot cards, magnetic buttons, partner marquee, ember particles).

**Architecture:** GSAP + ScrollTrigger integrated into the existing vanilla module pattern — one file per effect in `src/`, each exporting `init*()` called from `main.js`. A shared `src/motion.js` produces a context object `{ gsap, ScrollTrigger, reduced }` and owns the intro session gate. Pure logic is exported per-module and unit-tested with vitest (happy-dom); GSAP is faked in tests.

**Tech Stack:** Vite 5, vanilla ES modules, GSAP 3 + ScrollTrigger (only new dependency), vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-07-15-homepage-visual-effects-design.md`

## Global Constraints

- Homepage (`index.html` + `src/main.js` chain) only. Sub-pages and `src/sub.js` must behave exactly as today; `initReveals()` called with no arguments must keep its current IO + `is-visible` class behavior.
- `gsap` is the ONLY new npm dependency.
- Session gate key: `sessionStorage` key `emcIntroSeen`, value `'1'`.
- `prefers-reduced-motion: reduce` ⇒ every effect collapses to a static/instant state: intro skipped instantly, no parallax, no pin (final values shown), marquee stays a static row, particles render one static frame.
- Animate only `transform`/`opacity` (exception: the hero video blur, per spec).
- Mobile breakpoint `max-width: 768px`: the "40" scene never pins; count-up plays once on entry.
- Intro is skippable at any time via pointerdown / keydown / wheel / touchstart.
- All tests run with `npm test` (vitest, happy-dom). GSAP must never be required for a unit test to pass — inject fakes.
- Milestone captions (exact copy): `Small-town fairs`, `Multi-day festivals`, `Theme parks`, `Sports venues`.
- Video URLs: intro reuses the hero video `https://videos.pexels.com/video-files/31210326/13331991_2730_1440_24fps.mp4`; the "40" mask uses `https://videos.pexels.com/video-files/33945522/14403884_2560_1440_60fps.mp4`.
- Commit after every task with the exact message given in the task.

---

### Task 1: Motion foundation (`src/motion.js`)

**Files:**
- Create: `src/motion.js`
- Test: `tests/motion.test.js`
- Modify: `package.json` (via `npm install gsap`)
- Modify: `src/main.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `initMotion(): { gsap, ScrollTrigger, reduced: boolean }` — every later GSAP-driven task consumes this context object ("ctx"). Also `prefersReducedMotion(mq?): boolean`, `hasSeenIntro(storage?): boolean`, `markIntroSeen(storage?): void`, `INTRO_SEEN_KEY = 'emcIntroSeen'`.

- [ ] **Step 1: Install GSAP**

Run: `npm install gsap`
Expected: `gsap` appears under `dependencies` in `package.json` (any 3.x version).

- [ ] **Step 2: Write the failing test**

Create `tests/motion.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  prefersReducedMotion,
  hasSeenIntro,
  markIntroSeen,
  INTRO_SEEN_KEY,
} from '../src/motion.js';

function fakeStorage(initial = {}) {
  const map = { ...initial };
  return {
    getItem: (k) => (k in map ? map[k] : null),
    setItem: (k, v) => { map[k] = String(v); },
  };
}

describe('prefersReducedMotion', () => {
  it('reads the reduce media query', () => {
    const mq = (q) => ({ matches: q === '(prefers-reduced-motion: reduce)' });
    expect(prefersReducedMotion(mq)).toBe(true);
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
  });
});

describe('session gate', () => {
  it('is unseen on fresh storage', () => {
    expect(hasSeenIntro(fakeStorage())).toBe(false);
  });

  it('is seen after markIntroSeen', () => {
    const s = fakeStorage();
    markIntroSeen(s);
    expect(s.getItem(INTRO_SEEN_KEY)).toBe('1');
    expect(hasSeenIntro(s)).toBe(true);
  });

  it('treats a throwing storage as already seen (fail-safe: no intro)', () => {
    const broken = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    };
    expect(hasSeenIntro(broken)).toBe(true);
    expect(() => markIntroSeen(broken)).not.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/motion.test.js`
Expected: FAIL — `Cannot find module '../src/motion.js'` (or equivalent resolve error).

- [ ] **Step 4: Write the implementation**

Create `src/motion.js`:

```js
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/motion.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Wire ctx into main.js**

Modify `src/main.js` — add the import and create ctx first inside the DOMContentLoaded handler (nothing consumes it yet; later tasks will):

```js
import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/hero.css';

import { initMotion } from './motion.js';
import { initNav } from './nav.js';
import { initReveals } from './reveals.js';
import { initTilt } from './tilt.js';
import { initCountUp } from './count-up.js';
import { initHeroCover } from './hero/cover.js';

document.addEventListener('DOMContentLoaded', () => {
  const ctx = initMotion();
  initNav();
  initReveals();
  initTilt();
  initCountUp();
  initHeroCover();
  void ctx; // consumed by later tasks
});
```

- [ ] **Step 7: Verify the whole suite and dev server**

Run: `npm test`
Expected: all tests pass (existing nav/reveals/count-up + new motion).
Run: `npm run dev` briefly, load http://localhost:5173/ — no console errors.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/motion.js tests/motion.test.js src/main.js
git commit -m "feat(motion): add GSAP foundation with reduced-motion and intro session gate"
```

---

### Task 2: Mask-text utility (`src/mask-text.js`)

Shared by the intro's "EMC" mask (Task 3) and the "40" mask (Task 6). SVG `clipPath` text referenced from CSS `clip-path: url(#id)` uses pixel coordinates of the clipped element, so a helper positions/sizes the `<text>` to the element's box.

**Files:**
- Create: `src/mask-text.js`
- Test: `tests/mask-text.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `positionMaskText(textEl, width, height, fontSize): void` (sets `x`, `y` attributes and `style.fontSize`), `introFontSize(w, h): number`, `fortyFontSize(w, h): number`.

- [ ] **Step 1: Write the failing test**

Create `tests/mask-text.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { positionMaskText, introFontSize, fortyFontSize } from '../src/mask-text.js';

describe('positionMaskText', () => {
  it('centers the text element and applies font size', () => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    positionMaskText(text, 1200, 800, 300);
    expect(text.getAttribute('x')).toBe('600');
    expect(text.getAttribute('y')).toBe('400');
    expect(text.style.fontSize).toBe('300px');
  });
});

describe('font sizing', () => {
  it('intro letters scale with viewport width, capped by height', () => {
    expect(introFontSize(1000, 1000)).toBe(280); // 0.28 * width
    expect(introFontSize(2000, 500)).toBe(250);  // capped at 0.5 * height
  });

  it('forty digits fill 70% of stage height', () => {
    expect(fortyFontSize(1200, 700)).toBe(490);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mask-text.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/mask-text.js`:

```js
export function positionMaskText(textEl, width, height, fontSize) {
  textEl.setAttribute('x', String(width / 2));
  textEl.setAttribute('y', String(height / 2));
  textEl.style.fontSize = `${fontSize}px`;
}

export function introFontSize(width, height) {
  return Math.min(width * 0.28, height * 0.5);
}

export function fortyFontSize(width, height) {
  return height * 0.7;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mask-text.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/mask-text.js tests/mask-text.test.js
git commit -m "feat(motion): add SVG mask-text positioning utility"
```

---

### Task 3: Opening sequence (intro → mask → hero)

**Files:**
- Create: `src/intro.js`, `src/styles/intro.css`
- Test: `tests/intro.test.js`
- Modify: `index.html` (intro markup + `html.js` guard), `src/main.js`

**Interfaces:**
- Consumes: ctx from `initMotion()` (Task 1); `hasSeenIntro`/`markIntroSeen` (Task 1); `positionMaskText`/`introFontSize` (Task 2).
- Produces: `initIntro(ctx): void`; pure helpers `shouldPlayIntro({ reduced, seen }): boolean`, `buildIntroTimeline(gsap, els, onDone): timeline`, `wireIntroSkip(target, onSkip): dispose`.

- [ ] **Step 1: Write the failing test**

Create `tests/intro.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { shouldPlayIntro, buildIntroTimeline, wireIntroSkip } from '../src/intro.js';

describe('shouldPlayIntro', () => {
  it('plays only when motion is allowed and intro is unseen', () => {
    expect(shouldPlayIntro({ reduced: false, seen: false })).toBe(true);
    expect(shouldPlayIntro({ reduced: true, seen: false })).toBe(false);
    expect(shouldPlayIntro({ reduced: false, seen: true })).toBe(false);
    expect(shouldPlayIntro({ reduced: true, seen: true })).toBe(false);
  });
});

function fakeGsap() {
  const calls = [];
  const tl = {
    fromTo: (...a) => { calls.push(['fromTo', ...a]); return tl; },
    to: (...a) => { calls.push(['to', ...a]); return tl; },
    progress: vi.fn(() => tl),
  };
  return {
    calls,
    timeline: vi.fn((opts) => { tl.opts = opts; return tl; }),
    set: vi.fn(),
  };
}

describe('buildIntroTimeline', () => {
  it('builds the four-phase timeline and wires completion', () => {
    const g = fakeGsap();
    const els = {
      root: {}, stage: {}, letters: {}, underline: {}, eyebrow: {}, heroItems: [{}],
    };
    const onDone = vi.fn();
    const tl = buildIntroTimeline(g, els, onDone);
    expect(g.timeline).toHaveBeenCalledOnce();
    expect(g.timeline.mock.calls[0][0].onComplete).toBe(onDone);
    // letters scale to 8 at the 1.6s handoff
    const scaleUp = g.calls.find(
      (c) => c[0] === 'to' && c[1] === els.letters && c[2].scale === 8
    );
    expect(scaleUp).toBeTruthy();
    expect(scaleUp[3]).toBe(1.6);
    // hero content staggers in at 2.2s
    const heroIn = g.calls.find((c) => c[0] === 'fromTo' && c[1] === els.heroItems);
    expect(heroIn[3].stagger).toBe(0.08);
    expect(heroIn[4]).toBe(2.2);
    expect(tl).toBeTruthy();
  });
});

describe('wireIntroSkip', () => {
  it('fires once for the first skip event then disposes', () => {
    const onSkip = vi.fn();
    wireIntroSkip(window, onSkip);
    window.dispatchEvent(new Event('wheel'));
    window.dispatchEvent(new Event('pointerdown'));
    window.dispatchEvent(new Event('keydown'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('returns a dispose that prevents any firing', () => {
    const onSkip = vi.fn();
    const dispose = wireIntroSkip(window, onSkip);
    dispose();
    window.dispatchEvent(new Event('pointerdown'));
    expect(onSkip).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/intro.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the intro module**

Create `src/intro.js`:

```js
import { hasSeenIntro, markIntroSeen } from './motion.js';
import { positionMaskText, introFontSize } from './mask-text.js';
import { wireVideoReady } from './video-ready.js';

const HERO_ITEMS = '.hero__eyebrow, .hero__brand, .hero__tagline, .hero__pillars, .hero__bottom';
const SKIP_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

export function shouldPlayIntro({ reduced, seen }) {
  return !reduced && !seen;
}

export function wireIntroSkip(target, onSkip) {
  let fired = false;
  const handler = () => {
    if (fired) return;
    fired = true;
    dispose();
    onSkip();
  };
  const dispose = () =>
    SKIP_EVENTS.forEach((e) => target.removeEventListener(e, handler));
  SKIP_EVENTS.forEach((e) => target.addEventListener(e, handler, { passive: true }));
  return dispose;
}

// Timeline phases (seconds): 0 letters+underline in · 0.8 breathe+eyebrow ·
// 1.6 letters scale 8x (mask expands past viewport) · 2.15 overlay fades ·
// 2.2 hero content staggers in.
export function buildIntroTimeline(gsap, els, onDone) {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: onDone });
  tl.fromTo(els.stage, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 0)
    .fromTo(els.underline, { scaleX: 0 }, { scaleX: 1, duration: 0.7 }, 0.15)
    .fromTo(els.letters, { scale: 1 }, { scale: 1.04, duration: 0.8, ease: 'sine.inOut' }, 0.8)
    .fromTo(els.eyebrow, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.9)
    .to(els.letters, { scale: 8, duration: 0.9, ease: 'power4.inOut' }, 1.6)
    .to([els.underline, els.eyebrow], { autoAlpha: 0, duration: 0.3 }, 1.6)
    .to(els.root, { autoAlpha: 0, duration: 0.45 }, 2.15)
    .fromTo(
      els.heroItems,
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 },
      2.2
    );
  return tl;
}

function sizeLetters(letters) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  positionMaskText(letters, w, h, introFontSize(w, h));
}

export function initIntro(ctx) {
  const root = document.getElementById('intro');
  if (!root) return;

  const finish = () => {
    root.classList.add('is-done');
    document.body.classList.remove('intro-lock');
  };

  if (!shouldPlayIntro({ reduced: ctx.reduced, seen: hasSeenIntro() })) {
    if (ctx.reduced) {
      finish();
    } else {
      // Repeat visit this session: quick 400ms fade instead of the full intro.
      ctx.gsap.to(root, { autoAlpha: 0, duration: 0.4, onComplete: finish });
    }
    return;
  }

  const els = {
    root,
    stage: root.querySelector('.intro__stage'),
    letters: root.querySelector('.intro__letters'),
    underline: root.querySelector('.intro__underline'),
    eyebrow: root.querySelector('.intro__eyebrow'),
    heroItems: document.querySelectorAll(HERO_ITEMS),
  };

  document.body.classList.add('intro-lock');
  markIntroSeen();
  wireVideoReady(root.querySelector('.intro__video'));
  sizeLetters(els.letters);
  const onResize = () => sizeLetters(els.letters);
  window.addEventListener('resize', onResize);

  ctx.gsap.set(els.letters, { transformOrigin: '50% 50%' });

  let disposeSkip = () => {};
  const tl = buildIntroTimeline(ctx.gsap, els, () => {
    disposeSkip();
    window.removeEventListener('resize', onResize);
    finish();
  });
  disposeSkip = wireIntroSkip(window, () => tl.progress(1));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/intro.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Add intro markup to index.html**

In `index.html`, add the `html.js` guard as the FIRST child of `<head>` (before `<meta charset>` is fine right after it — place it directly after the charset meta):

```html
<script>document.documentElement.classList.add('js');</script>
```

Then insert the intro overlay as the FIRST child of `<body>` (before the gradient `<svg>`):

```html
<div class="intro" id="intro" aria-hidden="true">
  <div class="intro__stage">
    <video class="intro__video" muted loop playsinline preload="auto"
           src="https://videos.pexels.com/video-files/31210326/13331991_2730_1440_24fps.mp4"></video>
  </div>
  <svg class="intro__svg" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="intro-clip">
        <text class="intro__letters" text-anchor="middle" dominant-baseline="central">EMC</text>
      </clipPath>
    </defs>
  </svg>
  <span class="intro__underline"></span>
  <span class="intro__eyebrow">Forty years powering live events</span>
</div>
```

- [ ] **Step 6: Add intro styles**

Create `src/styles/intro.css`:

```css
/* Intro only exists when JS runs; without JS it must never block the page. */
.intro { display: none; }

html.js .intro {
  display: block;
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--bg-deeper);
}

html.js .intro.is-done { display: none; }

body.intro-lock { overflow: hidden; }

.intro__stage {
  position: absolute;
  inset: 0;
  clip-path: url(#intro-clip);
  will-change: transform;
}

.intro__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.intro__svg {
  position: absolute;
  width: 0;
  height: 0;
}

.intro__letters {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.intro__underline {
  position: absolute;
  left: 50%;
  top: calc(50% + clamp(70px, 9vw, 130px));
  width: clamp(180px, 30vw, 420px);
  height: 2px;
  margin-left: calc(clamp(180px, 30vw, 420px) / -2);
  background: linear-gradient(90deg, var(--gold-1), var(--gold-2));
  transform: scaleX(0);
  transform-origin: left center;
}

.intro__eyebrow {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: calc(50% + clamp(90px, 11vw, 160px));
  font-size: 11px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--gold-deck);
  white-space: nowrap;
  opacity: 0;
}
```

- [ ] **Step 7: Wire into main.js**

Modify `src/main.js` — add the style import and init call:

```js
import './styles/intro.css';
```
(after the other style imports), and inside the handler, right after `initNav();`:

```js
initIntro(ctx);
```
with `import { initIntro } from './intro.js';` alongside the other imports. Remove the `void ctx;` line from Task 1.

- [ ] **Step 8: Verify in the browser**

Run: `npm test` — all pass.
Run: `npm run dev`, then in the browser:
1. Open http://localhost:5173/ in a fresh tab → full intro: video inside "EMC" letters, underline draws, eyebrow fades in, letters blow up past the viewport, hero content staggers in. Total ≈ 2.6s.
2. Reload → intro replaced by a quick 400ms fade (session gate).
3. Clear sessionStorage (`sessionStorage.clear()` in devtools), reload, immediately click → intro jumps straight to the finished hero.
4. In devtools, emulate `prefers-reduced-motion: reduce`, clear sessionStorage, reload → no intro at all, hero fully visible.

- [ ] **Step 9: Commit**

```bash
git add index.html src/intro.js src/styles/intro.css src/main.js tests/intro.test.js
git commit -m "feat(intro): cinematic masked-EMC opening sequence with session gate"
```

---

### Task 4: Reveal upgrade (GSAP staggers behind the same `data-reveal` API)

**Files:**
- Modify: `src/reveals.js`, `src/styles/base.css`, `src/main.js`
- Test: `tests/reveals.test.js` (add cases; existing `markVisible` test must keep passing)

**Interfaces:**
- Consumes: ctx from `initMotion()`.
- Produces: `initReveals(root = document, ctx = null)` — with ctx and motion allowed, reveals run as GSAP staggers; without ctx (sub-pages) behavior is byte-for-byte today's. New export `revealBatch(gsap, targets): void` and `REVEAL_TWEEN` config constant.

- [ ] **Step 1: Add failing tests**

Append to `tests/reveals.test.js`:

```js
import { vi } from 'vitest';
import { revealBatch, REVEAL_TWEEN } from '../src/reveals.js';

describe('revealBatch', () => {
  it('tweens targets from hidden to visible with a 60ms stagger', () => {
    document.body.innerHTML = '<div data-reveal id="a"></div><div data-reveal id="b"></div>';
    const targets = [document.getElementById('a'), document.getElementById('b')];
    const gsap = { fromTo: vi.fn() };
    revealBatch(gsap, targets);
    expect(gsap.fromTo).toHaveBeenCalledOnce();
    const [passed, from, to] = gsap.fromTo.mock.calls[0];
    expect(passed).toBe(targets);
    expect(from).toEqual(REVEAL_TWEEN.from);
    expect(to.stagger).toBe(0.06);
    // class still applied so CSS state machines stay coherent
    expect(targets[0].classList.contains('is-visible')).toBe(true);
    expect(targets[1].classList.contains('is-visible')).toBe(true);
  });

  it('does nothing for an empty batch', () => {
    const gsap = { fromTo: vi.fn() };
    revealBatch(gsap, []);
    expect(gsap.fromTo).not.toHaveBeenCalled();
  });
});
```

Note: the file already imports `describe/it/expect` — merge the `vi` import into the existing vitest import line.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/reveals.test.js`
Expected: FAIL — `revealBatch` is not exported. The original `markVisible` test still passes.

- [ ] **Step 3: Implement**

Replace `src/reveals.js` with:

```js
export function markVisible(entries) {
  for (const entry of entries) {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  }
}

export const REVEAL_TWEEN = {
  from: { autoAlpha: 0, y: 24, scale: 0.985 },
  to: { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out', stagger: 0.06, overwrite: true },
};

export function revealBatch(gsap, targets) {
  if (!targets.length) return;
  gsap.fromTo(targets, REVEAL_TWEEN.from, { ...REVEAL_TWEEN.to });
  targets.forEach((el) => el.classList.add('is-visible'));
}

export function initReveals(root = document, ctx = null) {
  const els = root.querySelectorAll('[data-reveal]');
  if (!els.length) return;
  const gsapMode = !!(ctx && ctx.gsap && !ctx.reduced);
  if (gsapMode) document.documentElement.classList.add('gsap-motion');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (gsapMode) {
        revealBatch(ctx.gsap, entries.filter((e) => e.isIntersecting).map((e) => e.target));
      } else {
        markVisible(entries);
      }
      entries.forEach((e) => e.isIntersecting && io.unobserve(e.target));
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
  );
  els.forEach((el) => io.observe(el));
}
```

- [ ] **Step 4: Neutralize the CSS transition under GSAP control**

In `src/styles/base.css`, after the `[data-reveal].is-visible` rule, add:

```css
/* When GSAP drives reveals, the CSS transition must not double-ease. */
.gsap-motion [data-reveal] {
  transition: none;
}
```

- [ ] **Step 5: Pass ctx from main.js**

In `src/main.js`, change `initReveals();` to `initReveals(document, ctx);`.

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: PASS — including the untouched original `markVisible` test.

- [ ] **Step 7: Verify in the browser**

`npm run dev` → homepage: scrolling down, cards and section headers rise in with slight scale drift and visible 60ms offsets between siblings. Sub-page check: open http://localhost:5173/what-we-do.html → reveals still work (legacy path, no console errors).

- [ ] **Step 8: Commit**

```bash
git add src/reveals.js src/styles/base.css src/main.js tests/reveals.test.js
git commit -m "feat(reveals): GSAP stagger reveals behind unchanged data-reveal API"
```

---

### Task 5: Ambient scroll — hero z-space parallax + section curtains (`src/parallax.js`)

**Files:**
- Create: `src/parallax.js`
- Test: `tests/parallax.test.js`
- Modify: `src/styles/sections.css` (curtain styles), `src/main.js`

**Interfaces:**
- Consumes: ctx from `initMotion()`.
- Produces: `initHeroParallax(ctx): void`, `initCurtains(ctx): void`; pure helpers `HERO_PARALLAX: Array<[selector, tweenVars]>`, `CURTAIN_SECTIONS: string[]`, `buildCurtain(section): HTMLElement`.
- Note: `.hero__embers` (the canvas from Task 10) does not exist yet — the layer map tolerates missing elements, so this task works before and after Task 10.

- [ ] **Step 1: Write the failing test**

Create `tests/parallax.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import {
  HERO_PARALLAX,
  CURTAIN_SECTIONS,
  buildCurtain,
  initHeroParallax,
} from '../src/parallax.js';

describe('HERO_PARALLAX layer map', () => {
  it('moves headline faster than embers and scales the video', () => {
    const bySel = Object.fromEntries(HERO_PARALLAX);
    expect(bySel['.hero__video'].scale).toBeGreaterThan(1);
    expect(bySel['.hero__headline'].y).toBe(-60);
    expect(bySel['.hero__embers'].y).toBe(-20);
  });
});

describe('CURTAIN_SECTIONS', () => {
  it('covers the four homepage sections', () => {
    expect(CURTAIN_SECTIONS).toEqual(['.partners', '#what-we-do', '#industry-leader', '.intake']);
  });
});

describe('buildCurtain', () => {
  it('prepends an aria-hidden curtain overlay', () => {
    document.body.innerHTML = '<section id="s"><p>content</p></section>';
    const section = document.getElementById('s');
    const curtain = buildCurtain(section);
    expect(section.firstChild).toBe(curtain);
    expect(curtain.className).toBe('curtain');
    expect(curtain.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('initHeroParallax', () => {
  it('does nothing when reduced motion is set', () => {
    document.body.innerHTML = '<section class="hero"><video class="hero__video"></video></section>';
    const gsap = { to: vi.fn() };
    initHeroParallax({ gsap, reduced: true });
    expect(gsap.to).not.toHaveBeenCalled();
  });

  it('creates one scrubbed tween per present layer', () => {
    document.body.innerHTML = `
      <section class="hero">
        <video class="hero__video"></video>
        <div class="hero__headline"></div>
      </section>`;
    const gsap = { to: vi.fn() };
    initHeroParallax({ gsap, reduced: false });
    // .hero__embers absent -> only 2 tweens
    expect(gsap.to).toHaveBeenCalledTimes(2);
    const vars = gsap.to.mock.calls[0][1];
    expect(vars.ease).toBe('none');
    expect(vars.scrollTrigger.scrub).toBe(true);
    expect(vars.scrollTrigger.start).toBe('top top');
    expect(vars.scrollTrigger.end).toBe('bottom top');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/parallax.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/parallax.js`:

```js
// Hero z-space: as the hero scrolls away, layers separate in depth.
// Values are the "fully scrolled away" end state, scrubbed with scroll.
export const HERO_PARALLAX = [
  ['.hero__video', { scale: 1.12, filter: 'blur(5px)' }],
  ['.hero__headline', { y: -60 }],
  ['.hero__embers', { y: -20 }],
];

export const CURTAIN_SECTIONS = ['.partners', '#what-we-do', '#industry-leader', '.intake'];

export function buildCurtain(section) {
  const curtain = document.createElement('div');
  curtain.className = 'curtain';
  curtain.setAttribute('aria-hidden', 'true');
  section.prepend(curtain);
  return curtain;
}

export function initHeroParallax(ctx) {
  if (!ctx || ctx.reduced) return;
  const hero = document.querySelector('.hero');
  if (!hero) return;
  for (const [sel, to] of HERO_PARALLAX) {
    const el = hero.querySelector(sel);
    if (!el) continue;
    ctx.gsap.to(el, {
      ...to,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
  }
}

export function initCurtains(ctx) {
  if (!ctx || ctx.reduced) return;
  for (const sel of CURTAIN_SECTIONS) {
    const section = document.querySelector(sel);
    if (!section) continue;
    section.classList.add('has-curtain');
    const curtain = buildCurtain(section);
    ctx.gsap.to(curtain, {
      scaleY: 0,
      duration: 0.9,
      ease: 'power2.inOut',
      scrollTrigger: { trigger: section, start: 'top 70%', once: true },
    });
  }
}
```

- [ ] **Step 4: Add curtain styles**

Append to `src/styles/sections.css`:

```css
/* Section curtain reveals (ambient scroll system) */
.has-curtain {
  position: relative;
  overflow: hidden;
}

.curtain {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: var(--bg-deeper);
  transform-origin: top center;
  pointer-events: none;
  will-change: transform;
}
```

- [ ] **Step 5: Wire into main.js**

In `src/main.js` add `import { initHeroParallax, initCurtains } from './parallax.js';` and, after `initReveals(document, ctx);`:

```js
initHeroParallax(ctx);
initCurtains(ctx);
```

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Verify in the browser**

`npm run dev` → scroll slowly away from the hero: video swells + blurs slightly, headline exits faster than the background. Each section below enters behind a dark curtain that lifts upward once. Reduced-motion emulation → none of this occurs.

- [ ] **Step 8: Commit**

```bash
git add src/parallax.js tests/parallax.test.js src/styles/sections.css src/main.js
git commit -m "feat(scroll): hero z-space parallax and section curtain reveals"
```

---

### Task 6: Pinned "40 Years" scrub scene (`src/pinned-forty.js`)

Replaces the time-based count-up. `count-up.js` and its test are deleted (verified: only the homepage used it).

**Files:**
- Create: `src/pinned-forty.js`, `src/styles/forty.css`
- Test: `tests/pinned-forty.test.js`
- Modify: `index.html` (rework `#industry-leader`), `src/main.js`
- Delete: `src/count-up.js`, `tests/count-up.test.js`

**Interfaces:**
- Consumes: ctx from `initMotion()`; `positionMaskText`/`fortyFontSize` (Task 2); `wireVideoReady` (existing).
- Produces: `initPinnedForty(ctx): void`; pure helpers `scrubToCount(progress, target = 40): number`, `captionIndex(progress, count = 4): number`, `applyFortyProgress(progress, digitsEl, captionEls): void`.

- [ ] **Step 1: Write the failing test**

Create `tests/pinned-forty.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { scrubToCount, captionIndex, applyFortyProgress } from '../src/pinned-forty.js';

describe('scrubToCount', () => {
  it('maps scroll progress to 0..40', () => {
    expect(scrubToCount(0)).toBe(0);
    expect(scrubToCount(0.5)).toBe(20);
    expect(scrubToCount(1)).toBe(40);
  });

  it('clamps out-of-range progress', () => {
    expect(scrubToCount(-0.2)).toBe(0);
    expect(scrubToCount(1.7)).toBe(40);
  });
});

describe('captionIndex', () => {
  it('cycles four captions across progress quarters', () => {
    expect(captionIndex(0)).toBe(0);
    expect(captionIndex(0.24)).toBe(0);
    expect(captionIndex(0.26)).toBe(1);
    expect(captionIndex(0.51)).toBe(2);
    expect(captionIndex(0.76)).toBe(3);
    expect(captionIndex(1)).toBe(3);
  });
});

describe('applyFortyProgress', () => {
  it('writes the count and activates exactly one caption', () => {
    document.body.innerHTML = `
      <div id="d">0</div>
      <p class="forty__caption">a</p><p class="forty__caption">b</p>
      <p class="forty__caption">c</p><p class="forty__caption">d</p>`;
    const digits = document.getElementById('d');
    const captions = [...document.querySelectorAll('.forty__caption')];
    applyFortyProgress(0.6, digits, captions);
    expect(digits.textContent).toBe('24');
    expect(captions.map((c) => c.classList.contains('is-active'))).toEqual([
      false, false, true, false,
    ]);
  });
});

describe('initPinnedForty reduced-motion branch', () => {
  it('renders the final static state without touching GSAP', () => {
    document.body.innerHTML = `
      <div data-forty>
        <div class="forty__digits">0</div>
        <p class="forty__caption">a</p><p class="forty__caption">b</p>
      </div>`;
    initPinnedForty({ reduced: true, gsap: null, ScrollTrigger: null });
    expect(document.querySelector('.forty__digits').textContent).toBe('40');
    const captions = [...document.querySelectorAll('.forty__caption')];
    expect(captions.every((c) => c.classList.contains('is-active'))).toBe(true);
  });
});
```

The import line for this file must also include `initPinnedForty`:

```js
import { scrubToCount, captionIndex, applyFortyProgress, initPinnedForty } from '../src/pinned-forty.js';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pinned-forty.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

Create `src/pinned-forty.js`:

```js
import { positionMaskText, fortyFontSize } from './mask-text.js';
import { wireVideoReady } from './video-ready.js';

export function scrubToCount(progress, target = 40) {
  const p = Math.max(0, Math.min(1, progress));
  return Math.round(p * target);
}

export function captionIndex(progress, count = 4) {
  const p = Math.max(0, Math.min(1, progress));
  return Math.min(Math.floor(p * count), count - 1);
}

export function applyFortyProgress(progress, digitsEl, captionEls) {
  digitsEl.textContent = String(scrubToCount(progress));
  const idx = captionIndex(progress, captionEls.length);
  captionEls.forEach((c, i) => c.classList.toggle('is-active', i === idx));
}

function sizeDigits(root, digits) {
  const stage = root.querySelector('.forty__mask-stage');
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  positionMaskText(digits, w, h, fortyFontSize(w, h));
}

export function initPinnedForty(ctx) {
  const root = document.querySelector('[data-forty]');
  if (!root) return;
  const digits = root.querySelector('.forty__digits');
  const captions = [...root.querySelectorAll('.forty__caption')];

  const staticFinal = () => {
    digits.textContent = '40';
    captions.forEach((c) => c.classList.add('is-active'));
  };

  if (!ctx || ctx.reduced) {
    staticFinal();
    return;
  }

  wireVideoReady(root.querySelector('.forty__video'));
  sizeDigits(root, digits);
  window.addEventListener('resize', () => sizeDigits(root, digits));

  const mm = ctx.gsap.matchMedia();

  // Desktop: pin for 1.5 viewport-heights; scrub is lerp-smoothed (scrub: 1).
  mm.add('(min-width: 769px)', () => {
    const state = { p: 0 };
    const tween = ctx.gsap.to(state, {
      p: 1,
      ease: 'none',
      onUpdate: () => applyFortyProgress(state.p, digits, captions),
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: '+=150%',
        pin: true,
        scrub: 1,
      },
    });
    return () => tween.scrollTrigger && tween.scrollTrigger.kill();
  });

  // Mobile: no pin. Count once on entry, captions all visible (stacked).
  mm.add('(max-width: 768px)', () => {
    captions.forEach((c) => c.classList.add('is-active'));
    const state = { v: 0 };
    const st = ctx.ScrollTrigger.create({
      trigger: root,
      start: 'top 70%',
      once: true,
      onEnter: () =>
        ctx.gsap.to(state, {
          v: 40,
          duration: 1.4,
          ease: 'power3.out',
          onUpdate: () => { digits.textContent = String(Math.round(state.v)); },
        }),
    });
    return () => st.kill();
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pinned-forty.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Rework the section markup**

In `index.html`, replace the entire `#industry-leader` section (currently the `container leader` grid with `leader__num`/`data-countup`) with:

```html
<section class="section" id="industry-leader" aria-labelledby="leader-title">
  <div class="forty" data-forty>
    <div class="container forty__stage">
      <div class="forty__num" role="img" aria-label="40 years in entertainment">
        <div class="forty__mask-stage">
          <video class="forty__video" muted loop playsinline preload="metadata"
                 src="https://videos.pexels.com/video-files/33945522/14403884_2560_1440_60fps.mp4"></video>
        </div>
        <svg class="forty__svg" aria-hidden="true" focusable="false">
          <defs>
            <clipPath id="forty-clip">
              <text class="forty__digits" text-anchor="middle" dominant-baseline="central">0</text>
            </clipPath>
          </defs>
        </svg>
        <div class="forty__num-caption" aria-hidden="true">Years in entertainment</div>
      </div>
      <div class="forty__body">
        <span class="eyebrow">Industry Leader</span>
        <h2 id="leader-title">We've been in your shoes.</h2>
        <ul class="forty__captions">
          <li class="forty__caption">Small-town fairs</li>
          <li class="forty__caption">Multi-day festivals</li>
          <li class="forty__caption">Theme parks</li>
          <li class="forty__caption">Sports venues</li>
        </ul>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 6: Add the styles**

Create `src/styles/forty.css`:

```css
.forty {
  min-height: 100vh;
  display: flex;
  align-items: center;
}

.forty__stage {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 56px;
  align-items: center;
}

.forty__num { position: relative; }

.forty__mask-stage {
  position: relative;
  height: min(56vh, 480px);
  clip-path: url(#forty-clip);
}

.forty__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  transition: opacity 1.2s ease;
  background: #05070f;
}
.forty__video.is-ready { opacity: 1; }

.forty__svg { position: absolute; width: 0; height: 0; }

.forty__digits {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-weight: 800;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.forty__num-caption {
  font-size: var(--fs-12);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-top: 16px;
}

.forty__body h2 { margin: 12px 0 24px; }

.forty__captions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.forty__caption {
  font-size: var(--fs-22);
  font-weight: 600;
  color: var(--text-dim);
  opacity: 0.35;
  transform: translateX(0);
  transition: opacity 350ms var(--ease), color 350ms var(--ease), transform 350ms var(--ease);
}

.forty__caption.is-active {
  opacity: 1;
  color: var(--gold-1);
  transform: translateX(6px);
}

@media (max-width: 768px) {
  .forty { min-height: 0; }
  .forty__stage { grid-template-columns: 1fr; gap: 24px; }
  .forty__mask-stage { height: 36vh; }
}

@media (prefers-reduced-motion: reduce) {
  .forty__video { display: none; }
  .forty__mask-stage {
    clip-path: none;
    height: auto;
  }
  /* Fallback rendering: plain gold "40" via the digits' text is not visible
     without the mask, so show a static gradient number instead. */
  .forty__mask-stage::after {
    content: '40';
    font-size: var(--fs-96);
    font-weight: 800;
    letter-spacing: -0.04em;
    background: linear-gradient(135deg, var(--gold-1), var(--gold-2));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    display: block;
    line-height: 1;
  }
}
```

- [ ] **Step 7: Remove count-up and wire the new module**

1. Delete `src/count-up.js` and `tests/count-up.test.js` (`git rm src/count-up.js tests/count-up.test.js`).
2. In `src/main.js`: remove the `initCountUp` import and call; add `import { initPinnedForty } from './pinned-forty.js';`, `import './styles/forty.css';`, and call `initPinnedForty(ctx);` after `initCurtains(ctx);`.

- [ ] **Step 8: Run all tests**

Run: `npm test`
Expected: PASS — count-up tests gone, pinned-forty tests green, everything else untouched.

- [ ] **Step 9: Verify in the browser**

`npm run dev` →
1. Desktop: scrolling into Industry Leader pins the section; the giant footage-filled digits scrub 0→40 with weighted smoothing; captions light up one at a time (fairs → festivals → theme parks → sports venues); section releases after ~1.5 viewport-heights.
2. Narrow window (≤768px): no pinning; digits count to 40 once when the section enters; all four captions visible.
3. Reduced motion: static "40", all captions shown.

- [ ] **Step 10: Commit**

```bash
git add index.html src/pinned-forty.js src/styles/forty.css src/main.js tests/pinned-forty.test.js
git rm src/count-up.js tests/count-up.test.js
git commit -m "feat(forty): pinned scroll-scrubbed 40-years scene with masked footage digits"
```

---

### Task 7: Hotspot hover cards (`src/hotspot.js`, replaces tilt)

**Files:**
- Create: `src/hotspot.js`
- Test: `tests/hotspot.test.js`
- Modify: `index.html` (`data-tilt` → `data-hotspot` on the four cards), `src/styles/sections.css`, `src/main.js`
- Delete: `src/tilt.js`

**Interfaces:**
- Consumes: nothing (no GSAP — CSS variables + pointer events).
- Produces: `initHotspot(root = document): void`; pure helper `pointerVars(rect, clientX, clientY): { x, y }` (percentages 0–100).

- [ ] **Step 1: Write the failing test**

Create `tests/hotspot.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { pointerVars } from '../src/hotspot.js';

describe('pointerVars', () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };

  it('maps the pointer to percentage coordinates inside the card', () => {
    expect(pointerVars(rect, 100, 50)).toEqual({ x: 0, y: 0 });
    expect(pointerVars(rect, 200, 100)).toEqual({ x: 50, y: 50 });
    expect(pointerVars(rect, 300, 150)).toEqual({ x: 100, y: 100 });
  });

  it('does not clamp — the glow may trail just outside during exit', () => {
    expect(pointerVars(rect, 320, 160).x).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/hotspot.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/hotspot.js`:

```js
export function pointerVars(rect, clientX, clientY) {
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
}

export function initHotspot(root = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(hover: none)').matches) return;
  root.querySelectorAll('[data-hotspot]').forEach((card) => {
    card.addEventListener('pointermove', (ev) => {
      const { x, y } = pointerVars(card.getBoundingClientRect(), ev.clientX, ev.clientY);
      card.style.setProperty('--hx', `${x}%`);
      card.style.setProperty('--hy', `${y}%`);
    });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/hotspot.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Swap markup, styles, and wiring**

1. `index.html`: change all four `<article class="card" data-tilt data-reveal>` to `<article class="card" data-hotspot data-reveal>`.
2. `git rm src/tilt.js`.
3. `src/main.js`: remove the `initTilt` import/call; add `import { initHotspot } from './hotspot.js';` and `initHotspot();`.
4. In `src/styles/sections.css`, extend the card styles — after the existing `.card:hover` rule add:

```css
.card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    240px circle at var(--hx, 50%) var(--hy, 50%),
    rgba(255, 214, 107, 0.10),
    transparent 65%
  );
  opacity: 0;
  transition: opacity 300ms var(--ease);
}

.card:hover::after { opacity: 1; }
```

Also remove the now-unneeded tilt artifacts from `.card`: delete the `transform-style: preserve-3d;` and `will-change: transform;` lines and drop `transform 250ms var(--ease)` from its transition list.

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Verify in the browser**

`npm run dev` → hover the What We Do cards: a soft gold glow tracks the cursor, border still lights up. No tilt remains. Touch emulation: no glow handlers.

- [ ] **Step 8: Commit**

```bash
git add index.html src/hotspot.js tests/hotspot.test.js src/styles/sections.css src/main.js
git rm src/tilt.js
git commit -m "feat(cards): cursor-tracking hotspot glow replaces tilt"
```

---

### Task 8: Magnetic buttons (`src/magnetic.js`)

**Files:**
- Create: `src/magnetic.js`
- Test: `tests/magnetic.test.js`
- Modify: `index.html` (add `data-magnetic` to the two CTAs), `src/main.js`

**Interfaces:**
- Consumes: ctx from `initMotion()` (uses `ctx.gsap.to` for the spring).
- Produces: `initMagnetic(ctx, root = document): void`; pure helper `magneticOffset(rect, clientX, clientY, opts?): { x, y } | null` — null when the pointer is beyond the 60px attraction radius.

- [ ] **Step 1: Write the failing test**

Create `tests/magnetic.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { magneticOffset } from '../src/magnetic.js';

describe('magneticOffset', () => {
  // Button: 100x40 centered at (200, 100)
  const rect = { left: 150, top: 80, width: 100, height: 40 };

  it('returns zero offset at the button center', () => {
    expect(magneticOffset(rect, 200, 100)).toEqual({ x: 0, y: 0 });
  });

  it('pulls toward the pointer inside the field', () => {
    const o = magneticOffset(rect, 240, 110);
    expect(o.x).toBeGreaterThan(0);
    expect(o.y).toBeGreaterThan(0);
    expect(o.x).toBeLessThanOrEqual(8);
    expect(o.y).toBeLessThanOrEqual(8);
  });

  it('never exceeds the max shift', () => {
    const o = magneticOffset(rect, 259, 139); // near the field edge
    expect(Math.abs(o.x)).toBeLessThanOrEqual(8);
    expect(Math.abs(o.y)).toBeLessThanOrEqual(8);
  });

  it('returns null beyond the 60px radius', () => {
    expect(magneticOffset(rect, 400, 100)).toBeNull(); // 150px past right edge
    expect(magneticOffset(rect, 200, 250)).toBeNull(); // 130px below bottom edge
  });

  it('honors custom radius and shift', () => {
    expect(magneticOffset(rect, 320, 100, { radius: 10, maxShift: 4 })).toBeNull();
    const o = magneticOffset(rect, 210, 100, { radius: 10, maxShift: 4 });
    expect(Math.abs(o.x)).toBeLessThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/magnetic.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/magnetic.js`:

```js
export function magneticOffset(rect, clientX, clientY, { radius = 60, maxShift = 8 } = {}) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  // Distance from the button's edge (0 when inside the button).
  const edgeDist = Math.max(Math.abs(dx) - halfW, Math.abs(dy) - halfH, 0);
  if (edgeDist > radius) return null;
  const nx = Math.max(-1, Math.min(1, dx / (halfW + radius)));
  const ny = Math.max(-1, Math.min(1, dy / (halfH + radius)));
  return { x: nx * maxShift, y: ny * maxShift };
}

export function initMagnetic(ctx, root = document) {
  if (!ctx || ctx.reduced) return;
  if (matchMedia('(hover: none)').matches) return;
  const buttons = [...root.querySelectorAll('[data-magnetic]')];
  if (!buttons.length) return;

  const attached = new Set();
  let ticking = false;
  let lastEvent = null;

  const update = () => {
    ticking = false;
    for (const btn of buttons) {
      const offset = magneticOffset(
        btn.getBoundingClientRect(),
        lastEvent.clientX,
        lastEvent.clientY
      );
      if (offset) {
        attached.add(btn);
        ctx.gsap.to(btn, { x: offset.x, y: offset.y, duration: 0.3, ease: 'power3.out' });
      } else if (attached.has(btn)) {
        attached.delete(btn);
        ctx.gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' });
      }
    }
  };

  document.addEventListener('mousemove', (ev) => {
    lastEvent = ev;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/magnetic.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Mark the CTAs and wire up**

1. `index.html`: add `data-magnetic` to the nav CTA (`<a class="btn btn-primary site-nav__cta" ...>`) and the intake CTA (`<a class="btn btn-primary" href="/contact.html">Start an Event Intake</a>`).
2. `src/main.js`: add `import { initMagnetic } from './magnetic.js';` and `initMagnetic(ctx);`.

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Verify in the browser**

`npm run dev` → move the cursor near either gold CTA: it leans toward the cursor (≤8px) and springs back elastically when the cursor leaves the 60px field. Touch emulation / reduced motion: inert.

- [ ] **Step 8: Commit**

```bash
git add index.html src/magnetic.js tests/magnetic.test.js src/main.js
git commit -m "feat(cta): magnetic pull with elastic release on primary buttons"
```

---

### Task 9: Partner logo marquee (`src/marquee.js`)

**Files:**
- Create: `src/marquee.js`
- Test: `tests/marquee.test.js`
- Modify: `index.html` (drop `data-reveal` from partner names), `src/styles/sections.css`, `src/main.js`

**Interfaces:**
- Consumes: nothing (CSS animation; JS only builds the track).
- Produces: `initMarquee(): void`; pure helper `buildMarqueeTrack(row, copies = 2): HTMLElement` — restructures the row into `.partners__track` holding two identical `.partners__group` halves (each `copies ×` the original names; second half `aria-hidden`), enabling a seamless `translateX(-50%)` loop.

- [ ] **Step 1: Write the failing test**

Create `tests/marquee.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildMarqueeTrack } from '../src/marquee.js';

function row() {
  document.body.innerHTML = `
    <div class="partners__row">
      <span class="partners__name">Circle K</span>
      <span class="partners__name">Walgreens</span>
      <span class="partners__name">Menards</span>
    </div>`;
  return document.querySelector('.partners__row');
}

describe('buildMarqueeTrack', () => {
  it('builds two identical halves for a seamless -50% loop', () => {
    const track = buildMarqueeTrack(row());
    const groups = track.querySelectorAll('.partners__group');
    expect(groups).toHaveLength(2);
    // copies=2 -> each half holds 6 names
    expect(groups[0].querySelectorAll('.partners__name')).toHaveLength(6);
    expect(groups[1].querySelectorAll('.partners__name')).toHaveLength(6);
    expect(groups[0].textContent).toBe(groups[1].textContent);
  });

  it('hides the duplicate half from assistive tech', () => {
    const track = buildMarqueeTrack(row());
    const groups = track.querySelectorAll('.partners__group');
    expect(groups[0].hasAttribute('aria-hidden')).toBe(false);
    expect(groups[1].getAttribute('aria-hidden')).toBe('true');
  });

  it('leaves the row containing only the track', () => {
    const r = row();
    const track = buildMarqueeTrack(r);
    expect(r.children).toHaveLength(1);
    expect(r.firstChild).toBe(track);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/marquee.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/marquee.js`:

```js
export function buildMarqueeTrack(row, copies = 2) {
  const names = [...row.children];
  const track = document.createElement('div');
  track.className = 'partners__track';
  for (let half = 0; half < 2; half++) {
    const group = document.createElement('div');
    group.className = 'partners__group';
    if (half === 1) group.setAttribute('aria-hidden', 'true');
    for (let c = 0; c < copies; c++) {
      for (const name of names) {
        group.appendChild(half === 0 && c === 0 ? name : name.cloneNode(true));
      }
    }
    track.appendChild(group);
  }
  row.textContent = '';
  row.appendChild(track);
  return track;
}

export function initMarquee() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const row = document.querySelector('.partners__row');
  if (!row) return;
  row.classList.add('partners__row--marquee');
  buildMarqueeTrack(row);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/marquee.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Markup, styles, wiring**

1. `index.html`: remove `data-reveal` from the three `partners__name` spans (a reveal tween fighting a moving marquee looks broken).
2. Append to `src/styles/sections.css`:

```css
/* Partner marquee */
.partners__row--marquee {
  justify-content: flex-start;
  flex-wrap: nowrap;
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
}

.partners__track {
  display: flex;
  width: max-content;
  animation: partners-marquee 30s linear infinite;
}

.partners__track:hover { animation-play-state: paused; }

.partners__group {
  display: flex;
  gap: clamp(32px, 8vw, 96px);
  padding-right: clamp(32px, 8vw, 96px);
}

@keyframes partners-marquee {
  to { transform: translateX(-50%); }
}
```

3. Change the existing `.partners__name:hover` rule to a gold tint:

```css
.partners__name:hover { color: var(--gold-1); opacity: 1; }
```

4. `src/main.js`: add `import { initMarquee } from './marquee.js';` and `initMarquee();`.

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Verify in the browser**

`npm run dev` → the Retail Partners strip glides continuously right-to-left with soft edge fades, pauses on hover, names tint gold under the cursor. Reduced motion: static centered row exactly as before.

- [ ] **Step 8: Commit**

```bash
git add index.html src/marquee.js tests/marquee.test.js src/styles/sections.css src/main.js
git commit -m "feat(partners): seamless infinite marquee with hover pause"
```

---

### Task 10: Ember particles (`src/particles.js`, replaces static stars)

**Files:**
- Create: `src/particles.js`
- Test: `tests/particles.test.js`
- Modify: `index.html` (stars div → canvas), `src/styles/hero.css`, `src/hero/cover.js`, `src/main.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `initEmbers(): void`; pure helpers `EMBER_COUNT = 40`, `createEmber(rand?): ember`, `stepEmber(ember, dt): ember` (normalized 0–1 coords, wraps at edges), `emberAlpha(ember): number` (0.25–0.8 twinkle).

- [ ] **Step 1: Write the failing test**

Create `tests/particles.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { EMBER_COUNT, createEmber, stepEmber, emberAlpha } from '../src/particles.js';

describe('createEmber', () => {
  it('spawns inside the sky band with upward drift', () => {
    const p = createEmber(() => 0.5);
    expect(p.x).toBe(0.5);
    expect(p.y).toBeLessThanOrEqual(0.85);
    expect(p.vy).toBeLessThan(0); // drifts upward
    expect(p.r).toBeGreaterThan(0);
  });

  it('exposes the spec count', () => {
    expect(EMBER_COUNT).toBe(40);
  });
});

describe('stepEmber', () => {
  it('advances position by velocity * dt', () => {
    const p = { x: 0.5, y: 0.5, vx: 0.1, vy: -0.1, phase: 0, twinkle: 3, r: 1 };
    stepEmber(p, 0.1);
    expect(p.x).toBeCloseTo(0.51);
    expect(p.y).toBeCloseTo(0.49);
    expect(p.phase).toBeCloseTo(0.1 / 3);
  });

  it('wraps vertically and horizontally', () => {
    const up = { x: 0.5, y: -0.03, vx: 0, vy: 0, phase: 0, twinkle: 3, r: 1 };
    stepEmber(up, 0);
    expect(up.y).toBe(1.02);
    const right = { x: 1.03, y: 0.5, vx: 0, vy: 0, phase: 0, twinkle: 3, r: 1 };
    stepEmber(right, 0);
    expect(right.x).toBe(-0.02);
  });
});

describe('emberAlpha', () => {
  it('stays within the visible twinkle band', () => {
    for (const phase of [0, 0.25, 0.5, 0.75, 1, 2.3]) {
      const a = emberAlpha({ phase });
      expect(a).toBeGreaterThanOrEqual(0.25);
      expect(a).toBeLessThanOrEqual(0.8);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/particles.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/particles.js`:

```js
export const EMBER_COUNT = 40;
const GOLD = ['255, 214, 107', '255, 156, 61', '255, 200, 120'];

export function createEmber(rand = Math.random) {
  return {
    x: rand(),
    y: rand() * 0.85, // keep the horizon band clear
    r: 0.6 + rand() * 1.6,
    vx: (rand() - 0.5) * 0.012,
    vy: -(0.004 + rand() * 0.01),
    phase: rand() * Math.PI * 2,
    twinkle: 2 + rand() * 3,
    tint: GOLD[Math.floor(rand() * GOLD.length) % GOLD.length],
  };
}

export function stepEmber(p, dt) {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.phase += dt / p.twinkle;
  if (p.y < -0.02) p.y = 1.02;
  if (p.x < -0.02) p.x = 1.02;
  else if (p.x > 1.02) p.x = -0.02;
  return p;
}

export function emberAlpha(p) {
  return 0.25 + 0.275 * (1 + Math.sin(p.phase * Math.PI * 2));
}

export function initEmbers() {
  const canvas = document.querySelector('.hero__embers');
  const hero = document.querySelector('.hero');
  if (!canvas || !hero) return;
  const ctx2d = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const embers = Array.from({ length: EMBER_COUNT }, () => createEmber());

  let w = 0;
  let h = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const draw = () => {
    ctx2d.clearRect(0, 0, w, h);
    for (const p of embers) {
      ctx2d.beginPath();
      ctx2d.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
      ctx2d.fillStyle = `rgba(${p.tint}, ${emberAlpha(p)})`;
      ctx2d.fill();
    }
  };

  if (reduced) {
    draw(); // single static frame
    return;
  }

  let running = true;
  let rafId = 0;
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    for (const p of embers) stepEmber(p, dt);
    draw();
    if (running) rafId = requestAnimationFrame(loop);
  };

  const setRunning = (on) => {
    if (on && !running) {
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(loop);
    } else if (!on && running) {
      running = false;
      cancelAnimationFrame(rafId);
    }
  };

  // Pause while the hero is off-screen or the tab is hidden. (If a hidden-tab
  // resume happens while scrolled down, the IntersectionObserver re-pauses on
  // the next frame — one wasted rAF at most.)
  new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting)).observe(hero);
  document.addEventListener('visibilitychange', () => setRunning(!document.hidden));

  rafId = requestAnimationFrame(loop);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/particles.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Swap the stars layer**

1. `index.html`: replace `<div class="hero__stars" aria-hidden="true"></div>` with `<canvas class="hero__embers" aria-hidden="true"></canvas>`.
2. `src/hero/cover.js`: remove `seedStars`, `STAR_COUNT`, and the stars query — the file becomes:

```js
import { wireVideoReady } from '../video-ready.js';

export function initHeroCover() {
  const video = document.querySelector('.hero__video');
  if (video) wireVideoReady(video);
}
```

3. `src/styles/hero.css`: replace the `.hero__stars` block (selector, `span` rules, and the `hero-twinkle` keyframes) with:

```css
.hero__embers {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
```

and in the `prefers-reduced-motion` block at the bottom of the file, replace the `.hero__stars span,` line so it reads:

```css
@media (prefers-reduced-motion: reduce) {
  .hero__scroll-cue::after { animation: none; }
  .hero__video { display: none; }
}
```

4. `src/main.js`: add `import { initEmbers } from './particles.js';` and call `initEmbers();` before `initHeroCover();`.

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Verify in the browser**

`npm run dev` → hero sky shows ~40 softly twinkling gold embers drifting upward, wrapping at edges. Scroll the hero out of view → devtools performance shows the rAF loop stops. Reduced motion: one static faint frame.

- [ ] **Step 8: Commit**

```bash
git add index.html src/particles.js tests/particles.test.js src/styles/hero.css src/hero/cover.js src/main.js
git commit -m "feat(hero): drifting ember particle canvas replaces static stars"
```

---

### Task 11: Final QA sweep

**Files:**
- Modify: only if fixes are needed.

Final `src/main.js` for reference (end state after all tasks):

```js
import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/hero.css';
import './styles/intro.css';
import './styles/forty.css';

import { initMotion } from './motion.js';
import { initNav } from './nav.js';
import { initIntro } from './intro.js';
import { initReveals } from './reveals.js';
import { initHeroParallax, initCurtains } from './parallax.js';
import { initPinnedForty } from './pinned-forty.js';
import { initHotspot } from './hotspot.js';
import { initMagnetic } from './magnetic.js';
import { initMarquee } from './marquee.js';
import { initEmbers } from './particles.js';
import { initHeroCover } from './hero/cover.js';

document.addEventListener('DOMContentLoaded', () => {
  const ctx = initMotion();
  initNav();
  initIntro(ctx);
  initReveals(document, ctx);
  initHeroParallax(ctx);
  initCurtains(ctx);
  initPinnedForty(ctx);
  initHotspot();
  initMagnetic(ctx);
  initMarquee();
  initEmbers();
  initHeroCover();
});
```

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: PASS — motion, mask-text, intro, reveals, parallax, pinned-forty, hotspot, magnetic, marquee, particles, nav. No count-up test.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: clean build, no warnings about missing modules. Then `npm run preview` and load the preview URL — full experience works in the built output.

- [ ] **Step 3: Behavior matrix (manual, in the browser)**

| Check | Expected |
|---|---|
| Fresh session, desktop | Full intro → hero stagger; parallax; curtains; pinned 40 scrub; captions cycle; hotspot/magnetic/marquee/embers all live |
| Reload (same session) | No intro — 400ms fade only |
| Skip via scroll/click/key mid-intro | Jumps to finished hero, page scrollable, flag set |
| `prefers-reduced-motion: reduce` + cleared session | No intro, no parallax/curtains/pin; static gold "40", all captions lit; static marquee row; one static ember frame |
| ≤768px viewport | No pin; count-to-40 once on section entry; captions stacked; no hotspot/magnetic handlers |
| Sub-pages (what-we-do, sell-*, contact) | Identical to before this work — reveals fire, videos play, zero console errors |
| Keyboard | Tab order unaffected by intro after it finishes; focus rings intact |

- [ ] **Step 4: Performance spot-check**

Chrome devtools → Performance: record a scroll from hero to footer. Expected: no long tasks > 50ms attributable to our modules during steady scroll; scrubbing the 40 scene stays smooth. Lighthouse (desktop): Performance ≥ 90.

- [ ] **Step 5: Commit any QA fixes**

```bash
git add -A
git commit -m "fix(effects): QA polish pass across intro, scroll, and micro-interactions"
```
(Skip if nothing changed.)
