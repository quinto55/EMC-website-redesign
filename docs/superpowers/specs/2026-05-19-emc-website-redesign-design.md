# EMC Tickets — Website Redesign Prototype

**Date:** 2026-05-19
**Project root:** `C:\Users\Anthony Quintana\Desktop\emc-redesign`
**Goal:** Modernize the marketing presence of EMC Tickets (emctickets.com) with a 3D / interactive landing hero, preserving the existing site's content and information architecture. Deliver a static prototype that can be deployed anywhere (Vercel, Netlify, plain hosting).

## 1. Scope

In scope:

- Six pages — `index` (home), `what-we-do`, `sell-onsite`, `sell-online`, `sell-social`, `contact`.
- Interactive WebGL hero on the home page.
- Shared design system (tokens, nav, footer, sectioning) across all six pages.
- Light motion on sub-pages (one small 3D motif each), but not full hero scenes.
- Lightly-edited copy carried over from the live site (no scope changes, no new claims).

Out of scope:

- Backend / form processing — the Event Intake CTA is a static page or `mailto:`.
- CMS — content is authored in HTML.
- Analytics, A/B testing, marketing pixels.
- Production deployment to emctickets.com.
- Real customer photography (logo only; everything else abstract / illustrated).

## 2. Tech stack

- **Build:** Vite (multi-page setup — one HTML file per route, not SPA routing).
- **Language:** Vanilla JavaScript (ES modules). No framework.
- **3D:** [three.js](https://threejs.org/) for the hero canvas.
- **Animation:** CSS transitions + `IntersectionObserver`-driven class toggles for reveal/count-up. GSAP only if a specific moment can't be handled in CSS — not added by default.
- **CSS:** Hand-written, organized by tokens / base / sections / hero. No utility framework.
- **Type:** A single performant variable font (e.g. Inter Tight) loaded from `public/fonts/` to avoid third-party-script penalties.
- **Dependencies:** `three`, `vite`. That's it.

## 3. Design tokens

| Token | Value | Notes |
|---|---|---|
| `--bg` | `#07090f` | Page background (midnight) |
| `--bg-elev` | `#0e1224` | Card surfaces |
| `--bg-deeper` | `#04060c` | Footer |
| `--text` | `#f1f3f8` | Primary body |
| `--text-muted` | `#b8c1d8` | Secondary copy |
| `--text-dim` | `#7a8295` | Captions, labels |
| `--gold-1` | `#ffd66b` | Primary gold |
| `--gold-2` | `#ff9c3d` | Gold gradient end |
| `--accent-glow` | `rgba(255,170,80,.35)` | Ticket bloom / shadow |
| `--border` | `rgba(255,255,255,.08)` | Card and divider lines |
| Type scale | 12 · 14 · 16 · 18 · 22 · 28 · 40 · 64 · 96 px | Mobile down-shifts one step |
| Container | `max-width: 1200px`, gutter `clamp(20px, 4vw, 40px)` | |
| Radius | `12px` cards, `999px` pills | |

## 4. Home page architecture

In order, top to bottom:

### 4.1 Sticky top nav
Translucent on hero; on scroll past 80vh, gains a blurred dark background. Items: Industry Leader · What We Do · Sell Onsite · Sell Online · Sell Social · Contact. Right side: a gold "Event Intake" pill.

The "Industry Leader" item is an anchor link to §4.5 on the home page (`/#industry-leader`); on sub-pages it resolves to `index.html#industry-leader`. This keeps "Industry Leader" in the nav (matching the live site) without standing up a dedicated About page, which the agreed scope excludes.

### 4.2 Hero — Ticket Constellation (WebGL)

The hero is a full-viewport `<canvas>` overlaid with text and CTAs.

**Scene composition:**

- Camera: perspective, slow z-position drift.
- Background: large gradient skybox or a radial-gradient CSS layer behind the canvas (cheaper).
- Tickets: 40–60 instances of a rounded-rectangle extruded geometry, distributed in a roughly oval volume on the right two-thirds of the screen.
- Material: PBR-flavored — base color gradient gold→orange, metalness ~0.3, roughness ~0.4, a faint rim light from upper-left. Slight self-illumination so the bloom pass catches them.
- Post-processing: `UnrealBloomPass` with low threshold + low strength (subtle), only on screens ≥ 768px.

**Motion:**

- Per-ticket sine-driven y-bob (different phase + amplitude per ticket).
- Per-ticket slow yaw rotation.
- Group-level mouse parallax: pointer position offsets camera target by a small amount.
- On touch devices, `DeviceOrientation` controls parallax instead.

**Featured tickets (the "service portals"):**

- 5 of the 60 tickets are tagged as "featured" — larger scale (~1.4×), slightly closer to camera, higher emissive intensity.
- Each is mapped to a service: Festivals · Fairs · Theme Parks · Sports · Box Office.
- Hover behavior: ticket lifts forward, glow intensifies, a small floating HTML label appears (rendered as a positioned `<div>` over the canvas, not in WebGL — keeps text accessible).
- Click behavior: ticket flips 180° on its Y axis (200ms), then scrolls smoothly to the corresponding section / sub-page.
- Keyboard equivalent: hidden `<a>` tags in DOM order with proper text (e.g. "Festivals — see how we sell"). These are visually hidden but receive focus, and focusing them triggers the same hover state on the canvas. This is the accessibility fallback.

**Overlay text (HTML, not canvas):**

- Eyebrow: `SALES · SCANNING · MARKETING · ADVERTISING` (gold, letter-spaced).
- H1: "One stop ticket sale management." — second line in `linear-gradient(135deg, #ffd66b, #ff9c3d)` text fill.
- Sub: "40 years powering festivals, fairs, theme parks and sports venues across the country."
- CTAs: gold pill "Start an Event Intake" → `/contact.html`; ghost button "See what we do" → smooth-scroll to §04.

### 4.3 Retail partner strip
A dark band with the caption "RETAIL PARTNERS" and Circle K / Walgreens / Menards logos rendered as flat monochrome (no full-color logos — preserves the dark palette). Subtle horizontal drift on idle. Section reveals via opacity fade-in on scroll.

### 4.4 What We Do — 4 service cards

A 2×2 grid on desktop, 1-column on mobile. Each card:

- Small gold icon (24×24, gradient fill — can be a simple geometric SVG per service).
- Title.
- 1–2 sentence summary derived from the existing site copy, tightened for rhythm.
- Hover: cursor-tracked 3D tilt (≤ 6° per axis) + gold border-glow.

Cards (titles → summaries, all derived from existing copy):

1. **Presale & Advance** — Online, mobile, retail, and box-office channels in one inventory.
2. **Marketing & Ads** — Media buying, promotions, radio, TV, billboards, web, social.
3. **Redemption & Gate** — Fast scanning hardware with friendly UX guests don't fight.
4. **Social Management** — Professional posting and guest engagement across channels.

### 4.5 Industry Leader — "40 Years"
A two-column section. Left column: a 96px gold "40" that counts up from 0 to 40 once it enters the viewport (IntersectionObserver). Below it: small caption "YEARS IN ENTERTAINMENT". Right column: a paragraph derived from the existing "Industry Leader" copy, lightly tightened.

### 4.6 Event Intake CTA
A centered glowing pill on a soft gold radial halo. Headline ("Tell us about your event.") + a one-line subtitle + the CTA button → `/contact.html`.

### 4.7 Footer
Three columns on desktop, stacked on mobile:

- Office address: `8409 Land O Lakes Blvd, Land O Lakes, FL 34638`
- Phone: `(813) 389-9530` · 24/7: `(800) 290-2090`
- Links: Privacy · Terms · Contact
- Bottom row: `© EMC Tickets`, set quietly.

## 5. Sub-page template

Used by `what-we-do`, `sell-onsite`, `sell-online`, `sell-social`, `contact`. Each page reuses the nav + footer and applies the same tokens.

Structure:

1. **Slim hero band** — eyebrow + H1 + one-paragraph deck + one small 3D motif on the right (a single rotating gold ticket, or a slowly drifting gold line — page-specific).
2. **Body content** — long-form sections derived from the existing site copy, tightened for rhythm. Uses the same card/grid components defined for the home page where appropriate.
3. **Closing CTA strip** — same Event Intake CTA, used as a consistent conversion point.
4. **Footer** — identical to home.

The `contact` page deviates: its slim hero is followed by office details (address, phone, hours) and an `mailto:` button rather than the intake CTA.

## 6. File layout

```
emc-redesign/
├─ index.html
├─ what-we-do.html
├─ sell-onsite.html
├─ sell-online.html
├─ sell-social.html
├─ contact.html
├─ vite.config.js              # multi-page rollup input config
├─ package.json
├─ docs/
│  └─ superpowers/specs/2026-05-19-emc-website-redesign-design.md   (this file)
├─ public/
│  ├─ logo.svg                 # scraped from live site
│  └─ favicon.svg
└─ src/
   ├─ main.js                  # entry: wires nav, scroll, reveals, count-up
   ├─ nav.js                   # nav scroll behavior + active state
   ├─ reveals.js               # IntersectionObserver-driven CSS class toggles
   ├─ hero/
   │  ├─ constellation.js      # scene + render loop + parallax + lifecycle
   │  ├─ ticket.js             # geometry + material + per-instance state
   │  ├─ featured-labels.js    # HTML label overlay sync (DOM positions to ticket positions)
   │  └─ post.js               # bloom + composer setup
   ├─ motifs/
   │  ├─ rotating-ticket.js    # small sub-page motif (single ticket)
   │  └─ drifting-line.js      # alt sub-page motif
   └─ styles/
      ├─ tokens.css            # CSS variables (see §3)
      ├─ base.css              # resets, typography, layout primitives
      ├─ sections.css          # nav, cards, partner strip, CTAs, footer
      └─ hero.css              # canvas positioning + overlay text
```

Shared header/footer markup is duplicated across the six HTML files (acceptable at this scale) but their styles and behaviors live in single files in `src/`. If duplication grows painful during implementation, a small Vite plugin or build-time include can be added — not required up front.

## 7. Accessibility & performance

- **`prefers-reduced-motion: reduce`** disables: hero parallax, ticket float/rotation, count-up animation, hover tilts. Tickets render as a single static composed frame; count shows `40` directly.
- **Keyboard navigation:** featured tickets have hidden but focusable anchor tags; focus triggers the same visual lift; Enter triggers the click action. Standard nav/links/buttons keyboard accessible by default.
- **Semantic HTML:** `<header>` + `<nav>`, `<main>`, distinct `<section>`s with `aria-labelledby`, `<footer>`.
- **Mobile WebGL fallback:** under 768px, ticket count drops to ~12, bloom is disabled, pixel ratio is capped at 2.
- **Render lifecycle:** the hero's animation loop pauses when the canvas is fully scrolled out of view (`IntersectionObserver`).
- **Lighthouse targets:** Perf ≥ 85 mobile / ≥ 95 desktop; A11y ≥ 95; Best Practices ≥ 95; SEO ≥ 95.
- **No-JS fallback:** all critical copy and CTAs are real HTML and remain usable; the canvas simply doesn't render.

## 8. Copy handling

- Service summaries, "Industry Leader" body, partner list, and contact details: taken from the live site, tightened where needed for modern rhythm without altering meaning.
- Hero headline kept verbatim ("One stop ticket sale management").
- Eyebrow kept verbatim ("Sales · Scanning · Marketing · Advertising").
- No new claims, statistics, or service descriptions introduced.

## 9. Open questions deferred to implementation

These don't block the design but need pinning during the plan:

- Exact icon set for the four service cards (custom SVG vs an icon library subset).
- Where the partner logo SVGs come from (extract from emctickets.com, or simplify into flat wordmarks).
- Final font family (Inter Tight is the working default; we can swap once the look is rendered).
- Whether the Sell sub-pages need a 3-step diagram or stay typographic.

## 10. Acceptance criteria

The prototype is "done" when:

1. All six pages render with shared nav, footer, and tokens.
2. The home page hero shows the gold ticket constellation with mouse parallax and at least 5 working featured-ticket portals.
3. Hover/click/keyboard behaviors on featured tickets are wired through.
4. `prefers-reduced-motion` is respected.
5. The page is usable on mobile (one-column layout, reduced 3D, all CTAs reachable).
6. `npm run build` produces a static `dist/` folder that opens correctly when served.
7. Lighthouse mobile performance score ≥ 80 (allowing some WebGL cost) and a11y ≥ 95.
