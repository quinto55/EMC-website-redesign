# EMC Tickets Website Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the six-page static prototype defined in `docs/superpowers/specs/2026-05-19-emc-website-redesign-design.md` — modern, dark/gold marketing site for EMC Tickets with a WebGL "ticket constellation" hero, shared nav/footer, and four sub-pages — runnable via `npm run dev` and shippable via `npm run build`.

**Architecture:** Vite multi-page static site (one HTML per route). Vanilla ES modules. Three.js for the hero; small vanilla helpers for nav scroll, count-up, reveals, and tilt. CSS organized by tokens → base → sections → hero. Self-hosted variable font. Tests with Vitest + happy-dom for the few pieces of pure logic (count-up math, scroll threshold, position generators). Visual / WebGL output verified by running the dev server in a browser, since asserting on three.js scenes is brittle.

**Tech Stack:** Vite 5, three.js, Vitest (+ happy-dom) for unit tests, plain JS + CSS, Inter Tight variable font.

---

## Decisions locked in for spec §9 open questions

1. **Service icons:** custom inline SVGs, each a geometric primitive filled with the gold gradient (defined as `<linearGradient>` once in `index.html` and referenced via `url(#gold-grad)`). No icon library.
2. **Partner logos:** lightweight text wordmarks ("CIRCLE K", "WALGREENS", "MENARDS") set in the same variable font, monochrome `var(--text-dim)`, letter-spaced. Avoids trademark / extraction risk and stays on-palette.
3. **Font:** Inter Tight variable font, self-hosted from `public/fonts/InterTight-VariableFont_wght.ttf` (download once at install time).
4. **Sell sub-pages:** typographic only — no 3-step diagrams. YAGNI.

## File layout this plan produces

```
emc-redesign/
├─ index.html
├─ what-we-do.html
├─ sell-onsite.html
├─ sell-online.html
├─ sell-social.html
├─ contact.html
├─ vite.config.js
├─ package.json
├─ vitest.config.js
├─ public/
│  ├─ logo.svg
│  ├─ favicon.svg
│  └─ fonts/InterTight-VariableFont_wght.ttf
├─ src/
│  ├─ main.js
│  ├─ nav.js
│  ├─ reveals.js
│  ├─ count-up.js
│  ├─ tilt.js
│  ├─ hero/
│  │  ├─ constellation.js
│  │  ├─ ticket.js
│  │  ├─ positions.js
│  │  ├─ featured-labels.js
│  │  └─ post.js
│  ├─ motifs/
│  │  └─ rotating-ticket.js
│  └─ styles/
│     ├─ tokens.css
│     ├─ base.css
│     ├─ sections.css
│     └─ hero.css
└─ tests/
   ├─ count-up.test.js
   ├─ nav.test.js
   ├─ reveals.test.js
   └─ positions.test.js
```

Shared header/footer markup is duplicated across the six HTML files (the spec accepts this at this scale). All behaviour lives in `src/`.

---

## Phase 0 — Project skeleton

### Task 1: Initialize npm project, install dependencies, write Vite + Vitest config

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `vitest.config.js`
- Modify: `.gitignore`

- [ ] **Step 1: Create `package.json`**

Write `package.json`:

```json
{
  "name": "emc-redesign",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "three": "^0.160.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^1.2.0",
    "happy-dom": "^13.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: creates `node_modules/` and `package-lock.json` without errors.

- [ ] **Step 3: Create `vite.config.js`**

Write `vite.config.js`:

```js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        whatWeDo: resolve(__dirname, 'what-we-do.html'),
        sellOnsite: resolve(__dirname, 'sell-onsite.html'),
        sellOnline: resolve(__dirname, 'sell-online.html'),
        sellSocial: resolve(__dirname, 'sell-social.html'),
        contact: resolve(__dirname, 'contact.html'),
      },
    },
  },
});
```

- [ ] **Step 4: Create `vitest.config.js`**

Write `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.js'],
  },
});
```

- [ ] **Step 5: Update `.gitignore`**

Append to `.gitignore` (after reading it first to preserve any existing contents):

```
node_modules/
dist/
.vite/
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.js vitest.config.js .gitignore
git commit -m "chore: init Vite + Vitest scaffolding"
```

---

### Task 2: Add design tokens, base styles, font, logo, favicon

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Create: `public/logo.svg`
- Create: `public/favicon.svg`
- Create: `public/fonts/InterTight-VariableFont_wght.ttf`

- [ ] **Step 1: Download the Inter Tight variable font**

Run (from repo root):

```bash
mkdir -p public/fonts
curl -L -o public/fonts/InterTight-VariableFont_wght.ttf \
  "https://github.com/google/fonts/raw/main/ofl/intertight/InterTight%5Bwght%5D.ttf"
```

Expected: a ~280 KB file at `public/fonts/InterTight-VariableFont_wght.ttf`. If the URL fails, manually grab the file from https://fonts.google.com/specimen/Inter+Tight and place it at the same path.

- [ ] **Step 2: Create `public/logo.svg`**

Write `public/logo.svg` (a simple gold-gradient EMC wordmark — replaceable later):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" role="img" aria-label="EMC Tickets">
  <defs>
    <linearGradient id="logoGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffd66b"/>
      <stop offset="100%" stop-color="#ff9c3d"/>
    </linearGradient>
  </defs>
  <text x="0" y="23" font-family="Inter Tight, system-ui, sans-serif"
        font-weight="800" font-size="22" letter-spacing="1" fill="url(#logoGold)">EMC</text>
  <text x="48" y="23" font-family="Inter Tight, system-ui, sans-serif"
        font-weight="500" font-size="14" letter-spacing="2" fill="#f1f3f8">TICKETS</text>
</svg>
```

- [ ] **Step 3: Create `public/favicon.svg`**

Write `public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="favGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffd66b"/>
      <stop offset="100%" stop-color="#ff9c3d"/>
    </linearGradient>
  </defs>
  <rect x="3" y="9" width="26" height="14" rx="3" fill="url(#favGold)"/>
  <circle cx="16" cy="16" r="2" fill="#07090f"/>
</svg>
```

- [ ] **Step 4: Create `src/styles/tokens.css`**

Write `src/styles/tokens.css`:

```css
@font-face {
  font-family: 'Inter Tight';
  src: url('/fonts/InterTight-VariableFont_wght.ttf') format('truetype-variations');
  font-weight: 100 900;
  font-display: swap;
}

:root {
  --bg: #07090f;
  --bg-elev: #0e1224;
  --bg-deeper: #04060c;
  --text: #f1f3f8;
  --text-muted: #b8c1d8;
  --text-dim: #7a8295;
  --gold-1: #ffd66b;
  --gold-2: #ff9c3d;
  --accent-glow: rgba(255, 170, 80, 0.35);
  --border: rgba(255, 255, 255, 0.08);

  --fs-12: 12px;
  --fs-14: 14px;
  --fs-16: 16px;
  --fs-18: 18px;
  --fs-22: 22px;
  --fs-28: 28px;
  --fs-40: 40px;
  --fs-64: 64px;
  --fs-96: 96px;

  --container: 1200px;
  --gutter: clamp(20px, 4vw, 40px);
  --radius-card: 12px;
  --radius-pill: 999px;

  --ease: cubic-bezier(0.22, 0.61, 0.36, 1);
}

@media (max-width: 768px) {
  :root {
    --fs-96: 64px;
    --fs-64: 40px;
    --fs-40: 28px;
    --fs-28: 22px;
  }
}
```

- [ ] **Step 5: Create `src/styles/base.css`**

Write `src/styles/base.css`:

```css
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }

html {
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter Tight', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  font-size: var(--fs-16);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

body { min-height: 100vh; }

img, svg { display: block; max-width: 100%; }

a { color: inherit; text-decoration: none; }

button { font: inherit; cursor: pointer; border: 0; background: none; color: inherit; }

h1, h2, h3, h4 { margin: 0; font-weight: 700; letter-spacing: -0.01em; }
h1 { font-size: var(--fs-64); line-height: 1.05; }
h2 { font-size: var(--fs-40); line-height: 1.1; }
h3 { font-size: var(--fs-22); line-height: 1.25; }
p { margin: 0; color: var(--text-muted); }

.container {
  width: 100%;
  max-width: var(--container);
  margin: 0 auto;
  padding-inline: var(--gutter);
}

.eyebrow {
  font-size: var(--fs-12);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--gold-1);
  font-weight: 600;
}

.gold-text {
  background: linear-gradient(135deg, var(--gold-1), var(--gold-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  border-radius: var(--radius-pill);
  font-weight: 600;
  font-size: var(--fs-16);
  transition: transform 200ms var(--ease), box-shadow 200ms var(--ease);
}
.btn:hover { transform: translateY(-1px); }

.btn-primary {
  background: linear-gradient(135deg, var(--gold-1), var(--gold-2));
  color: #1a1206;
  box-shadow: 0 6px 24px var(--accent-glow);
}
.btn-primary:hover { box-shadow: 0 10px 32px var(--accent-glow); }

.btn-ghost {
  border: 1px solid var(--border);
  color: var(--text);
}
.btn-ghost:hover { border-color: var(--gold-1); color: var(--gold-1); }

/* Visually-hidden, but focusable */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Reveal-on-scroll default */
[data-reveal] {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 700ms var(--ease), transform 700ms var(--ease);
}
[data-reveal].is-visible {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
  [data-reveal] { opacity: 1; transform: none; }
}
```

- [ ] **Step 6: Commit**

```bash
git add public/ src/styles/tokens.css src/styles/base.css
git commit -m "chore: add tokens, base styles, font, logo"
```

---

## Phase 1 — Shared shell (nav, footer, scroll behavior)

### Task 3: Build the nav (markup + styles)

**Files:**
- Create: `src/styles/sections.css`

The nav HTML markup will be duplicated into each of the 6 HTML files later — we author it in this task as a reference block we'll copy from.

- [ ] **Step 1: Create `src/styles/sections.css` (nav rules only for now)**

Write `src/styles/sections.css`:

```css
.site-nav {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 18px var(--gutter);
  transition: background 300ms var(--ease), backdrop-filter 300ms var(--ease), border-color 300ms var(--ease);
  border-bottom: 1px solid transparent;
}

.site-nav.is-scrolled {
  background: rgba(7, 9, 15, 0.7);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border-bottom-color: var(--border);
}

.site-nav__brand img { height: 28px; }

.site-nav__links {
  display: flex;
  align-items: center;
  gap: 24px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.site-nav__links a {
  font-size: var(--fs-14);
  color: var(--text-muted);
  transition: color 200ms var(--ease);
}

.site-nav__links a:hover,
.site-nav__links a.is-active {
  color: var(--text);
}

.site-nav__cta { font-size: var(--fs-14); padding: 10px 18px; }

@media (max-width: 900px) {
  .site-nav__links { display: none; }
}
```

- [ ] **Step 2: Reference nav HTML block (do not write to a file yet — this block will be pasted into each page in later tasks)**

Reference markup the engineer will paste into each page's `<body>`:

```html
<header>
  <nav class="site-nav" aria-label="Primary">
    <a class="site-nav__brand" href="/index.html"><img src="/logo.svg" alt="EMC Tickets"></a>
    <ul class="site-nav__links">
      <li><a href="/index.html#industry-leader">Industry Leader</a></li>
      <li><a href="/what-we-do.html">What We Do</a></li>
      <li><a href="/sell-onsite.html">Sell Onsite</a></li>
      <li><a href="/sell-online.html">Sell Online</a></li>
      <li><a href="/sell-social.html">Sell Social</a></li>
      <li><a href="/contact.html">Contact</a></li>
    </ul>
    <a class="btn btn-primary site-nav__cta" href="/contact.html">Event Intake</a>
  </nav>
</header>
```

(No commit yet — the nav has nowhere to render. Task 4 will add the footer, then Task 7 creates `index.html` and we commit the whole shell.)

---

### Task 4: Footer (styles + reference markup)

**Files:**
- Modify: `src/styles/sections.css`

- [ ] **Step 1: Append footer styles to `src/styles/sections.css`**

Append the following to the end of `src/styles/sections.css`:

```css
.site-footer {
  background: var(--bg-deeper);
  border-top: 1px solid var(--border);
  padding: 64px 0 32px;
}

.site-footer__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  margin-bottom: 48px;
}

.site-footer__col h4 {
  font-size: var(--fs-14);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 12px;
}

.site-footer__col p,
.site-footer__col a {
  color: var(--text-muted);
  font-size: var(--fs-16);
  line-height: 1.7;
}

.site-footer__col a:hover { color: var(--gold-1); }

.site-footer__col ul { list-style: none; padding: 0; margin: 0; }

.site-footer__legal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  color: var(--text-dim);
  font-size: var(--fs-12);
}

@media (max-width: 768px) {
  .site-footer__grid { grid-template-columns: 1fr; gap: 28px; }
  .site-footer__legal { flex-direction: column; gap: 12px; }
}
```

- [ ] **Step 2: Reference footer HTML (will be pasted into each page later)**

Reference markup:

```html
<footer class="site-footer">
  <div class="container">
    <div class="site-footer__grid">
      <div class="site-footer__col">
        <h4>Office</h4>
        <p>8409 Land O Lakes Blvd<br>Land O Lakes, FL 34638</p>
      </div>
      <div class="site-footer__col">
        <h4>Phone</h4>
        <p>
          <a href="tel:+18133899530">(813) 389-9530</a><br>
          24/7 Toll Free <a href="tel:+18002902090">(800) 290-2090</a>
        </p>
      </div>
      <div class="site-footer__col">
        <h4>More</h4>
        <ul>
          <li><a href="/contact.html">Contact</a></li>
          <li><a href="/what-we-do.html">What We Do</a></li>
        </ul>
      </div>
    </div>
    <div class="site-footer__legal">
      <span>&copy; EMC Tickets</span>
      <span>Land O Lakes, Florida</span>
    </div>
  </div>
</footer>
```

(Still no commit — combined with Task 7 below.)

---

### Task 5: Nav scroll behavior (TDD)

**Files:**
- Create: `tests/nav.test.js`
- Create: `src/nav.js`

- [ ] **Step 1: Write the failing test**

Write `tests/nav.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { applyNavScrollState, setNavActiveLink } from '../src/nav.js';

describe('applyNavScrollState', () => {
  let nav;
  beforeEach(() => {
    document.body.innerHTML = '<nav class="site-nav"></nav>';
    nav = document.querySelector('.site-nav');
  });

  it('adds is-scrolled when scrollY exceeds threshold', () => {
    applyNavScrollState(nav, 100, 80);
    expect(nav.classList.contains('is-scrolled')).toBe(true);
  });

  it('removes is-scrolled when scrollY is below threshold', () => {
    nav.classList.add('is-scrolled');
    applyNavScrollState(nav, 40, 80);
    expect(nav.classList.contains('is-scrolled')).toBe(false);
  });
});

describe('setNavActiveLink', () => {
  it('marks the link whose href matches the current path as active', () => {
    document.body.innerHTML = `
      <nav class="site-nav">
        <a href="/index.html">Home</a>
        <a href="/what-we-do.html">What</a>
      </nav>
    `;
    setNavActiveLink(document.querySelector('.site-nav'), '/what-we-do.html');
    const links = document.querySelectorAll('.site-nav a');
    expect(links[0].classList.contains('is-active')).toBe(false);
    expect(links[1].classList.contains('is-active')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `../src/nav.js`.

- [ ] **Step 3: Implement `src/nav.js`**

Write `src/nav.js`:

```js
export function applyNavScrollState(nav, scrollY, threshold) {
  if (scrollY > threshold) nav.classList.add('is-scrolled');
  else nav.classList.remove('is-scrolled');
}

export function setNavActiveLink(nav, pathname) {
  const normalize = (p) => (p === '/' ? '/index.html' : p);
  const target = normalize(pathname);
  nav.querySelectorAll('a').forEach((a) => {
    const href = new URL(a.getAttribute('href'), 'http://x').pathname;
    a.classList.toggle('is-active', normalize(href) === target);
  });
}

export function initNav() {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;
  const threshold = Math.max(80, window.innerHeight * 0.8);
  applyNavScrollState(nav, window.scrollY, threshold);
  window.addEventListener(
    'scroll',
    () => applyNavScrollState(nav, window.scrollY, threshold),
    { passive: true }
  );
  setNavActiveLink(nav, window.location.pathname);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS for both tests in `nav.test.js`.

- [ ] **Step 5: Commit**

```bash
git add src/nav.js tests/nav.test.js
git commit -m "feat(nav): scroll-state + active-link helpers with tests"
```

---

### Task 6: Reveals-on-scroll helper (TDD)

**Files:**
- Create: `tests/reveals.test.js`
- Create: `src/reveals.js`

- [ ] **Step 1: Write the failing test**

Write `tests/reveals.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { markVisible } from '../src/reveals.js';

describe('markVisible', () => {
  it('toggles is-visible on intersecting entries', () => {
    document.body.innerHTML = `
      <div data-reveal id="a"></div>
      <div data-reveal id="b"></div>
    `;
    const a = document.getElementById('a');
    const b = document.getElementById('b');
    markVisible([
      { target: a, isIntersecting: true },
      { target: b, isIntersecting: false },
    ]);
    expect(a.classList.contains('is-visible')).toBe(true);
    expect(b.classList.contains('is-visible')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/reveals.js`**

Write `src/reveals.js`:

```js
export function markVisible(entries) {
  for (const entry of entries) {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  }
}

export function initReveals(root = document) {
  const els = root.querySelectorAll('[data-reveal]');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      markVisible(entries);
      entries.forEach((e) => e.isIntersecting && io.unobserve(e.target));
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
  );
  els.forEach((el) => io.observe(el));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/reveals.js tests/reveals.test.js
git commit -m "feat(reveals): IntersectionObserver-based reveal helper"
```

---

## Phase 2 — Home page (everything except the WebGL hero)

### Task 7: Create `index.html` skeleton + wire `main.js` so the dev server runs

**Files:**
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/styles/hero.css`
- Create: `src/styles/sections.css` (extend)

- [ ] **Step 1: Create `src/styles/hero.css` (overlay placeholder, real canvas in Phase 3)**

Write `src/styles/hero.css`:

```css
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  background:
    radial-gradient(60% 80% at 70% 30%, rgba(255,170,80,0.10), transparent 70%),
    radial-gradient(60% 80% at 20% 80%, rgba(255,214,107,0.06), transparent 70%),
    var(--bg);
}

.hero__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* labels and DOM controls handle pointer events */
}

.hero__overlay {
  position: relative;
  z-index: 2;
  width: 100%;
}

.hero__inner { max-width: 720px; }

.hero__eyebrow {
  display: inline-block;
  margin-bottom: 20px;
}

.hero__title {
  font-size: var(--fs-96);
  line-height: 1;
  letter-spacing: -0.02em;
  margin-bottom: 22px;
}

.hero__title span { display: block; }

.hero__sub {
  font-size: var(--fs-18);
  color: var(--text-muted);
  max-width: 56ch;
  margin-bottom: 32px;
}

.hero__ctas { display: flex; flex-wrap: wrap; gap: 14px; }

.hero__labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}

.hero__label {
  position: absolute;
  transform: translate(-50%, -120%);
  pointer-events: auto;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  background: rgba(7, 9, 15, 0.72);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: var(--fs-12);
  letter-spacing: 0.06em;
  opacity: 0;
  transition: opacity 200ms var(--ease), transform 200ms var(--ease);
  white-space: nowrap;
}

.hero__label.is-visible {
  opacity: 1;
  transform: translate(-50%, -140%);
}
```

- [ ] **Step 2: Extend `src/styles/sections.css` with section spacing utility**

Append to `src/styles/sections.css`:

```css
.section { padding: 96px 0; }
.section--tight { padding: 64px 0; }

@media (max-width: 768px) {
  .section { padding: 64px 0; }
  .section--tight { padding: 40px 0; }
}
```

- [ ] **Step 3: Create `src/main.js`**

Write `src/main.js`:

```js
import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/hero.css';

import { initNav } from './nav.js';
import { initReveals } from './reveals.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveals();
});
```

- [ ] **Step 4: Create `index.html` (no hero canvas yet — placeholder background)**

Write `index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EMC Tickets — One-stop ticket sale management</title>
  <meta name="description" content="40 years powering festivals, fairs, theme parks and sports venues across the country.">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <script type="module" src="/src/main.js"></script>
</head>
<body>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffd66b"/>
        <stop offset="100%" stop-color="#ff9c3d"/>
      </linearGradient>
    </defs>
  </svg>

  <header>
    <nav class="site-nav" aria-label="Primary">
      <a class="site-nav__brand" href="/index.html"><img src="/logo.svg" alt="EMC Tickets"></a>
      <ul class="site-nav__links">
        <li><a href="/index.html#industry-leader">Industry Leader</a></li>
        <li><a href="/what-we-do.html">What We Do</a></li>
        <li><a href="/sell-onsite.html">Sell Onsite</a></li>
        <li><a href="/sell-online.html">Sell Online</a></li>
        <li><a href="/sell-social.html">Sell Social</a></li>
        <li><a href="/contact.html">Contact</a></li>
      </ul>
      <a class="btn btn-primary site-nav__cta" href="/contact.html">Event Intake</a>
    </nav>
  </header>

  <main>
    <section class="hero" aria-labelledby="hero-title">
      <canvas class="hero__canvas" aria-hidden="true"></canvas>
      <div class="hero__overlay container">
        <div class="hero__inner">
          <span class="eyebrow hero__eyebrow">Sales · Scanning · Marketing · Advertising</span>
          <h1 class="hero__title" id="hero-title">
            <span>One-stop</span>
            <span class="gold-text">ticket sale management.</span>
          </h1>
          <p class="hero__sub">40 years powering festivals, fairs, theme parks and sports venues across the country.</p>
          <div class="hero__ctas">
            <a class="btn btn-primary" href="/contact.html">Start an Event Intake</a>
            <a class="btn btn-ghost" href="#what-we-do">See what we do</a>
          </div>
        </div>
      </div>
      <div class="hero__labels" aria-hidden="true"></div>
      <ul class="sr-only" aria-label="Service portals">
        <li><a href="/sell-onsite.html" data-portal="festivals">Festivals — see how we sell</a></li>
        <li><a href="/sell-onsite.html" data-portal="fairs">Fairs — see how we sell</a></li>
        <li><a href="/sell-onsite.html" data-portal="theme-parks">Theme parks — see how we sell</a></li>
        <li><a href="/sell-onsite.html" data-portal="sports">Sports — see how we sell</a></li>
        <li><a href="/sell-onsite.html" data-portal="box-office">Box office — see how we sell</a></li>
      </ul>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="site-footer__grid">
        <div class="site-footer__col">
          <h4>Office</h4>
          <p>8409 Land O Lakes Blvd<br>Land O Lakes, FL 34638</p>
        </div>
        <div class="site-footer__col">
          <h4>Phone</h4>
          <p>
            <a href="tel:+18133899530">(813) 389-9530</a><br>
            24/7 Toll Free <a href="tel:+18002902090">(800) 290-2090</a>
          </p>
        </div>
        <div class="site-footer__col">
          <h4>More</h4>
          <ul>
            <li><a href="/contact.html">Contact</a></li>
            <li><a href="/what-we-do.html">What We Do</a></li>
          </ul>
        </div>
      </div>
      <div class="site-footer__legal">
        <span>&copy; EMC Tickets</span>
        <span>Land O Lakes, Florida</span>
      </div>
    </div>
  </footer>
</body>
</html>
```

- [ ] **Step 5: Smoke-test the dev server**

Run: `npm run dev`
Expected: prints a local URL (typically `http://localhost:5173/`). Open it — the nav and footer render, hero overlay text and CTAs are visible against the radial-gradient placeholder, no console errors. Stop the server with Ctrl-C.

- [ ] **Step 6: Commit**

```bash
git add index.html src/main.js src/styles/hero.css src/styles/sections.css
git commit -m "feat(home): wire shell, hero overlay, nav, footer"
```

---

### Task 8: Retail partner strip

**Files:**
- Modify: `index.html`
- Modify: `src/styles/sections.css`

- [ ] **Step 1: Append partner-strip styles to `src/styles/sections.css`**

```css
.partners {
  background: linear-gradient(180deg, transparent, rgba(255,255,255,0.02) 50%, transparent);
  border-block: 1px solid var(--border);
  padding: 28px 0;
}

.partners__caption {
  text-align: center;
  font-size: var(--fs-12);
  letter-spacing: 0.24em;
  color: var(--text-dim);
  text-transform: uppercase;
  margin-bottom: 16px;
}

.partners__row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: clamp(32px, 8vw, 96px);
  flex-wrap: wrap;
}

.partners__name {
  font-weight: 700;
  letter-spacing: 0.16em;
  font-size: var(--fs-18);
  color: var(--text-dim);
  text-transform: uppercase;
  opacity: 0.85;
  transition: color 200ms var(--ease), opacity 200ms var(--ease);
}

.partners__name:hover { color: var(--text-muted); opacity: 1; }
```

- [ ] **Step 2: Insert partner section into `index.html` immediately after the closing `</section>` of the hero (before the previous footer)**

Insert this block:

```html
<section class="partners" aria-label="Retail partners">
  <div class="container">
    <p class="partners__caption">Retail Partners</p>
    <div class="partners__row">
      <span class="partners__name" data-reveal>Circle K</span>
      <span class="partners__name" data-reveal>Walgreens</span>
      <span class="partners__name" data-reveal>Menards</span>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Manual verify**

Run: `npm run dev`. Confirm the strip renders below the hero with three uppercase wordmarks, on-palette, and they fade in on scroll. Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add index.html src/styles/sections.css
git commit -m "feat(home): retail partner strip"
```

---

### Task 9: "What We Do" 4-card grid + cursor-tracked tilt

**Files:**
- Modify: `index.html`
- Modify: `src/styles/sections.css`
- Create: `src/tilt.js`
- Modify: `src/main.js`

- [ ] **Step 1: Append card styles to `src/styles/sections.css`**

```css
.what-we-do__head {
  text-align: center;
  margin-bottom: 56px;
}
.what-we-do__head p {
  max-width: 56ch;
  margin: 18px auto 0;
}

.cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.card {
  position: relative;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 28px;
  transition: border-color 250ms var(--ease), box-shadow 250ms var(--ease), transform 250ms var(--ease);
  transform-style: preserve-3d;
  will-change: transform;
}

.card:hover {
  border-color: rgba(255, 214, 107, 0.35);
  box-shadow: 0 20px 60px -30px var(--accent-glow);
}

.card__icon {
  width: 40px;
  height: 40px;
  margin-bottom: 18px;
}

.card__title {
  font-size: var(--fs-22);
  margin-bottom: 8px;
}

.card__body { font-size: var(--fs-16); }

@media (max-width: 768px) {
  .cards { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Create `src/tilt.js`**

Write `src/tilt.js`:

```js
const MAX_DEG = 6;

function onMove(card, ev) {
  const rect = card.getBoundingClientRect();
  const x = (ev.clientX - rect.left) / rect.width - 0.5;
  const y = (ev.clientY - rect.top) / rect.height - 0.5;
  const rx = -y * MAX_DEG;
  const ry = x * MAX_DEG;
  card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
}

function onLeave(card) {
  card.style.transform = '';
}

export function initTilt(root = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(hover: none)').matches) return;
  root.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('mousemove', (ev) => onMove(card, ev));
    card.addEventListener('mouseleave', () => onLeave(card));
  });
}
```

- [ ] **Step 3: Wire tilt in `src/main.js`**

Edit `src/main.js`. Replace its contents with:

```js
import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/hero.css';

import { initNav } from './nav.js';
import { initReveals } from './reveals.js';
import { initTilt } from './tilt.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveals();
  initTilt();
});
```

- [ ] **Step 4: Insert the "What We Do" section into `index.html` immediately after the partners section**

```html
<section class="section" id="what-we-do" aria-labelledby="wwd-title">
  <div class="container">
    <header class="what-we-do__head" data-reveal>
      <span class="eyebrow">What We Do</span>
      <h2 id="wwd-title">A complete ticket operation, run by a team that's done it for forty years.</h2>
      <p>Sales, scanning, marketing, advertising — one continuous loop for festivals, fairs, theme parks, and sports venues.</p>
    </header>

    <div class="cards">
      <article class="card" data-tilt data-reveal>
        <svg class="card__icon" viewBox="0 0 40 40" aria-hidden="true">
          <rect x="4" y="12" width="32" height="16" rx="3" fill="url(#gold-grad)"/>
          <circle cx="20" cy="20" r="2.4" fill="var(--bg)"/>
        </svg>
        <h3 class="card__title">Presale &amp; Advance</h3>
        <p class="card__body">Online, mobile, retail, and box-office channels in one inventory.</p>
      </article>

      <article class="card" data-tilt data-reveal>
        <svg class="card__icon" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M8 30 L20 8 L32 30 Z" fill="url(#gold-grad)"/>
        </svg>
        <h3 class="card__title">Marketing &amp; Ads</h3>
        <p class="card__body">Media buying, promotions, radio, TV, billboards, web, social.</p>
      </article>

      <article class="card" data-tilt data-reveal>
        <svg class="card__icon" viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="14" fill="none" stroke="url(#gold-grad)" stroke-width="4"/>
          <path d="M13 21 L18 26 L28 14" fill="none" stroke="url(#gold-grad)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3 class="card__title">Redemption &amp; Gate</h3>
        <p class="card__body">Fast scanning hardware with friendly UX guests don't fight.</p>
      </article>

      <article class="card" data-tilt data-reveal>
        <svg class="card__icon" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M8 10 H32 V26 H22 L14 32 V26 H8 Z" fill="url(#gold-grad)"/>
        </svg>
        <h3 class="card__title">Social Management</h3>
        <p class="card__body">Professional posting and guest engagement across channels.</p>
      </article>
    </div>
  </div>
</section>
```

- [ ] **Step 5: Manual verify**

Run: `npm run dev`. Confirm: cards render in a 2×2 grid (1-col on narrow), each tilts smoothly toward the cursor, gold-bordered hover glow visible, all four icons render. Stop server.

- [ ] **Step 6: Commit**

```bash
git add src/tilt.js src/main.js src/styles/sections.css index.html
git commit -m "feat(home): What We Do cards + cursor tilt"
```

---

### Task 10: Industry Leader — 40 count-up (TDD on the math)

**Files:**
- Create: `tests/count-up.test.js`
- Create: `src/count-up.js`
- Modify: `src/main.js`
- Modify: `src/styles/sections.css`
- Modify: `index.html`

- [ ] **Step 1: Write the failing test**

Write `tests/count-up.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { easeOutCubic, computeFrameValue } from '../src/count-up.js';

describe('easeOutCubic', () => {
  it('is 0 at t=0', () => expect(easeOutCubic(0)).toBe(0));
  it('is 1 at t=1', () => expect(easeOutCubic(1)).toBe(1));
  it('is monotonic-increasing between 0 and 1', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(easeOutCubic(0.25));
    expect(easeOutCubic(0.75)).toBeGreaterThan(easeOutCubic(0.5));
  });
});

describe('computeFrameValue', () => {
  it('returns target at full progress', () => {
    expect(computeFrameValue(0, 40, 1)).toBe(40);
  });
  it('returns start at zero progress', () => {
    expect(computeFrameValue(0, 40, 0)).toBe(0);
  });
  it('returns an integer mid-flight', () => {
    const v = computeFrameValue(0, 40, 0.5);
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(40);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/count-up.js`**

Write `src/count-up.js`:

```js
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export function computeFrameValue(start, target, progress) {
  const p = Math.max(0, Math.min(1, progress));
  return Math.round(start + (target - start) * easeOutCubic(p));
}

export function runCountUp(el, target, duration = 1600) {
  const start = 0;
  const startTime = performance.now();
  function frame(now) {
    const progress = (now - startTime) / duration;
    el.textContent = String(computeFrameValue(start, target, progress));
    if (progress < 1) requestAnimationFrame(frame);
    else el.textContent = String(target);
  }
  requestAnimationFrame(frame);
}

export function initCountUp(root = document) {
  const els = root.querySelectorAll('[data-countup]');
  if (!els.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach((el) => (el.textContent = el.dataset.countup));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const target = parseInt(e.target.dataset.countup, 10);
        runCountUp(e.target, target);
        io.unobserve(e.target);
      }
    },
    { threshold: 0.5 }
  );
  els.forEach((el) => io.observe(el));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS for all count-up tests.

- [ ] **Step 5: Wire into `src/main.js`**

Edit `src/main.js`. Add the import and call:

```js
import { initCountUp } from './count-up.js';
```

Add `initCountUp();` inside the `DOMContentLoaded` handler.

- [ ] **Step 6: Append section styles**

Append to `src/styles/sections.css`:

```css
.leader {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 56px;
  align-items: center;
}

.leader__num {
  font-size: var(--fs-96);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--gold-1), var(--gold-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-variant-numeric: tabular-nums;
}

.leader__caption {
  font-size: var(--fs-12);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-top: 16px;
}

.leader__body p + p { margin-top: 14px; }

@media (max-width: 768px) {
  .leader { grid-template-columns: 1fr; gap: 24px; }
}
```

- [ ] **Step 7: Insert section into `index.html` immediately after the What We Do section**

```html
<section class="section" id="industry-leader" aria-labelledby="leader-title">
  <div class="container leader">
    <div data-reveal>
      <div class="leader__num" data-countup="40" aria-label="40 years">0</div>
      <div class="leader__caption">Years in entertainment</div>
    </div>
    <div class="leader__body" data-reveal>
      <span class="eyebrow">Industry Leader</span>
      <h2 id="leader-title" style="margin: 12px 0 16px;">We've been in your shoes.</h2>
      <p>Forty years across entertainment, hospitality, ticketing, and advertising means we've sat in the operator's chair as often as the consultant's.</p>
      <p>From small-town fairs to multi-day festivals, EMC has the knowhow to make your event successful.</p>
    </div>
  </div>
</section>
```

- [ ] **Step 8: Manual verify**

Run `npm run dev`. Scroll to the Industry Leader section; the "0" counts up to 40 once visible, then holds. With `prefers-reduced-motion`, it shows 40 immediately.

- [ ] **Step 9: Commit**

```bash
git add src/count-up.js tests/count-up.test.js src/main.js src/styles/sections.css index.html
git commit -m "feat(home): Industry Leader section with 40 count-up"
```

---

### Task 11: Event Intake CTA strip

**Files:**
- Modify: `src/styles/sections.css`
- Modify: `index.html`

- [ ] **Step 1: Append styles**

Append to `src/styles/sections.css`:

```css
.intake {
  text-align: center;
  position: relative;
  isolation: isolate;
}

.intake::before {
  content: '';
  position: absolute;
  inset: -10% 0;
  background: radial-gradient(40% 60% at 50% 50%, var(--accent-glow), transparent 70%);
  z-index: -1;
  pointer-events: none;
}

.intake h2 { margin-bottom: 14px; }
.intake p { max-width: 50ch; margin: 0 auto 28px; }
```

- [ ] **Step 2: Insert section into `index.html` immediately after Industry Leader**

```html
<section class="section intake" aria-labelledby="intake-title">
  <div class="container" data-reveal>
    <h2 id="intake-title">Tell us about your event.</h2>
    <p>Share a few details and we'll come back with a sales, scanning, and marketing plan tuned to your audience.</p>
    <a class="btn btn-primary" href="/contact.html">Start an Event Intake</a>
  </div>
</section>
```

- [ ] **Step 3: Manual verify**

`npm run dev` — confirm the section renders with a soft gold halo behind it and the CTA button is clickable.

- [ ] **Step 4: Commit**

```bash
git add src/styles/sections.css index.html
git commit -m "feat(home): event intake CTA section"
```

---

## Phase 3 — Hero WebGL constellation

> **Visual-verification note:** Three.js scenes are hard to assert on cheaply. Pure-logic helpers in `positions.js` get unit-tested; everything else is verified by running `npm run dev` and looking at the canvas. Each task in this phase ends with a manual-verify step and a commit.

### Task 12: Pure positions module + test

**Files:**
- Create: `tests/positions.test.js`
- Create: `src/hero/positions.js`

- [ ] **Step 1: Write the failing test**

Write `tests/positions.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { generateTicketPositions, FEATURED_COUNT } from '../src/hero/positions.js';

describe('generateTicketPositions', () => {
  it('returns the requested number of positions', () => {
    const ps = generateTicketPositions(40, 1);
    expect(ps.length).toBe(40);
  });

  it('is deterministic given the same seed', () => {
    const a = generateTicketPositions(20, 42);
    const b = generateTicketPositions(20, 42);
    expect(a).toEqual(b);
  });

  it('marks exactly FEATURED_COUNT positions as featured', () => {
    const ps = generateTicketPositions(40, 7);
    const featured = ps.filter((p) => p.featured);
    expect(featured.length).toBe(FEATURED_COUNT);
  });

  it('assigns a unique service tag to each featured position', () => {
    const ps = generateTicketPositions(40, 7);
    const services = ps.filter((p) => p.featured).map((p) => p.service);
    expect(new Set(services).size).toBe(FEATURED_COUNT);
  });

  it('positions roughly occupy the right two-thirds (x > -0.3)', () => {
    const ps = generateTicketPositions(60, 5);
    const inRange = ps.filter((p) => p.x > -3).length;
    expect(inRange / ps.length).toBeGreaterThan(0.85);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/hero/positions.js`**

Write `src/hero/positions.js`:

```js
export const SERVICES = ['festivals', 'fairs', 'theme-parks', 'sports', 'box-office'];
export const FEATURED_COUNT = SERVICES.length;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateTicketPositions(count, seed = 1) {
  const rand = mulberry32(seed);
  const positions = [];

  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(rand()) * 6;
    const theta = rand() * Math.PI * 2;
    positions.push({
      index: i,
      x: 2 + Math.cos(theta) * r * 1.2,
      y: (rand() - 0.5) * 6,
      z: (rand() - 0.5) * 4 - 1,
      yaw: rand() * Math.PI * 2,
      pitch: (rand() - 0.5) * 0.6,
      phase: rand() * Math.PI * 2,
      amp: 0.15 + rand() * 0.25,
      featured: false,
      service: null,
    });
  }

  // Pick 5 well-spread tickets as featured. Sort by x and grab evenly-stepped indices.
  const sorted = [...positions].sort((a, b) => a.x - b.x);
  const step = Math.floor(sorted.length / FEATURED_COUNT);
  for (let i = 0; i < FEATURED_COUNT; i++) {
    const target = sorted[Math.min(i * step + Math.floor(step / 2), sorted.length - 1)];
    positions[target.index].featured = true;
    positions[target.index].service = SERVICES[i];
  }
  return positions;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hero/positions.js tests/positions.test.js
git commit -m "feat(hero): deterministic position generator + tests"
```

---

### Task 13: Ticket geometry + material

**Files:**
- Create: `src/hero/ticket.js`

- [ ] **Step 1: Write `src/hero/ticket.js`**

```js
import {
  BufferGeometry,
  ExtrudeGeometry,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Color,
} from 'three';

const ticketShape = (() => {
  const w = 1.6;
  const h = 0.9;
  const r = 0.18;
  const s = new Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
})();

const sharedGeometry = new ExtrudeGeometry(ticketShape, {
  depth: 0.06,
  bevelEnabled: true,
  bevelThickness: 0.02,
  bevelSize: 0.02,
  bevelSegments: 2,
  curveSegments: 12,
});
sharedGeometry.center();

export function createTicketMaterial({ emissiveStrength = 0.15 } = {}) {
  return new MeshStandardMaterial({
    color: new Color('#f0a648'),
    metalness: 0.3,
    roughness: 0.42,
    emissive: new Color('#ff9c3d'),
    emissiveIntensity: emissiveStrength,
  });
}

export function createTicketMesh({ featured = false } = {}) {
  const material = createTicketMaterial({ emissiveStrength: featured ? 0.35 : 0.15 });
  const mesh = new Mesh(sharedGeometry, material);
  if (featured) mesh.scale.setScalar(1.4);
  return mesh;
}

export function disposeShared() {
  sharedGeometry.dispose();
}

export const __testing__ = { sharedGeometry: () => sharedGeometry instanceof BufferGeometry };
```

- [ ] **Step 2: Quick sanity test (manual import smoke — no Vitest test, since three.js inside happy-dom is overkill)**

Run: `node --input-type=module -e "import('./src/hero/ticket.js').then(m => console.log('ok:', typeof m.createTicketMesh))"`
Expected: prints `ok: function`.

- [ ] **Step 3: Commit**

```bash
git add src/hero/ticket.js
git commit -m "feat(hero): ticket geometry + material module"
```

---

### Task 14: Constellation scene — mount, instances, motion loop

**Files:**
- Create: `src/hero/constellation.js`
- Modify: `src/main.js`

- [ ] **Step 1: Write `src/hero/constellation.js`**

```js
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  Vector2,
  Vector3,
  Clock,
} from 'three';
import { createTicketMesh } from './ticket.js';
import { generateTicketPositions } from './positions.js';

const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createConstellation(canvas) {
  const desktopCount = 56;
  const mobileCount = 14;
  const count = isMobile() ? mobileCount : desktopCount;

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 9);
  camera.lookAt(0, 0, 0);

  scene.add(new AmbientLight(0xffffff, 0.5));
  const key = new DirectionalLight(0xfff1d6, 1.2);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new DirectionalLight(0xff9c3d, 0.6);
  rim.position.set(4, -2, -4);
  scene.add(rim);

  const positions = generateTicketPositions(count, 7);
  const meshes = positions.map((p) => {
    const mesh = createTicketMesh({ featured: p.featured });
    mesh.position.set(p.x, p.y, p.z);
    mesh.rotation.set(p.pitch, p.yaw, 0);
    mesh.userData = p;
    scene.add(mesh);
    return mesh;
  });

  const pointer = new Vector2(0, 0);
  const targetPointer = new Vector2(0, 0);

  function setSize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  setSize();

  const ro = new ResizeObserver(setSize);
  ro.observe(canvas);

  const onMouse = (ev) => {
    const r = canvas.getBoundingClientRect();
    targetPointer.set(
      ((ev.clientX - r.left) / r.width) * 2 - 1,
      -(((ev.clientY - r.top) / r.height) * 2 - 1)
    );
  };
  window.addEventListener('pointermove', onMouse, { passive: true });

  const clock = new Clock();
  let running = true;
  let rafId = null;

  function tick() {
    if (!running) return;
    const t = clock.getElapsedTime();
    pointer.lerp(targetPointer, 0.08);

    const reduced = reducedMotion();
    for (const m of meshes) {
      const p = m.userData;
      if (reduced) {
        m.position.y = p.y;
        m.rotation.y = p.yaw;
      } else {
        m.position.y = p.y + Math.sin(t * 0.5 + p.phase) * p.amp;
        m.rotation.y = p.yaw + t * 0.05;
      }
    }
    camera.position.x = pointer.x * 0.6;
    camera.position.y = pointer.y * 0.4;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  }
  tick();

  function pause() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }
  function resume() {
    if (running) return;
    running = true;
    clock.start();
    tick();
  }

  return { meshes, scene, camera, renderer, pause, resume, dispose() {
    pause();
    ro.disconnect();
    window.removeEventListener('pointermove', onMouse);
    renderer.dispose();
  } };
}
```

- [ ] **Step 2: Wire into `src/main.js`**

Edit `src/main.js` so it reads:

```js
import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/hero.css';

import { initNav } from './nav.js';
import { initReveals } from './reveals.js';
import { initTilt } from './tilt.js';
import { initCountUp } from './count-up.js';
import { createConstellation } from './hero/constellation.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveals();
  initTilt();
  initCountUp();

  const canvas = document.querySelector('.hero__canvas');
  if (canvas) createConstellation(canvas);
});
```

- [ ] **Step 3: Manual verify**

Run: `npm run dev`. Expected: hero canvas now shows ~56 gold tickets in motion on the right side, gentle bobbing, slow rotation, soft parallax following the mouse, no console errors. The 5 featured tickets are visibly larger and brighter.

- [ ] **Step 4: Commit**

```bash
git add src/hero/constellation.js src/main.js
git commit -m "feat(hero): three.js constellation with motion and parallax"
```

---

### Task 15: Featured-ticket DOM label overlay

**Files:**
- Create: `src/hero/featured-labels.js`
- Modify: `src/hero/constellation.js`

- [ ] **Step 1: Create `src/hero/featured-labels.js`**

```js
import { Vector3 } from 'three';

const LABELS = {
  festivals: 'Festivals',
  fairs: 'Fairs',
  'theme-parks': 'Theme Parks',
  sports: 'Sports',
  'box-office': 'Box Office',
};

const TARGETS = {
  festivals: '/sell-onsite.html',
  fairs: '/sell-onsite.html',
  'theme-parks': '/sell-onsite.html',
  sports: '/sell-onsite.html',
  'box-office': '/sell-onsite.html',
};

export function createFeaturedLabels(container, meshes, camera, renderer) {
  const featured = meshes.filter((m) => m.userData.featured);
  const labels = featured.map((m) => {
    const a = document.createElement('a');
    a.className = 'hero__label';
    a.href = TARGETS[m.userData.service];
    a.textContent = LABELS[m.userData.service];
    a.dataset.service = m.userData.service;
    container.appendChild(a);
    return { mesh: m, el: a, visible: false };
  });

  const v = new Vector3();
  function sync() {
    const rect = renderer.domElement.getBoundingClientRect();
    for (const { mesh, el } of labels) {
      v.copy(mesh.position).project(camera);
      const x = (v.x * 0.5 + 0.5) * rect.width;
      const y = (-v.y * 0.5 + 0.5) * rect.height;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
  }

  function show(service) {
    for (const l of labels) l.el.classList.toggle('is-visible', l.mesh.userData.service === service);
  }
  function hideAll() {
    for (const l of labels) l.el.classList.remove('is-visible');
  }

  return { labels, sync, show, hideAll };
}
```

- [ ] **Step 2: Wire labels into `src/hero/constellation.js`**

Modify `src/hero/constellation.js`:

1. Add at the top: `import { createFeaturedLabels } from './featured-labels.js';`
2. Inside `createConstellation`, after the `meshes` array is built, add:

```js
const labelHost = document.querySelector('.hero__labels');
const featured = labelHost ? createFeaturedLabels(labelHost, meshes, camera, renderer) : null;
```

3. Inside `tick()`, at the bottom (before `renderer.render(...)`), call `if (featured) featured.sync();`.
4. Return `featured` as part of the returned object: `return { ..., featured }`.

- [ ] **Step 3: Manual verify**

Run `npm run dev`. Inspect DOM — five `.hero__label` elements exist inside `.hero__labels` with text "Festivals", "Fairs", "Theme Parks", "Sports", "Box Office". They are invisible (`opacity: 0`) by default. Their `top`/`left` styles update each frame.

- [ ] **Step 4: Commit**

```bash
git add src/hero/featured-labels.js src/hero/constellation.js
git commit -m "feat(hero): floating DOM labels synced to featured tickets"
```

---

### Task 16: Hover lift, click flip, keyboard fallback (interaction wiring)

**Files:**
- Modify: `src/hero/constellation.js`

- [ ] **Step 1: Add raycaster and interaction state in `src/hero/constellation.js`**

Modify `src/hero/constellation.js` — add these imports at the top:

```js
import { Raycaster } from 'three';
```

Inside `createConstellation`, after lights and before the meshes array, add:

```js
const raycaster = new Raycaster();
let hovered = null;
```

Add a mouse-move handler that scopes to the hero element. After `window.addEventListener('pointermove', onMouse, ...)`, add:

```js
function onHover(ev) {
  const r = canvas.getBoundingClientRect();
  const nx = ((ev.clientX - r.left) / r.width) * 2 - 1;
  const ny = -(((ev.clientY - r.top) / r.height) * 2 - 1);
  raycaster.setFromCamera({ x: nx, y: ny }, camera);
  const featuredMeshes = meshes.filter((m) => m.userData.featured);
  const hits = raycaster.intersectObjects(featuredMeshes, false);
  const next = hits[0]?.object || null;
  if (next !== hovered) {
    if (hovered) hovered.userData.hovered = false;
    hovered = next;
    if (hovered) hovered.userData.hovered = true;
    if (featured) {
      if (hovered) featured.show(hovered.userData.service);
      else featured.hideAll();
    }
  }
}
window.addEventListener('pointermove', onHover, { passive: true });
```

Update the per-mesh portion of `tick()` so featured + hovered tickets animate forward:

```js
for (const m of meshes) {
  const p = m.userData;
  const lifted = p.hovered ? 0.6 : 0;
  if (reduced) {
    m.position.y = p.y;
    m.position.z = p.z + lifted;
    m.rotation.y = p.yaw;
  } else {
    m.position.y = p.y + Math.sin(t * 0.5 + p.phase) * p.amp;
    m.position.z = p.z + lifted;
    m.rotation.y = p.yaw + t * 0.05;
  }
  if (p.featured) {
    m.material.emissiveIntensity = p.hovered ? 0.7 : 0.35;
  }
}
```

Add a click handler — after `onHover`:

```js
function onClick(ev) {
  const r = canvas.getBoundingClientRect();
  if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return;
  const nx = ((ev.clientX - r.left) / r.width) * 2 - 1;
  const ny = -(((ev.clientY - r.top) / r.height) * 2 - 1);
  raycaster.setFromCamera({ x: nx, y: ny }, camera);
  const featuredMeshes = meshes.filter((m) => m.userData.featured);
  const hits = raycaster.intersectObjects(featuredMeshes, false);
  const hit = hits[0]?.object;
  if (!hit) return;
  const start = hit.rotation.y;
  const dur = 200;
  const t0 = performance.now();
  function flip(now) {
    const p = Math.min(1, (now - t0) / dur);
    hit.rotation.y = start + Math.PI * p;
    if (p < 1) requestAnimationFrame(flip);
    else {
      const a = document.querySelector(`a[data-portal="${hit.userData.service}"]`);
      if (a) a.click();
      else window.location.href = '/sell-onsite.html';
    }
  }
  requestAnimationFrame(flip);
}
window.addEventListener('click', onClick);
```

Also, wire the visually-hidden anchors to the same hover state. After `onHover` is defined, add:

```js
document.querySelectorAll('a[data-portal]').forEach((a) => {
  a.addEventListener('focus', () => {
    const m = meshes.find((mm) => mm.userData.service === a.dataset.portal);
    if (!m) return;
    if (hovered) hovered.userData.hovered = false;
    hovered = m;
    m.userData.hovered = true;
    if (featured) featured.show(m.userData.service);
  });
  a.addEventListener('blur', () => {
    if (hovered) hovered.userData.hovered = false;
    hovered = null;
    if (featured) featured.hideAll();
  });
});
```

Make sure `dispose()` also removes `pointermove` and `click` listeners by tracking them.

- [ ] **Step 2: Manual verify**

Run `npm run dev`. Confirm:
- Hovering a featured ticket lifts it forward and shows its label.
- Clicking a featured ticket plays a 200ms Y-axis flip, then navigates to `/sell-onsite.html`.
- Tabbing through the page eventually focuses the hidden portal anchors; focus on any one lifts the matching ticket and shows its label. Pressing Enter follows the link.

- [ ] **Step 3: Commit**

```bash
git add src/hero/constellation.js
git commit -m "feat(hero): hover lift, click flip, keyboard a11y for portals"
```

---

### Task 17: Bloom post-processing (desktop only)

**Files:**
- Create: `src/hero/post.js`
- Modify: `src/hero/constellation.js`

- [ ] **Step 1: Write `src/hero/post.js`**

```js
import { Vector2 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export function createBloomComposer(renderer, scene, camera, size) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(size.x, size.y), 0.5, 0.6, 0.15);
  composer.addPass(bloom);
  function resize(w, h) { composer.setSize(w, h); }
  return { composer, resize };
}
```

- [ ] **Step 2: Use the composer from the constellation when appropriate**

In `src/hero/constellation.js`, near the top add: `import { createBloomComposer } from './post.js';`

After the renderer is created, add:

```js
const useBloom = !isMobile();
let post = null;
if (useBloom) {
  post = createBloomComposer(renderer, scene, camera, { x: canvas.clientWidth, y: canvas.clientHeight });
}
```

Change `setSize()` so it also resizes the composer:

```js
function setSize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (post) post.resize(w, h);
}
```

Change the render call in `tick()` from `renderer.render(scene, camera);` to:

```js
if (post) post.composer.render();
else renderer.render(scene, camera);
```

- [ ] **Step 3: Manual verify**

`npm run dev`. On desktop, the gold tickets now have a soft bloom halo. Resize to <768px (responsive devtools) and bloom turns off (cheaper render).

- [ ] **Step 4: Commit**

```bash
git add src/hero/post.js src/hero/constellation.js
git commit -m "feat(hero): UnrealBloomPass on desktop"
```

---

### Task 18: Pause render loop when scrolled off-screen

**Files:**
- Modify: `src/hero/constellation.js`

- [ ] **Step 1: Hook IntersectionObserver to pause/resume**

At the end of `createConstellation`, just before `return`, add:

```js
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) resume();
      else pause();
    }
  },
  { threshold: 0 }
);
io.observe(canvas);
```

Make sure `dispose()` calls `io.disconnect()`.

- [ ] **Step 2: Manual verify**

`npm run dev`. Open the dev tools Performance tab, scroll past the hero. The animation frames should stop being scheduled while the canvas is out of view; scrolling back resumes them.

- [ ] **Step 3: Commit**

```bash
git add src/hero/constellation.js
git commit -m "perf(hero): pause render loop when canvas off-screen"
```

---

## Phase 4 — Sub-pages

### Task 19: Sub-page motif (single rotating ticket)

**Files:**
- Create: `src/motifs/rotating-ticket.js`

- [ ] **Step 1: Write the motif**

```js
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
} from 'three';
import { createTicketMesh } from '../hero/ticket.js';

export function mountRotatingTicket(canvas) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 4.5);
  scene.add(new AmbientLight(0xffffff, 0.6));
  const key = new DirectionalLight(0xfff1d6, 1.0);
  key.position.set(-3, 4, 4);
  scene.add(key);

  const ticket = createTicketMesh({ featured: true });
  ticket.scale.setScalar(1.6);
  scene.add(ticket);

  function setSize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  setSize();
  const ro = new ResizeObserver(setSize);
  ro.observe(canvas);

  let raf = null;
  let t0 = performance.now();
  function tick(now) {
    if (!reduced) {
      const t = (now - t0) / 1000;
      ticket.rotation.y = t * 0.4;
      ticket.rotation.x = Math.sin(t * 0.5) * 0.1;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick(t0);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect();
    renderer.dispose();
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/motifs/rotating-ticket.js
git commit -m "feat(motif): single rotating ticket for sub-pages"
```

---

### Task 20: Sub-page template styles + "what-we-do.html"

**Files:**
- Modify: `src/styles/sections.css`
- Create: `what-we-do.html`

- [ ] **Step 1: Append sub-page styles**

Append to `src/styles/sections.css`:

```css
.subhero {
  position: relative;
  padding: 144px 0 64px;
  border-bottom: 1px solid var(--border);
}

.subhero__grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 56px;
  align-items: center;
}

.subhero__head h1 { font-size: var(--fs-64); margin-bottom: 16px; }
.subhero__head p { font-size: var(--fs-18); max-width: 52ch; }

.subhero__motif {
  aspect-ratio: 1 / 1;
  max-width: 360px;
  justify-self: end;
}

.subhero__motif canvas { width: 100%; height: 100%; display: block; }

.prose { max-width: 70ch; margin-inline: auto; }
.prose h2 { margin-bottom: 18px; }
.prose h2 + p { margin-bottom: 18px; }
.prose p + p { margin-top: 14px; }
.prose ul { margin: 18px 0; padding-left: 20px; color: var(--text-muted); }
.prose li + li { margin-top: 6px; }

@media (max-width: 768px) {
  .subhero__grid { grid-template-columns: 1fr; gap: 32px; }
  .subhero__motif { justify-self: start; max-width: 260px; }
}
```

- [ ] **Step 2: Create `what-we-do.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>What We Do — EMC Tickets</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <script type="module" src="/src/sub.js"></script>
</head>
<body>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffd66b"/>
        <stop offset="100%" stop-color="#ff9c3d"/>
      </linearGradient>
    </defs>
  </svg>

  <header>
    <nav class="site-nav" aria-label="Primary">
      <a class="site-nav__brand" href="/index.html"><img src="/logo.svg" alt="EMC Tickets"></a>
      <ul class="site-nav__links">
        <li><a href="/index.html#industry-leader">Industry Leader</a></li>
        <li><a href="/what-we-do.html">What We Do</a></li>
        <li><a href="/sell-onsite.html">Sell Onsite</a></li>
        <li><a href="/sell-online.html">Sell Online</a></li>
        <li><a href="/sell-social.html">Sell Social</a></li>
        <li><a href="/contact.html">Contact</a></li>
      </ul>
      <a class="btn btn-primary site-nav__cta" href="/contact.html">Event Intake</a>
    </nav>
  </header>

  <main>
    <section class="subhero">
      <div class="container subhero__grid">
        <div class="subhero__head">
          <span class="eyebrow">What We Do</span>
          <h1><span class="gold-text">Sales. Scanning.</span> Marketing. Advertising.</h1>
          <p>One company, four disciplines, one continuous operation that puts more wristbands on guests and more revenue in the books.</p>
        </div>
        <div class="subhero__motif"><canvas data-motif="rotating-ticket" aria-hidden="true"></canvas></div>
      </div>
    </section>

    <section class="section">
      <div class="container prose">
        <h2>Built for events that move.</h2>
        <p>Festivals, fairs, water and theme parks, sports — every event has the same problem in different costumes: get a ticket into every interested hand, scan it fast at the gate, and keep guests coming back. Forty years of doing that gives us the muscle memory.</p>

        <h2>What's in the box.</h2>
        <ul>
          <li><strong>Presale &amp; Advance Tickets</strong> — Online, mobile, social, retail, box office. One inventory.</li>
          <li><strong>Marketing &amp; Advertising</strong> — Media buying, promotions, radio, TV, billboards, web, mobile, social.</li>
          <li><strong>Redemption &amp; Box Office Systems</strong> — Modern hardware and software for fast, friendly admission.</li>
          <li><strong>Social Media Management</strong> — Posting, response, guest support across the channels your buyers actually use.</li>
        </ul>

        <p>Retail partners alone produce 50% or more of advance and presale ticket programs for most operators — consumers still prefer brick-and-mortar. We've spent decades wiring those partner networks together.</p>
      </div>
    </section>

    <section class="section intake" aria-labelledby="intake-title">
      <div class="container" data-reveal>
        <h2 id="intake-title">Tell us about your event.</h2>
        <p>Share a few details and we'll come back with a sales, scanning, and marketing plan tuned to your audience.</p>
        <a class="btn btn-primary" href="/contact.html">Start an Event Intake</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="site-footer__grid">
        <div class="site-footer__col">
          <h4>Office</h4>
          <p>8409 Land O Lakes Blvd<br>Land O Lakes, FL 34638</p>
        </div>
        <div class="site-footer__col">
          <h4>Phone</h4>
          <p>
            <a href="tel:+18133899530">(813) 389-9530</a><br>
            24/7 Toll Free <a href="tel:+18002902090">(800) 290-2090</a>
          </p>
        </div>
        <div class="site-footer__col">
          <h4>More</h4>
          <ul>
            <li><a href="/contact.html">Contact</a></li>
            <li><a href="/what-we-do.html">What We Do</a></li>
          </ul>
        </div>
      </div>
      <div class="site-footer__legal">
        <span>&copy; EMC Tickets</span>
        <span>Land O Lakes, Florida</span>
      </div>
    </div>
  </footer>
</body>
</html>
```

- [ ] **Step 3: Create a shared sub-page entrypoint `src/sub.js`**

Write `src/sub.js`:

```js
import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';

import { initNav } from './nav.js';
import { initReveals } from './reveals.js';
import { mountRotatingTicket } from './motifs/rotating-ticket.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveals();
  document.querySelectorAll('canvas[data-motif="rotating-ticket"]').forEach((c) => mountRotatingTicket(c));
});
```

- [ ] **Step 4: Manual verify**

Run `npm run dev`, navigate to `/what-we-do.html`. Confirm: shared nav and footer render, the slim hero shows the title with gold gradient on the first line and a single rotating gold ticket on the right, the prose body renders, the closing intake CTA renders. Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/styles/sections.css src/sub.js what-we-do.html
git commit -m "feat(sub-pages): template + What We Do page"
```

---

### Task 21: `sell-onsite.html`

**Files:**
- Create: `sell-onsite.html`

- [ ] **Step 1: Write `sell-onsite.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sell Onsite — EMC Tickets</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <script type="module" src="/src/sub.js"></script>
</head>
<body>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffd66b"/>
        <stop offset="100%" stop-color="#ff9c3d"/>
      </linearGradient>
    </defs>
  </svg>

  <header>
    <nav class="site-nav" aria-label="Primary">
      <a class="site-nav__brand" href="/index.html"><img src="/logo.svg" alt="EMC Tickets"></a>
      <ul class="site-nav__links">
        <li><a href="/index.html#industry-leader">Industry Leader</a></li>
        <li><a href="/what-we-do.html">What We Do</a></li>
        <li><a href="/sell-onsite.html">Sell Onsite</a></li>
        <li><a href="/sell-online.html">Sell Online</a></li>
        <li><a href="/sell-social.html">Sell Social</a></li>
        <li><a href="/contact.html">Contact</a></li>
      </ul>
      <a class="btn btn-primary site-nav__cta" href="/contact.html">Event Intake</a>
    </nav>
  </header>

  <main>
    <section class="subhero">
      <div class="container subhero__grid">
        <div class="subhero__head">
          <span class="eyebrow">Sell Onsite</span>
          <h1><span class="gold-text">Box office</span> done right.</h1>
          <p>Fast gates, friendly scanning, hardware your staff doesn't fight. Built for the volume a fair or festival weekend actually brings.</p>
        </div>
        <div class="subhero__motif"><canvas data-motif="rotating-ticket" aria-hidden="true"></canvas></div>
      </div>
    </section>

    <section class="section">
      <div class="container prose">
        <h2>State of the art, used by humans.</h2>
        <p>Our redemption and sales systems are simple enough that seasonal staff can run them on day one, and fast enough that lines don't form. Onsite isn't an afterthought — for most operators it's still where the majority of guests buy.</p>

        <h2>What you get at the gate.</h2>
        <ul>
          <li>High-throughput scanners with offline-safe sync.</li>
          <li>Box-office POS for walk-ups, upgrades, and group sales.</li>
          <li>Real-time inventory shared with online and retail channels.</li>
          <li>Onsite training and dedicated support during your event window.</li>
        </ul>
      </div>
    </section>

    <section class="section intake" aria-labelledby="intake-title">
      <div class="container" data-reveal>
        <h2 id="intake-title">Tell us about your event.</h2>
        <p>Share a few details and we'll come back with a sales, scanning, and marketing plan tuned to your audience.</p>
        <a class="btn btn-primary" href="/contact.html">Start an Event Intake</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="site-footer__grid">
        <div class="site-footer__col">
          <h4>Office</h4>
          <p>8409 Land O Lakes Blvd<br>Land O Lakes, FL 34638</p>
        </div>
        <div class="site-footer__col">
          <h4>Phone</h4>
          <p>
            <a href="tel:+18133899530">(813) 389-9530</a><br>
            24/7 Toll Free <a href="tel:+18002902090">(800) 290-2090</a>
          </p>
        </div>
        <div class="site-footer__col">
          <h4>More</h4>
          <ul>
            <li><a href="/contact.html">Contact</a></li>
            <li><a href="/what-we-do.html">What We Do</a></li>
          </ul>
        </div>
      </div>
      <div class="site-footer__legal">
        <span>&copy; EMC Tickets</span>
        <span>Land O Lakes, Florida</span>
      </div>
    </div>
  </footer>
</body>
</html>
```

- [ ] **Step 2: Manual verify**

`npm run dev`, browse `/sell-onsite.html`, confirm slim hero + body + closing CTA all render and the rotating ticket motif animates.

- [ ] **Step 3: Commit**

```bash
git add sell-onsite.html
git commit -m "feat(sub-pages): Sell Onsite"
```

---

### Task 22: `sell-online.html`

**Files:**
- Create: `sell-online.html`

- [ ] **Step 1: Write `sell-online.html`**

Use the same shell as `sell-onsite.html`, replacing the `<title>`, the eyebrow, the h1, the deck paragraph, and the prose body. Specifically, replace the `<main>` content with:

```html
<main>
  <section class="subhero">
    <div class="container subhero__grid">
      <div class="subhero__head">
        <span class="eyebrow">Sell Online</span>
        <h1><span class="gold-text">Online and mobile</span> as a single funnel.</h1>
        <p>Web, mobile, and social checkouts that share inventory with the box office and our retail partner network.</p>
      </div>
      <div class="subhero__motif"><canvas data-motif="rotating-ticket" aria-hidden="true"></canvas></div>
    </div>
  </section>

  <section class="section">
    <div class="container prose">
      <h2>One inventory, every channel.</h2>
      <p>The buyer doesn't care whether they're on your site, in a Circle K, or scrolling Facebook on the way home from work. We make the experience feel like one storefront — and the inventory like one ledger.</p>

      <h2>Highlights.</h2>
      <ul>
        <li>One-click presale and advance technology.</li>
        <li>Mobile-first checkout with Apple Pay and Google Pay.</li>
        <li>Promo codes, group pricing, and timed-entry windows.</li>
        <li>Reporting that ties online sales back to the channel that earned them.</li>
      </ul>

      <p>Retail outlets remain a powerful complement — they produce 50% or more of advance / presale ticket programs for most operators. We treat brick-and-mortar as a first-class sales channel, not a fallback.</p>
    </div>
  </section>

  <section class="section intake" aria-labelledby="intake-title">
    <div class="container" data-reveal>
      <h2 id="intake-title">Tell us about your event.</h2>
      <p>Share a few details and we'll come back with a sales, scanning, and marketing plan tuned to your audience.</p>
      <a class="btn btn-primary" href="/contact.html">Start an Event Intake</a>
    </div>
  </section>
</main>
```

Wrap that `<main>` in the same `<head>`, header, hidden SVG defs, and footer used by `sell-onsite.html`, changing only the `<title>` to `Sell Online — EMC Tickets`.

- [ ] **Step 2: Manual verify**

Visit `/sell-online.html` in dev server. Confirm.

- [ ] **Step 3: Commit**

```bash
git add sell-online.html
git commit -m "feat(sub-pages): Sell Online"
```

---

### Task 23: `sell-social.html`

**Files:**
- Create: `sell-social.html`

- [ ] **Step 1: Write `sell-social.html`** using the same shell as `sell-onsite.html`, replacing `<title>` with `Sell Social — EMC Tickets` and the `<main>` content with:

```html
<main>
  <section class="subhero">
    <div class="container subhero__grid">
      <div class="subhero__head">
        <span class="eyebrow">Sell Social</span>
        <h1><span class="gold-text">Social media</span> as a sales channel.</h1>
        <p>Managed posting, paid promotion, and timely guest support across the platforms your audience actually opens.</p>
      </div>
      <div class="subhero__motif"><canvas data-motif="rotating-ticket" aria-hidden="true"></canvas></div>
    </div>
  </section>

  <section class="section">
    <div class="container prose">
      <h2>Social is where your event lives between gates.</h2>
      <p>Most attendees decide to come back during the eleven months you're not running an event. Social is the only channel that stays open the whole time — so we treat it like one.</p>

      <h2>What we run.</h2>
      <ul>
        <li>Editorial calendar and on-brand creative production.</li>
        <li>Paid promotion across Meta, TikTok, and YouTube Shorts.</li>
        <li>Guest support: replies, DMs, lost-and-found triage.</li>
        <li>Tie-ins with the same sales and presale channels your box office uses.</li>
      </ul>
    </div>
  </section>

  <section class="section intake" aria-labelledby="intake-title">
    <div class="container" data-reveal>
      <h2 id="intake-title">Tell us about your event.</h2>
      <p>Share a few details and we'll come back with a sales, scanning, and marketing plan tuned to your audience.</p>
      <a class="btn btn-primary" href="/contact.html">Start an Event Intake</a>
    </div>
  </section>
</main>
```

- [ ] **Step 2: Manual verify**

Visit `/sell-social.html`.

- [ ] **Step 3: Commit**

```bash
git add sell-social.html
git commit -m "feat(sub-pages): Sell Social"
```

---

### Task 24: `contact.html` (mailto variant — no intake CTA)

**Files:**
- Create: `contact.html`
- Modify: `src/styles/sections.css`

- [ ] **Step 1: Add contact styles**

Append to `src/styles/sections.css`:

```css
.contact__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 56px;
  align-items: start;
}
.contact__block h3 { margin-bottom: 8px; }
.contact__block p, .contact__block a { font-size: var(--fs-18); color: var(--text-muted); }
.contact__block a:hover { color: var(--gold-1); }
.contact__block + .contact__block { margin-top: 28px; }
@media (max-width: 768px) { .contact__grid { grid-template-columns: 1fr; gap: 28px; } }
```

- [ ] **Step 2: Write `contact.html`**

Same head/header/footer shell as the other sub-pages, with `<title>` set to `Contact — EMC Tickets`, and this `<main>`:

```html
<main>
  <section class="subhero">
    <div class="container subhero__grid">
      <div class="subhero__head">
        <span class="eyebrow">Contact</span>
        <h1><span class="gold-text">Talk to a human.</span></h1>
        <p>Tell us about your event — we'll come back with a plan, a timeline, and the names of the people who'll work on it.</p>
      </div>
      <div class="subhero__motif"><canvas data-motif="rotating-ticket" aria-hidden="true"></canvas></div>
    </div>
  </section>

  <section class="section">
    <div class="container contact__grid">
      <div>
        <div class="contact__block">
          <h3>Office</h3>
          <p>8409 Land O Lakes Blvd<br>Land O Lakes, FL 34638</p>
        </div>
        <div class="contact__block">
          <h3>Phone</h3>
          <p>
            <a href="tel:+18133899530">(813) 389-9530</a><br>
            24/7 Toll Free <a href="tel:+18002902090">(800) 290-2090</a>
          </p>
        </div>
        <div class="contact__block">
          <h3>Hours</h3>
          <p>Office: Monday – Friday, 9–5 ET<br>Event support: 24/7 during your event window.</p>
        </div>
      </div>
      <div>
        <h3>Send the details.</h3>
        <p style="margin-bottom: 20px;">Event name, dates, venue, projected attendance, and what you need (sales, scanning, marketing, or all of the above). We'll respond same business day.</p>
        <a class="btn btn-primary" href="mailto:info@emctickets.com?subject=Event%20Intake">Email Event Intake</a>
      </div>
    </div>
  </section>
</main>
```

- [ ] **Step 3: Manual verify**

Visit `/contact.html`. Click "Email Event Intake" — should open the mail client with the pre-filled subject.

- [ ] **Step 4: Commit**

```bash
git add contact.html src/styles/sections.css
git commit -m "feat(sub-pages): Contact"
```

---

## Phase 5 — Verification

### Task 25: Build, preview, smoke-check every route

**Files:** none

- [ ] **Step 1: Run the build**

Run: `npm run build`
Expected: Vite emits `dist/` containing each of the six HTML files plus hashed JS/CSS assets and the font under `dist/fonts/`. No errors.

- [ ] **Step 2: Serve and click through**

Run: `npm run preview`. Visit `http://localhost:4173/` and, in order:
- `/index.html` — hero with constellation, partner strip, cards, count-up, intake CTA all visible.
- `/what-we-do.html`
- `/sell-onsite.html`
- `/sell-online.html`
- `/sell-social.html`
- `/contact.html`

Hard-refresh each page. No 404s, no console errors, all images and the font load.

- [ ] **Step 3: Mobile + reduced-motion smoke**

In Chrome devtools toggle the "iPhone 12 Pro" device + the "Emulate CSS prefers-reduced-motion: reduce" rendering option. Re-load `/index.html`:
- Cards stack 1-column.
- Count-up shows `40` immediately.
- Hero tickets are static (no float / rotation).

- [ ] **Step 4: Run unit tests once more**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 5: Commit (no code change — just confirm clean working tree)**

Run: `git status`. Expected: working tree clean. If anything is dirty, investigate before continuing.

---

### Task 26: Lighthouse run on home + one sub-page

**Files:** none

- [ ] **Step 1: Run Lighthouse mobile audit against `npm run preview`**

With `npm run preview` running, open Chrome devtools → Lighthouse → mobile audit on `http://localhost:4173/`.
Expected: Performance ≥ 80, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95. If A11y is below 95, fix the issues it reports (missing labels, color contrast) before moving on.

- [ ] **Step 2: Run the same audit on `/what-we-do.html`**

Same thresholds.

- [ ] **Step 3: Run Lighthouse desktop on `/index.html`**

Expected: Performance ≥ 95.

- [ ] **Step 4: Commit any fixes from steps 1–3 (if needed)**

If you adjusted markup or styles to hit thresholds, commit them with a message like `perf: lighthouse-driven fixes`.

---

## Self-review (done by the plan author, recorded here for traceability)

**Spec coverage:** Every numbered spec section is implemented:
- §3 tokens → Task 2
- §4.1 nav → Tasks 3, 5, 7
- §4.2 hero → Tasks 7, 12–18
- §4.3 partners → Task 8
- §4.4 cards → Task 9
- §4.5 industry leader / count-up → Task 10
- §4.6 intake → Task 11 (and reused in sub-pages)
- §4.7 footer → Tasks 4, 7
- §5 sub-page template → Tasks 19, 20
- §5 sub-pages → Tasks 20–24
- §7 a11y / reduced motion / mobile fallback / pause-when-offscreen → Tasks 2 (CSS), 14 (mobile), 16 (a11y), 17 (mobile bloom gate), 18 (pause)
- §8 copy → Tasks 7, 10, 20–24 (all from live site, lightly tightened, no new claims)
- §9 open questions → resolved at the top of this plan
- §10 acceptance criteria → Tasks 25, 26

**Placeholders:** None. Every code step shows the code; every command step shows the command.

**Type consistency:** Modules referenced across tasks (`createTicketMesh`, `createConstellation`, `createFeaturedLabels`, `mountRotatingTicket`, `initNav`, `initReveals`, `initCountUp`, `initTilt`, `generateTicketPositions`, `easeOutCubic`, `computeFrameValue`, `runCountUp`) keep consistent names and signatures from where they are defined.
