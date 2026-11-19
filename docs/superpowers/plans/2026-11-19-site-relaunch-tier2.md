# EMC Site Relaunch, Tier 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish what the relaunch still lacks after tier 1: the demo counts tickets the way the real board now does, the desktop curtain, a gate scanning demo, a sample daily report, and a batch of small fixes carried over from the tier 1 reviews.

**Architecture:** Unchanged from tier 1: static pages rendered through `build/render.js`, pure logic modules with unit tests, thin view modules, everything complete without JavaScript.

**Tech Stack:** Vite 5 (multi-page), Vitest + happy-dom, sharp, no framework, no runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-18-site-relaunch-design.md` (sections 5.4 and 5.5), as changed by the tier 1 plan's "Changes after the plan was written" (`docs/superpowers/plans/2026-11-18-site-relaunch-tier1.md`): real-product videos replaced the click-through copies of online ordering and the box office, so no Box office click-through is built here.

**Branch:** `feature/relaunch-tier2` in the main checkout. Merge with `--no-ff`.

## Global Constraints

Every constraint in the tier 1 plan's "Global Constraints" still binds (wording, numbers, the one phone number, the one named person, sample labels, two sales channels, logo, no framework, public repo, JavaScript-off, phones first, commit trailers, the video rule, Pip is "she"). In addition:

- The real product is the authority for anything a demo shows. Read it at the commit production runs: in `~/projects/EMC-Ticketing-Platform`, `git show d4ad25e:<path>` (read only; never check out, run or change that repo). A demo may show only what is found there, in this site's own look, and uses the product's own words for labels and results.
- No fee lines in any demo, and nothing that says or implies there are no fees.
- The two boards on the home page must keep agreeing on every figure after every change.
- `npm test` exits 0 with a clean summary before every commit.

## Review Focus

1. **A visitor who leaves the page open for a long time.** Nothing a demo shows may become untrue (counts past capacity, scans past tickets, a clock past the day's close). Pinned by the long-run tests in Task 1.
2. **The curtain must never trap or delay anyone.** A phone, a reduced-motion visitor, a keyboard or screen-reader user, a failed script, a failed video, a slow laptop: each gets the page. Pinned by `tests/curtain.test.js` and the browser checks in Task 2.
3. **A visitor who tries a demo out of order or repeatedly** (scan before a ticket is shown, scan many times, restart mid-way). Pinned by the reducer tests in Task 3.
4. **A script that fails to load.** No dead controls, no hidden content. Pinned by `tests/no-js.test.js` additions in Tasks 2 and 4.

---

### Task 1: The demo counts tickets the way the real board does

The real board (production, 2026-11-19) counts Admission tickets only in "Tickets today", the pace chart, the forecast and "Admitted". Ride wristbands and parking passes are add-ons: they are listed on a line under the tile and count in gross, orders and money, never as tickets or admissions. The site's sample fair still counts everything as tickets.

**Files:**
- Modify: `src/demo/sample-fair.js`, `src/demo/board-engine.js`, `src/demo/dashboard-engine.js`, `src/demo/dashboard-markup.js`, `src/demo/dashboard-view.js`, `src/demo/board-markup.js` and `src/demo/board-view.js` only if a label or figure source must change, `src/demo/home-live.js` only if needed, and every test that pins the old figures (`tests/sample-fair.test.js`, `board-engine.test.js`, `board-view.test.js`, `dashboard-engine.test.js`, `dashboard-view.test.js`, `home-live.test.js`, `home.test.js`, `no-js.test.js`, `platform.test.js`, `pace.test.js`)

**Interfaces:**
- Produces (changes to existing exports; signatures otherwise unchanged):
  ```js
  // src/demo/sample-fair.js
  export const TICKET_TYPES = [
    { id: 'adult', name: 'Adult admission', price: 12, kind: 'admission' }, { id: 'child', name: 'Child admission', price: 6, kind: 'admission' },
    { id: 'wristband', name: 'Ride wristband', price: 30, kind: 'rides' }, { id: 'family', name: 'Family 4-pack', price: 40, kind: 'admission' },
    { id: 'parking', name: 'Parking pass', price: 10, kind: 'parking' },
  ];
  export function totals(sold): { tickets, addOns: { kind, sold }[], sales, byType, byChannel }
  // tickets: Admission tickets only. addOns: one entry per add-on kind that has sold, in the real board's order. sales, byType, byChannel: everything, as before.
  export function addOnsLine(addOns): string | null      // the real board's sentence, for example 'plus 279 parking and 788 rides'; null when none sold
  ```
  Opening figures: tickets 2,880 (1,909 + 791 + 180), add-ons 279 parking and 788 rides, sales $61,284 (unchanged), scanned 2,618 (unchanged).

- [ ] **Step 1: Read the real board** at `d4ad25e`: `app/lib/live/analytics.ts` (`addOnsLine`, `ADD_ON_WORDS`, `buildSnapshot`, the forecast), `app/components/live/counter.tsx` (the tile's sub-line), `app/components/live/pace.tsx` (`ADMISSION_SOLD`, `paceHeadline`, `typeStatus`, the ticket-type rows and their kind labels), `app/lib/live/facts.server.ts` (what counts as an admission). Use its words exactly.

- [ ] **Step 2: Write the failing tests** (change the pinned figures, and add):
```js
it('tickets are Admission tickets only; wristbands and parking are add-ons', () => {
  const t = totals(LIVE_BASELINE.sold);
  expect(t.tickets).toBe(2880); expect(t.sales).toBe(61284);
  expect(t.addOns).toEqual([{ kind: 'parking', sold: 279 }, { kind: 'rides', sold: 788 }]);
  expect(addOnsLine(t.addOns)).toBe('plus 279 parking and 788 rides');
});
it('an add-on sale moves gross, orders and money but not Tickets today or the pace line', () => {});
it('scans are admissions: scanned never passes Admission tickets sold, over a long run and from a state where they are equal', () => {});
it('the dashboard tile reads Tickets today 2,880 with the add-ons line under it, and the legend says what the chart counts', () => {
  // sub-line 'plus 279 parking and 788 rides' (it replaces the '+N since' line, as on the real board when add-ons have sold)
  // legend first label: the real board's ADMISSION_SOLD text; forecast and series count Admission only
});
it('each ticket type row names its kind, and the sell-out note uses the real words', () => {
  // kind labels as the real board prints them; "Won't sell out today", 'Sells out ~9:30 PM' style, 'Sold out'
});
it('the hero board and the dashboard still agree on every figure after 3,000 ticks', () => {});
```
The dashboard's long-run test (12,000 advances) keeps all its checks, with `tickets` meaning Admission tickets.

- [ ] **Step 3: Run** the changed test files. Expected: FAIL.

- [ ] **Step 4: Implement.** `totals` and `snapshot` report Admission tickets as `tickets`. The engine credits scans only against Admission tickets. The compact board's "Tickets sold today" shows the Admission count. On the dashboard: the tile's sub-line is the add-ons line; the pace series, forecast and chart label count Admission only; the legend's first label is the real board's; ticket type rows name their kind; the sell-out note is the real wording; the brief reads `As of 6:42 PM: 2,880 tickets sold, plus 279 parking and 788 rides, $61,284 gross, 2,618 admitted, with N projected for the day (L to H).` with N, L and H from the forecast. Gross, orders, average order, money, registers, fraud and gates' own logic do not change.

- [ ] **Step 5: Run** `npm test`. Expected: PASS, exit 0.

- [ ] **Step 6: Look at it.** `npm run dev`; `node .superpowers/tools/shots.mjs --widths 390,1280 / /platform/` and with `--nojs`; `node .superpowers/tools/home-agree.mjs` after pointing it at the dev server (it reads both home boards many times and reports disagreements). The tile shows 2,880 with the add-ons line; nothing overflows its tile at 360.

- [ ] **Step 7: Commit** `feat(demo): tickets are admission only and add-ons are listed, as on the real board`.

---

### Task 2: The curtain (computers only)

Spec section 5.4 is the requirement; read it in full. The approved mockup (`docs/superpowers/specs/assets/2026-11-18-site-relaunch/mockup.html`, the script block "the curtain") holds a working cloth drawn on a canvas, which may be reused.

**Files:**
- Create: `src/curtain/should-show.js`, `src/curtain/curtain.js`, `src/styles/curtain.css`, `public/emc-site/curtain/fair-poster.jpg`, `fair-loop.webm`, `fair-loop.mp4`, `tests/curtain.test.js`
- Modify: `index.html`, `src/entry/home.js`, `build/render.js` (a small inline script in the home page's head only), `build/pages.js` (home `styles` adds the curtain stylesheet), `public/emc-site/.htaccess` (cache the curtain files for a week), `tests/no-js.test.js`, `tests/home.test.js`

**Interfaces:**
- Produces:
  ```js
  // src/curtain/should-show.js
  export function shouldShowCurtain({ path, width, reducedMotion, hash, seen }): boolean
  // true only when: path is '/', width >= 1001, reducedMotion is false, hash is '' and seen is false
  export const CURTAIN_SEEN_KEY = 'emc-curtain-seen';       // sessionStorage; set when the curtain starts to open

  // src/curtain/curtain.js
  export function mountCurtain(doc = document, opts = {}): { open(): void, destroy(): void } | null     // null when it should not show
  ```
- The footage is not a product video: it lives in `public/emc-site/curtain/`, never in `public/emc-site/video/`, and is not in `build/videos.js`.

- [ ] **Step 1: Footage.** Copy `fair-poster.jpg` and `fair-loop.webm` from `docs/superpowers/specs/assets/2026-11-18-site-relaunch/files/`. Make the MP4 from the WebM with ffmpeg (H.264, no sound, `-movflags +faststart`), 3 MB at most.

- [ ] **Step 2: Write the failing tests** in `tests/curtain.test.js`:
```js
it('shows only on the home page, on a wide screen, with motion allowed, no anchor, first time this session', () => {
  const yes = { path: '/', width: 1280, reducedMotion: false, hash: '', seen: false };
  expect(shouldShowCurtain(yes)).toBe(true);
  expect(shouldShowCurtain({ ...yes, width: 1000 })).toBe(false);
  expect(shouldShowCurtain({ ...yes, width: 1001 })).toBe(true);
  expect(shouldShowCurtain({ ...yes, reducedMotion: true })).toBe(false);
  expect(shouldShowCurtain({ ...yes, hash: '#talk' })).toBe(false);
  expect(shouldShowCurtain({ ...yes, seen: true })).toBe(false);
  expect(shouldShowCurtain({ ...yes, path: '/platform/' })).toBe(false);
});
it('the inline head script and the module apply the same rule', () => { /* run the inline source against the same table of cases */ });
it('as served, the hero is in the HTML and nothing hides it', () => {});
it('opens on scroll down, Space, ArrowDown, PageDown, Enter, a click on the cloth and the cue button, and only once', () => {});
it('scrolling up or pressing ArrowUp does not open it and does not scroll the page', () => {});
it('opens by itself after about 6 seconds with no input', () => {});
it('marks the session when it starts to open, and does not show again in that session', () => {});
it('storage that throws does not stop it from showing or opening', () => {});
it('requests the video only when the curtain shows; never on a narrow screen', () => {});
it('a video that fails to load leaves the still on the cloth and the curtain still opens', () => {});
it('falls back to a plain slide when frames are slow', () => { /* feed slow frame times; the cloth canvas is replaced by the slide */ });
it('the cue is a real button with the text "Scroll to pull back the curtain"; the page content is never aria-hidden or inert', () => {});
it('after it has opened, page scrolling is no longer blocked and the cloth is gone from the page', () => {});
it('destroy() removes every listener, timer, frame and the video', () => {});
```
`tests/no-js.test.js`, add: the home page as served shows the hero with no cover over it when the script has not run (the stylesheet hides nothing unless the class the inline script sets is present, and that class's cover removes itself by a CSS animation after 8 seconds).

- [ ] **Step 3: Run** it. Expected: FAIL.

- [ ] **Step 4: Implement.**
  - The inline head script (home page only, a few lines, no dependencies) evaluates the same rule and, when it holds, sets `curtain-pending` on `<html>` before first paint, so the hero never flashes before the cloth. The stylesheet draws a plain cover (the poster still) over the hero while that class is present, and removes it by itself after 8 seconds through a CSS animation, in case the module never arrives.
  - The module replaces that cover with the cloth: the footage, the on-dark EMC logo at the top left, "Behind every great fair." in large white type and the cue, drawn as in the mockup. It starts the video only when it can play; until then the still shows.
  - While closed, the page does not scroll. Opening takes about 1.6 seconds: the cloth gathers and sweeps off to the right, the photo behind eases back from a slight zoom, and the headline and board rise into place, as in the mockup. Then the cloth is removed from the page and scrolling works normally. It never returns in that page view.
  - If the first frames average worse than about 24 ms, use a plain slide of the cover instead of the cloth.
  - The home page's boards, dashboard and proof strip behave exactly as they do today once the curtain is gone.

- [ ] **Step 5: Run** `npm test`. Expected: PASS, exit 0.

- [ ] **Step 6: Look at it.** With `npm run dev`, a Playwright script that captures the home page at 1280 x 800, 1440 x 900 and 1920 x 1080: closed (at load), at about 400 ms, 800 ms and 1,300 ms into the opening, and open; then at 390 x 844 and at 1280 with reduced motion (no curtain in either). Read the frames. The cloth must fill the window when closed, with the text readable; nothing may jump when it finishes. Report the home page's first-screen weight with and without the curtain.

- [ ] **Step 7: Commit** `feat(home): the curtain, on computers, pulled back by the first scroll`.

---

### Task 3: Gate scanning demo and the sample daily report

**Files:**
- Create: `src/demo/gate-scan.js`, `src/demo/gate-scan-view.js`, `src/demo/day-report.js`, `scripts/build-sample-qr.mjs`, `public/emc-site/img/sample-ticket-qr.svg`, `src/styles/demo.css`, `tests/gate-scan.test.js`, `tests/gate-scan-view.test.js`, `tests/day-report.test.js`
- Modify: `platform/index.html` (the `#gate-scanning` and `#daily-reports` blocks), `index.html` (two row labels), `build/render.js` (the `day-report` generator), `build/pages.js` (platform `styles` adds `/src/styles/demo.css`), `src/entry/platform.js`, `src/demo/sample-fair.js` (the closed day), `package.json` (dev dependency `qrcode`, script `sample-qr`), `tests/platform.test.js`, `tests/home.test.js`, `tests/no-js.test.js`

**Interfaces:**
- Produces:
  ```js
  // src/demo/gate-scan.js
  export function initialScanState(): { step: 'ready', scans: 0, firstScan: null }
  export function scanReduce(state, action): state
  // actions: { type: 'scan', at: 'h:mm PM', gate: 'Main Gate' } | { type: 'reset' }
  // ready --scan--> admitted (scans 1, firstScan { at, gate }) --scan--> refused (scans 2+; firstScan unchanged) --scan--> refused ... ; reset --> ready
  export function scanResult(state): null | { ok: boolean, title: string, detail: string }

  // src/demo/gate-scan-view.js
  export function mountGateScan(el): { destroy(): void }

  // src/demo/sample-fair.js
  export const DAY_REPORT = { day: 'Thursday', sold: { /* per type: { online, box } */ }, scannedByGate: { main, north, midway } }

  // src/demo/day-report.js
  export function renderDayReportHTML(report = DAY_REPORT): string     // root has data-sample and data-day-report
  ```

- [ ] **Step 1: Read the real product** at `d4ad25e`: how a scan is answered (`app/lib/codereadr/`, the words an accepted and a repeated scan produce, and the Scans report's labels in `app/lib/reports/scans.server.ts` and `app/routes/portal.t.$slug.events.$eventId_.reports.scans.tsx`), and the Sales report (`app/routes/portal.t.$slug.events.$eventId_.reports.sales.tsx`: its section titles "By ticket type" and "By channel", its column labels). Gates use a separate scanner app; the demo shows EMC's answer, and does not imitate that app's screens or name it.

- [ ] **Step 2: Write the failing tests.**

`tests/gate-scan.test.js`: starts ready with no result; the first scan is accepted and records when and where; the second scan of the same ticket is refused and names the first scan's time and gate; a third is still refused and the first scan is unchanged; reset returns to ready from any step; an unknown action returns the same state.

`tests/gate-scan-view.test.js`: mounting shows a phone frame with the sample ticket (the QR image, "Demo County Fair", "Adult admission", "Sample ticket. Not valid for entry.") and a button "Scan ticket"; pressing it shows the accepted result in green with its title; the button then reads "Scan the same ticket again"; pressing it shows the refused result in red, naming the first scan; "Start over" resets; every control is a `button`; results are announced through one `role="status"` element; color is never the only signal (each result has a word and an icon); the root matches `[data-sample]` and says "Sample data".

`tests/day-report.test.js`: the report names "Demo County Fair, Thursday" and "Sample data"; "By ticket type" lists the five types with their kind, tickets sold and sales, and its rows sum to the totals row; "By channel" has exactly Online and Box office and sums to the same total; "At the gates" lists the three gates and sums to the admitted total; admitted is at most the Admission tickets sold; there is no fee, tax or net column and the word "fee" appears nowhere; every number in the report is consistent with `DAY_REPORT`.

`tests/platform.test.js`: `#gate-scanning` holds `[data-demo="gate-scanning"]` and ends with the `#talk` link; `#daily-reports` holds `[data-day-report]` and ends with the `#talk` link. `tests/home.test.js`: the Gate scanning row reads "Try it"; the Daily reports row reads "See one". `tests/no-js.test.js`: the Platform page as served shows the whole sample report, and the gate scanning block shows its sentences and the sample ticket.

- [ ] **Step 3: Run** the new test files. Expected: FAIL.

- [ ] **Step 4: Implement.** The QR encodes the text `EMC-SAMPLE-TICKET` (not a web address). The sample closed day has about one and a half times Friday's opening figures, chosen so every sum is exact. The report is plain HTML tables built at build time (no script needed), in a white card on the cream page, readable at 360px (tables may scroll inside their card, never the page). Keep the two blocks' existing sentences; add under each demo the `#talk` link "Let's talk about your fair".

- [ ] **Step 5: Run** `npm test`. Expected: PASS, exit 0.

- [ ] **Step 6: Look at it.** `npm run dev`; `node .superpowers/tools/shots.mjs --widths 360,390,768,1280 /platform/` and with `--nojs`. Work the scan demo by keyboard only in a real browser.

- [ ] **Step 7: Commit** `feat(platform): gate scanning demo and a sample daily report`.

---

### Task 4: Small fixes carried over from the tier 1 reviews

One commit per item or pair of related items.

1. **Proof strip:** a late observer callback cannot replay or re-arm it (a `played` flag checked first in `play()`); a throw after arming finishes at once instead of waiting for the safety timer; a non-numeric `data-count-to` leaves the served digits alone; `finish()` resets the classes and text before it disconnects anything. Tests for each (`src/proof-count.js`, `tests/proof-count.test.js`).
2. **Home boards:** each board's render in `mountHomeLive` is isolated, so a failure in one cannot skip the other; `createDashboardView`'s setup is undone if its first render throws (`src/demo/home-live.js`, `src/demo/dashboard-view.js`, tests).
3. **Dashboard bar height:** move the rule that reserves the top bar's height from `src/styles/home.css` into `src/styles/dashboard.css`, written against the dashboard's own variables, so the Platform page stops shifting by a few pixels when its script takes over. Check both pages before and after.
4. **A pause control** for each ticking board (WCAG 2.2.2): the compact board and the dashboard each get a small "Pause" button that becomes "Resume"; on the home page one press pauses both, since they share a day. Paused boards keep their figures; nothing counts up. Tests (`src/demo/board-view.js`, `dashboard-view.js`, `home-live.js`, markup, styles).
5. **"Email Anthony" opens a useful email:** the fallback button's link carries `subject=Website inquiry`, and on the trade-show page with a card tag the script appends the card's tag to the subject. As served it works without script (`src/partials/form.html`, `src/form/ask-form.js`, tests).
6. **A menu button that cannot be dead:** the phone menu button shows only after `initNav` has run (a class the script itself sets); until then, and if the script never loads, the page links show as they do with JavaScript off (`src/nav.js`, `src/styles/chrome.css`, `tests/no-js.test.js`).
7. **Marketing headings:** the four cards' titles are `h2` (no level skipped); the fourth card's tab uses the fourth palette color so no two cards match (`marketing/index.html`, `src/styles/pages.css`, tests).
8. **Contrast:** the numeral on the teal numbered square is ink, like the amber square (4.5:1 or better) (`src/styles/base.css`).
9. **Live checker:** `--post` also fetches `/robots.txt`, `/sitemap.xml`, one stylesheet and one video from the new site and requires 200; for each event site it fails if the body carries the new site's `name="emc-site"` marker (a stray index file was promoted); a redirect that answers correctly over `http` before `https` is reported as OK with a note. Update the runbook's check counts (`scripts/check-live.mjs`, `deploy/GO-LIVE.md`, `tests/go-live.test.js`).
10. **Compression:** a guarded `mod_deflate` rule in `public/emc-site/.htaccess` for CSS, JavaScript, SVG and JSON.
11. **Runbook:** say to download any file that the listing check reports as a clash before overwriting it; add `href="/?` to the old-page search terms; pair the `/?s=test` check with a status check (`deploy/GO-LIVE.md`).
12. **Clean-ups:** remove the three font packages nothing imports; the unused parameter and token in `build/render.js`; the duplicate assertions and the pinned date in `tests/site-integrity.test.js`; the dead rule in `src/styles/pages.css`.

- [ ] Each item: write or change its test first where it changes behavior, see it fail, make it pass, commit.
- [ ] `npm test` exits 0 at the end; `bash scripts/build-host.sh` still produces the twelve top-level entries.

---

### Task 5: Finish (controller)

- [ ] `npm test`, a production build, and the browser pass over every page at 360, 390, 768, 1024 and 1280, plus the curtain at three computer sizes.
- [ ] Re-test the host rules on the stand-in Apache (`.superpowers/tools/host-sim/README.md`) with the updated checker and the compression rule.
- [ ] Final whole-branch review by a fresh reviewer; one fix wave; one re-review.
- [ ] Merge to `main` with `--no-ff`, push, redeploy staging, rebuild the host package.
