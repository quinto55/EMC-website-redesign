# Flight as the Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The drone fly-through opens the site at `/` (flight → hero → sections), the masked-EMC intro retires, and `experience.html` becomes a redirect.

**Architecture:** Move the flight stage markup from experience.html into index.html above the hero; wire `initFlightScrub(ctx)` into `src/main.js`; delete the intro module/CSS/tests and the intro session gate from `src/motion.js`; rewrite experience.html as a meta-refresh redirect and strip Experience links site-wide. `flight-scrub.js` is untouched — it finds `[data-flight]` wherever it lives.

**Tech Stack:** Existing stack only. No new dependencies, no frame-asset changes.

**Spec:** `docs/superpowers/specs/2026-07-17-flight-landing-page-design.md`

**PRECONDITION:** the visual-identity plan (feature/visual-identity) is fully merged before this plan starts — both touch index.html, sections.css, and footers.

## Global Constraints

- `src/flight-scrub.js`, frame assets, manifest, and poster are NOT modified.
- Deletions (complete list): `src/intro.js`, `src/styles/intro.css`, `tests/intro.test.js`, `src/experience.js`; from `src/motion.js`: `INTRO_SEEN_KEY`, `hasSeenIntro`, `markIntroSeen`; from `tests/motion.test.js`: the `session gate` describe block and `fakeStorage` helper; from `src/mask-text.js`: `introFontSize` (+ its test assertions). Nothing else deleted.
- Expected suite after deletions: **53 tests** (61 − 4 intro − 3 session-gate − 1 mask-text intro assertion); all remaining tests pass UNMODIFIED except the two named test files.
- `experience.html` keeps its vite input entry (the redirect page still builds); it carries `<meta name="robots" content="noindex">`.
- Experience nav links removed from: index.html + the 5 sub-pages (nav `<ul>`) and from all 7 footers' "More" lists. reveal-hero.html is NOT touched (its Experience link lands on the redirect, which is fine).
- Reduced-motion / no-JS behavior of the flight carries to index unchanged (static poster + stacked beats, page continues below).
- Commit after every task with the exact message given.

---

### Task 1: Flight into index.html; intro retired

**Files:**
- Modify: `index.html`, `src/main.js`, `src/motion.js`, `tests/motion.test.js`, `src/mask-text.js`, `tests/mask-text.test.js`
- Delete: `src/intro.js`, `src/styles/intro.css`, `tests/intro.test.js`

**Interfaces:**
- Consumes: `initFlightScrub(ctx)` from `src/flight-scrub.js` (unchanged); the flight DOM contract currently in experience.html.
- Produces: index.html owns the `[data-flight]` stage; `src/motion.js` exports ONLY `prefersReducedMotion` and `initMotion` afterward.

- [ ] **Step 1: Move the flight stage markup**

Copy the ENTIRE `<section class="flight" data-flight ...> … </section>` block from `experience.html` (everything from the opening section tag through its closing tag — poster img, canvas, loader, all five `.flight__beat` blocks) and insert it in `index.html` as the FIRST child of `<main>`, directly above `<section class="hero" ...>`. Do not modify the copied markup. (experience.html itself is rewritten in Task 2 — leave it alone in this task.)

Then DELETE from `index.html` the entire intro overlay block:
```html
  <div class="intro" id="intro" aria-hidden="true">
    …
  </div>
```
(from `<div class="intro"` through its matching closing `</div>` — the block containing `intro__stage`, `intro__svg`, `intro__underline`, `intro__eyebrow`). Keep the `html.js` head script (the flight's no-JS fallback needs it) and keep the gold-grad `<svg>` defs block.

- [ ] **Step 2: Rewire src/main.js**

Apply these exact changes:
1. Remove the line `import './styles/intro.css';` and add in its place `import './styles/experience.css';`
2. Remove `import { initIntro } from './intro.js';` and add `import { initFlightScrub } from './flight-scrub.js';`
3. In the DOMContentLoaded handler: remove the `initIntro(ctx);` call, and add `initFlightScrub(ctx);` directly after `initEmbers();`.

- [ ] **Step 3: Retire the session gate in motion.js + tests**

1. `src/motion.js`: delete `INTRO_SEEN_KEY`, `hasSeenIntro`, `markIntroSeen` (functions and export). Keep `prefersReducedMotion` and `initMotion` exactly as they are.
2. `tests/motion.test.js`: delete the `fakeStorage` helper and the entire `describe('session gate', …)` block; remove the now-unused imports (`hasSeenIntro`, `markIntroSeen`, `INTRO_SEEN_KEY`) from the import statement. The `prefersReducedMotion` describe stays.

- [ ] **Step 4: Delete the intro artifacts and prune mask-text**

```bash
git rm src/intro.js src/styles/intro.css tests/intro.test.js
```

Then in `src/mask-text.js` delete the `introFontSize` function (keep `positionMaskText` and `fortyFontSize`), and in `tests/mask-text.test.js` remove the `it('intro letters scale with viewport width, capped by height', …)` test and the `introFontSize` import.

Confirm nothing else references the deleted names:
```bash
grep -rn "initIntro\|hasSeenIntro\|markIntroSeen\|INTRO_SEEN_KEY\|introFontSize\|intro__" src/ tests/ index.html | grep -v Binary
```
Expected: no output (any hit = missed reference; fix before continuing).

- [ ] **Step 5: Verify**

`npm test` → all pass; expected exactly 53. `npm run build` → clean. Dev checks:
- `curl -s http://localhost:5173/ | grep -c "flight__beat"` → `5`
- `curl -s http://localhost:5173/ | grep -c 'class="intro"'` → `0`
- `curl -s http://localhost:5173/ | grep -c 'class="hero"'` → `1` (hero survives, after the flight)

- [ ] **Step 6: Commit**

```bash
git add index.html src/main.js src/motion.js tests/motion.test.js src/mask-text.js tests/mask-text.test.js
git commit -m "feat(landing): flight opens the homepage; masked-EMC intro retired"
```

---

### Task 2: Redirect page + link cleanup

**Files:**
- Modify: `experience.html` (full rewrite), `index.html`, `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`, `contact.html` (nav + footer links)
- Delete: `src/experience.js`

**Interfaces:**
- Consumes: nothing. Produces: `/experience.html` → `/` redirect.

- [ ] **Step 1: Rewrite experience.html as a redirect**

Replace the ENTIRE file content with exactly:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=/">
  <link rel="canonical" href="/">
  <meta name="robots" content="noindex">
  <title>EMC Tickets — moved</title>
</head>
<body>
  <p>The experience now opens our homepage — <a href="/">continue to EMC Tickets</a>.</p>
</body>
</html>
```

Then `git rm src/experience.js` (nothing references it once this page has no module script). Leave the `experience` input in vite.config.js as is.

- [ ] **Step 2: Remove Experience links**

1. In each of `index.html`, `what-we-do.html`, `sell-onsite.html`, `sell-online.html`, `sell-social.html`, `contact.html`: delete the nav line `<li><a href="/experience.html">Experience</a></li>`.
2. In the same 6 files, also delete the `<li><a href="/experience.html">Experience</a></li>` item from the footer "More" list. (experience.html's own nav/footer vanish with the Step 1 rewrite.)

Verify: `grep -rn 'href="/experience.html"' *.html | grep -v reveal-hero` → no output (reveal-hero's link intentionally remains; it lands on the redirect).

- [ ] **Step 3: Verify**

`npm test` → same count as Task 1 (no JS touched). `npm run build` → clean. `curl -s http://localhost:5173/experience.html | grep -c 'http-equiv="refresh"'` → `1`.

- [ ] **Step 4: Commit**

```bash
git add experience.html index.html what-we-do.html sell-onsite.html sell-online.html sell-social.html contact.html
git commit -m "feat(landing): experience.html redirects home; Experience links removed"
```

---

### Task 3: QA sweep

**Files:** modify only if fixes are needed.

- [ ] **Step 1: Suite + build + preview**

`npm test` (all pass, count recorded), `npm run build`, `npm run preview` — spot-check `/` and `/experience.html` redirect in the built output.

- [ ] **Step 2: Behavior matrix (browser)**

| Check | Expected |
|---|---|
| Fresh load of `/` | Loader → flight scrub (5 beats) → unpins into the EMC. hero → partners → fairs → tickets → 40-scene → ADMIT ONE intake → footer |
| No intro | No masked-EMC overlay anywhere; no console errors about intro |
| /experience.html | Instantly redirects to `/` |
| Nav/footers | No Experience link on any page (reveal-hero excepted) |
| Reduced motion | Flight static (poster + stacked beats), hero static, page fully readable |
| No-JS | Flight static fallback, page continues below |
| Full-journey length | Scroll from top to footer — flag if the page feels endless (runway knob at src/flight-scrub.js if so) |
| Mobile 375px | Flight mobile tier; sections legible |

- [ ] **Step 3: Commit fixes if any**

```bash
git add -A && git commit -m "fix(landing): QA polish"
```
