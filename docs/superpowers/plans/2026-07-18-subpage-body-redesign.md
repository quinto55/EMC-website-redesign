# Sub-Page Body Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the memo-style prose bodies of the four product pages with a digestible component rhythm (lede → flow strip → feature tiles → stat pull → intake) in the site's established visual language.

**Architecture:** One shared CSS kit block appended to `src/styles/sections.css` (`.body-lede`, `.feature-grid`/`.feature`, `.stat-pull`, `.flow`); each page's body markup rebuilt from its own existing copy. Markup + CSS only — zero JS changes; sub-pages keep the legacy `data-reveal` path via `sub.js` untouched.

**Tech Stack:** Existing stack (Vite, vanilla CSS tokens, vitest suite must stay at 53 passing, unmodified).

**Spec:** `docs/superpowers/specs/2026-07-18-subpage-body-redesign-design.md`

## Global Constraints

- Markup + CSS only; zero JS changes; all 53 tests pass unmodified.
- Copy rules (hard): every existing fact/claim survives; additions limited to eyebrows, card titles, stat captions derived from on-page sentences. Exact stat figures: `50%+` (what-we-do, sell-online), `24/7` (sell-onsite), `11 months` (sell-social).
- Feature tiles do NOT carry `data-hotspot` (sub.js doesn't run the hotspot module); hover is pure CSS border/shadow.
- All icons: `viewBox="0 0 40 40"`, `fill="none"`, `stroke="url(#gold-grad)"`, `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, class `feature__icon`, `aria-hidden="true"`.
- Each of the four pages gains the hidden gradient defs block (verbatim, directly after `<body>`):
```html
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffd66b"/>
        <stop offset="100%" stop-color="#ff9c3d"/>
      </linearGradient>
    </defs>
  </svg>
```
- The intake section on every page is untouched. Subheroes untouched. contact.html untouched.
- `.prose` CSS rules removed in Task 3 (verified unused after these rebuilds).
- Commit after every task with the exact message given.

---

### Task 1: Kit CSS + what-we-do body

**Files:**
- Modify: `src/styles/sections.css` (append kit), `what-we-do.html` (defs block + body rebuild)

**Interfaces:**
- Produces: kit classes `.body-lede`, `.feature-grid`, `.feature`, `.feature__icon/__title/__body`, `.stat-pull`, `.stat-pull__figure/__caption`, `.flow`, `.flow__step`, `.flow__num`, `.flow__title`, `.flow__body` — Tasks 2–3 build pages with these exact class names.

- [ ] **Step 1: Append the kit CSS**

At the END of `src/styles/sections.css`, add:

```css
/* --- Sub-page body kit: lede, feature tiles, stat pull, flow strip --- */
.body-lede {
  text-align: center;
  max-width: 760px;
  margin: 0 auto;
}

.body-lede h2 { margin-bottom: 16px; }

.body-lede p {
  font-size: var(--fs-22);
  line-height: 1.5;
  margin: 0 auto;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  max-width: 900px;
  margin: 56px auto 0;
}

.feature {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 24px;
  transition: border-color 250ms var(--ease), box-shadow 250ms var(--ease);
}

.feature:hover {
  border-color: rgba(255, 214, 107, 0.35);
  box-shadow: 0 20px 60px -30px var(--accent-glow);
}

.feature__icon {
  width: 28px;
  height: 28px;
  margin-bottom: 14px;
}

.feature__title {
  font-size: var(--fs-18);
  margin-bottom: 6px;
}

.feature__body { font-size: var(--fs-16); }

.stat-pull {
  text-align: center;
  padding: 72px 0 24px;
}

.stat-pull__figure {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(56px, 9vw, 120px);
  line-height: 1;
  color: var(--text);
}

.stat-pull__caption {
  margin: 16px auto 0;
  max-width: 46ch;
  color: var(--text-muted);
}

.flow {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  max-width: 900px;
  margin: 56px auto 0;
}

.flow::before {
  content: '';
  position: absolute;
  top: 22px;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold-deck), transparent);
}

.flow__step {
  position: relative;
  text-align: center;
}

.flow__num {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg);
  border: 1px solid var(--gold-deck);
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 700;
  font-size: var(--fs-18);
  color: var(--gold-1);
  margin-bottom: 14px;
}

.flow__title {
  font-size: var(--fs-18);
  margin-bottom: 6px;
}

.flow__body { font-size: var(--fs-16); }

@media (max-width: 768px) {
  .feature-grid { grid-template-columns: 1fr; }
  .flow { grid-template-columns: 1fr; gap: 24px; }
  .flow::before { display: none; }
}
```

- [ ] **Step 2: Add the gold-grad defs block to what-we-do.html**

Insert the defs block from Global Constraints verbatim, directly after `<body>`.

- [ ] **Step 3: Rebuild the what-we-do body**

Replace the ENTIRE `<section class="section"><div class="container prose">…</div></section>` block (everything between the subhero's `</section>` and the intake `<section class="section intake"`) with:

```html
    <section class="section">
      <div class="container">
        <div class="body-lede" data-reveal>
          <h2>Built for events that move.</h2>
          <p>Festivals, fairs, water and theme parks, sports — every event has the same problem in different costumes: get a ticket into every interested hand, scan it fast at the gate, and keep guests coming back. Forty years of doing that gives us the muscle memory.</p>
        </div>

        <div class="feature-grid">
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 12h28v6a3 3 0 0 0 0 6v6H6v-6a3 3 0 0 0 0-6z"/>
              <path d="M25 12v3M25 19v3M25 26v3" stroke-dasharray="2 3"/>
            </svg>
            <h3 class="feature__title">Presale &amp; Advance Tickets</h3>
            <p class="feature__body">Online, mobile, social, retail, box office. One inventory.</p>
          </article>
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M7 17v8l14 5V12z"/>
              <path d="M7 17H5v8h2M12 27v6h5v-4"/>
              <path d="M26 15a7 7 0 0 1 0 12M29 11a12 12 0 0 1 0 20"/>
            </svg>
            <h3 class="feature__title">Marketing &amp; Advertising</h3>
            <p class="feature__body">Media buying, promotions, radio, TV, billboards, web, mobile, social.</p>
          </article>
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 14v-4a2 2 0 0 1 2-2h4M26 8h4a2 2 0 0 1 2 2v4M32 26v4a2 2 0 0 1-2 2h-4M14 32h-4a2 2 0 0 1-2-2v-4"/>
              <path d="M6 20h28"/>
            </svg>
            <h3 class="feature__title">Redemption &amp; Box Office Systems</h3>
            <p class="feature__body">Modern hardware and software for fast, friendly admission.</p>
          </article>
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 10h18v11H12l-6 5z"/>
              <path d="M28 16h6v11h-3l-4 4v-4h-7v-4"/>
            </svg>
            <h3 class="feature__title">Social Media Management</h3>
            <p class="feature__body">Posting, response, guest support across the channels your buyers actually use.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="stat-pull" aria-label="Retail sales share">
      <div class="container" data-reveal>
        <p class="stat-pull__figure"><span class="gold-text">50%+</span></p>
        <p class="stat-pull__caption">Retail partners alone produce 50% or more of advance and presale ticket programs for most operators — consumers still prefer brick-and-mortar. We've spent decades wiring those partner networks together.</p>
      </div>
    </section>
```

- [ ] **Step 4: Verify**

`npm test` → 53/53. `curl -s http://localhost:5173/what-we-do.html | grep -c "feature__title"` → `4`; `grep -c "stat-pull__figure"` → `1`; `grep -c "container prose"` → `0`.

- [ ] **Step 5: Commit**

```bash
git add src/styles/sections.css what-we-do.html
git commit -m "feat(subpages): body kit (lede, tiles, stat pull, flow) + what-we-do rebuild"
```

---

### Task 2: sell-onsite + sell-online bodies

**Files:**
- Modify: `sell-onsite.html`, `sell-online.html` (defs block + body rebuild each)

**Interfaces:**
- Consumes: Task 1's kit classes exactly as named.

- [ ] **Step 1: sell-onsite.html**

Add the gold-grad defs block after `<body>` (verbatim from Global Constraints). Replace the prose section (between subhero close and intake) with:

```html
    <section class="section">
      <div class="container">
        <div class="body-lede" data-reveal>
          <h2>State of the art, used by humans.</h2>
          <p>Our redemption and sales systems are simple enough that seasonal staff can run them on day one, and fast enough that lines don't form. Onsite isn't an afterthought — for most operators it's still where the majority of guests buy.</p>
        </div>

        <div class="flow">
          <div class="flow__step" data-reveal>
            <span class="flow__num" aria-hidden="true">1</span>
            <h3 class="flow__title">Walk up</h3>
            <p class="flow__body">Box-office POS handles walk-ups, upgrades, and group sales.</p>
          </div>
          <div class="flow__step" data-reveal>
            <span class="flow__num" aria-hidden="true">2</span>
            <h3 class="flow__title">Scan</h3>
            <p class="flow__body">High-throughput scanners with offline-safe sync.</p>
          </div>
          <div class="flow__step" data-reveal>
            <span class="flow__num" aria-hidden="true">3</span>
            <h3 class="flow__title">In</h3>
            <p class="flow__body">Fast enough that lines don't form.</p>
          </div>
        </div>

        <div class="feature-grid">
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 14v-4a2 2 0 0 1 2-2h4M26 8h4a2 2 0 0 1 2 2v4M32 26v4a2 2 0 0 1-2 2h-4M14 32h-4a2 2 0 0 1-2-2v-4"/>
              <path d="M6 20h28"/>
            </svg>
            <h3 class="feature__title">High-Throughput Scanners</h3>
            <p class="feature__body">High-throughput scanners with offline-safe sync.</p>
          </article>
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 18h24v12H8z"/>
              <path d="M12 18v-6h16v6"/>
              <path d="M12 23h4M18 23h4M24 23h4M12 27h4M18 27h4"/>
            </svg>
            <h3 class="feature__title">Box-Office POS</h3>
            <p class="feature__body">Box-office POS for walk-ups, upgrades, and group sales.</p>
          </article>
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M30 14a12 12 0 0 0-20-3M10 8v6h6"/>
              <path d="M10 26a12 12 0 0 0 20 3M30 32v-6h-6"/>
            </svg>
            <h3 class="feature__title">Real-Time Inventory</h3>
            <p class="feature__body">Real-time inventory shared with online and retail channels.</p>
          </article>
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 22a12 12 0 0 1 24 0"/>
              <path d="M8 22h4v8H8zM28 22h4v8h-4z"/>
              <path d="M32 30a6 6 0 0 1-6 4h-4"/>
            </svg>
            <h3 class="feature__title">Training &amp; Support</h3>
            <p class="feature__body">Onsite training and dedicated support during your event window.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="stat-pull" aria-label="Event support">
      <div class="container" data-reveal>
        <p class="stat-pull__figure"><span class="gold-text">24/7</span></p>
        <p class="stat-pull__caption">Onsite training and dedicated support during your event window.</p>
      </div>
    </section>
```

- [ ] **Step 2: sell-online.html**

Add the defs block after `<body>`. Replace the prose section with:

```html
    <section class="section">
      <div class="container">
        <div class="body-lede" data-reveal>
          <h2>One inventory, every channel.</h2>
          <p>The buyer doesn't care whether they're on your site, in a Circle K, or scrolling Facebook on the way home from work. We make the experience feel like one storefront — and the inventory like one ledger.</p>
        </div>

        <div class="flow">
          <div class="flow__step" data-reveal>
            <span class="flow__num" aria-hidden="true">1</span>
            <h3 class="flow__title">Browse</h3>
            <p class="flow__body">One storefront feel — your site, retail, or social.</p>
          </div>
          <div class="flow__step" data-reveal>
            <span class="flow__num" aria-hidden="true">2</span>
            <h3 class="flow__title">Pay</h3>
            <p class="flow__body">Mobile-first checkout with Apple Pay and Google Pay.</p>
          </div>
          <div class="flow__step" data-reveal>
            <span class="flow__num" aria-hidden="true">3</span>
            <h3 class="flow__title">Gate</h3>
            <p class="flow__body">One inventory, one ledger — the ticket just works.</p>
          </div>
        </div>

        <div class="feature-grid">
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 12h28v6a3 3 0 0 0 0 6v6H6v-6a3 3 0 0 0 0-6z"/>
              <path d="M25 12v3M25 19v3M25 26v3" stroke-dasharray="2 3"/>
            </svg>
            <h3 class="feature__title">One-Click Presale</h3>
            <p class="feature__body">One-click presale and advance technology.</p>
          </article>
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M13 6h14a2 2 0 0 1 2 2v24a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
              <path d="M17 30h6"/>
              <path d="M22 16a5 5 0 0 1 0 6M25 13a9 9 0 0 1 0 12"/>
            </svg>
            <h3 class="feature__title">Mobile-First Checkout</h3>
            <p class="feature__body">Mobile-first checkout with Apple Pay and Google Pay.</p>
          </article>
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 20 20 6h14v14L20 34z"/>
              <circle cx="27" cy="13" r="2"/>
            </svg>
            <h3 class="feature__title">Promo &amp; Pricing Tools</h3>
            <p class="feature__body">Promo codes, group pricing, and timed-entry windows.</p>
          </article>
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 32h24"/>
              <path d="M12 32V20M20 32V12M28 32V24"/>
            </svg>
            <h3 class="feature__title">Channel Reporting</h3>
            <p class="feature__body">Reporting that ties online sales back to the channel that earned them.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="stat-pull" aria-label="Retail sales share">
      <div class="container" data-reveal>
        <p class="stat-pull__figure"><span class="gold-text">50%+</span></p>
        <p class="stat-pull__caption">Retail outlets remain a powerful complement — they produce 50% or more of advance / presale ticket programs for most operators. We treat brick-and-mortar as a first-class sales channel, not a fallback.</p>
      </div>
    </section>
```

- [ ] **Step 3: Verify**

`npm test` → 53/53. For each page: `curl -s http://localhost:5173/<page>.html | grep -c "flow__step"` → `3`; `grep -c "feature__title"` → `4`; `grep -c "container prose"` → `0`.

- [ ] **Step 4: Commit**

```bash
git add sell-onsite.html sell-online.html
git commit -m "feat(subpages): sell-onsite and sell-online bodies rebuilt on the kit"
```

---

### Task 3: sell-social body + .prose removal

**Files:**
- Modify: `sell-social.html` (defs + body), `src/styles/sections.css` (remove .prose rules)

**Interfaces:**
- Consumes: Task 1's kit classes.

- [ ] **Step 1: sell-social.html**

Add the defs block after `<body>`. Replace the prose section with:

```html
    <section class="section">
      <div class="container">
        <div class="body-lede" data-reveal>
          <h2>Social is where your event lives between gates.</h2>
          <p>Most attendees decide to come back during the eleven months you're not running an event. Social is the only channel that stays open the whole time — so we treat it like one.</p>
        </div>

        <div class="feature-grid">
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8 10h24v22H8z"/>
              <path d="M8 16h24M14 6v6M26 6v6"/>
            </svg>
            <h3 class="feature__title">Editorial &amp; Creative</h3>
            <p class="feature__body">Editorial calendar and on-brand creative production.</p>
          </article>
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M7 17v8l14 5V12z"/>
              <path d="M7 17H5v8h2M12 27v6h5v-4"/>
              <path d="M26 15a7 7 0 0 1 0 12M29 11a12 12 0 0 1 0 20"/>
            </svg>
            <h3 class="feature__title">Paid Promotion</h3>
            <p class="feature__body">Paid promotion across Meta, TikTok, and YouTube Shorts.</p>
          </article>
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 10h18v11H12l-6 5z"/>
              <path d="M28 16h6v11h-3l-4 4v-4h-7v-4"/>
            </svg>
            <h3 class="feature__title">Guest Support</h3>
            <p class="feature__body">Replies, DMs, lost-and-found triage.</p>
          </article>
          <article class="feature" data-reveal>
            <svg class="feature__icon" viewBox="0 0 40 40" fill="none" stroke="url(#gold-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M16 24l8-8"/>
              <path d="M14 18l-4 4a5 5 0 0 0 7 7l4-4"/>
              <path d="M26 22l4-4a5 5 0 0 0-7-7l-4 4"/>
            </svg>
            <h3 class="feature__title">Sales Tie-Ins</h3>
            <p class="feature__body">Tie-ins with the same sales and presale channels your box office uses.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="stat-pull" aria-label="Off-season months">
      <div class="container" data-reveal>
        <p class="stat-pull__figure"><span class="gold-text">11 months</span></p>
        <p class="stat-pull__caption">Most attendees decide to come back during the eleven months you're not running an event. Social is the only channel that stays open the whole time.</p>
      </div>
    </section>
```

- [ ] **Step 2: Remove the dead .prose rules**

In `src/styles/sections.css`, delete the `.prose` block (all rules whose selector starts with `.prose`). Verify first that nothing references it anymore:
```bash
grep -rn "prose" *.html src/ | grep -v node_modules
```
Expected: only the sections.css rules themselves — then delete them; re-run the grep → no output.

- [ ] **Step 3: Verify**

`npm test` → 53/53. `curl -s http://localhost:5173/sell-social.html | grep -c "feature__title"` → `4`; `grep -c "11 months"` → `1` (the caption spells out "eleven months"). `npm run build` → clean.

- [ ] **Step 4: Commit**

```bash
git add sell-social.html src/styles/sections.css
git commit -m "feat(subpages): sell-social body rebuilt; drop dead prose styles"
```

---

### Task 4: QA sweep

**Files:** modify only if fixes are needed.

- [ ] **Step 1: Suite + build**

`npm test` → 53/53. `npm run build` → clean.

- [ ] **Step 2: Behavior matrix (browser)**

| Check | Expected |
|---|---|
| Each product page | lede → (flow on onsite/online) → 4 tiles → big stat → intake; icons render gold-gradient; staggered reveals fire |
| Copy audit | Every original sentence findable on its page; no invented claims |
| Stat figures | 50%+ / 24/7 / 50%+ / 11 months with shimmer on the figure |
| Mobile 375px | Tiles + flow stack to one column; connector line hidden; stat scales down |
| Reduced motion | Everything visible instantly, no motion |
| contact.html + homepage | Byte-identical behavior to before |

- [ ] **Step 3: Commit fixes if any**

```bash
git add -A && git commit -m "fix(subpages): QA polish"
```
