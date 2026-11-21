# EMC site relaunch for IAFE: Design

**Date:** 2026-11-18
**Status:** Build started 2026-11-18 (Anthony: "Please continue the website
redesign"). Claude's calls in section 7 and the open questions in section 8
still need his answers; none of them blocks the tier 1 build.
**Build plan:** `docs/superpowers/plans/2026-11-18-site-relaunch-tier1.md`
**Approved mockup:** `docs/superpowers/specs/assets/2026-11-18-site-relaunch/mockup.html`
(open it through any local web server; it is the reference for the look, the
copy on the home page and the curtain behavior)

## 1. Why this exists

EMC's public site at emctickets.com is a WordPress site that describes the
company in words and shows none of the product. EMC now has a real ticketing
platform (online sales, box office, scanning, live reporting) and is going to
the IAFE convention in Louisville to sell it:

- Convention: Nov 29 to Dec 3, 2026. Trade show: Nov 30 to Dec 1. EMC is at
  Booth #410.
- The folder cards handed out at the booth carry QR codes that point at
  `https://emctickets.com/iafe/`, which returns 404 today.
- An email invite to about 200 fair contacts is going out Nov 18 to 25, so
  fair managers will be looking at the site before the show.

The new site takes over the main pages of emctickets.com from WordPress.
Target go-live: **Wednesday Nov 25, 2026**, so it is settled before
Thanksgiving and before the show. How it goes live changed after review:
the domain is not repointed (section 5.13).

**Who it is for.** First: a fair or festival manager, or a fair board member,
deciding whether EMC is worth a conversation. Many arrive on a phone from a QR
code. Second: a ticket buyer or an existing client who lands on the home page
and needs to find tickets or sign in.

**What it has to do.** Show the product working, then lead the visitor to
contact Anthony so EMC can close the sale. In Anthony's words: the redesign is
mostly "show the real product working" and "a better look and ease of use",
and "we want the sales funnels (after display) to lead to them contacting us
so we can close the sale."

## 2. Goals, non-goals, anti-goals

### Goals

1. **Show the product.** A fair manager can click through what selling online,
   selling at the box office, scanning at the gate and watching the live board
   look like, without signing up.
2. **One ask everywhere.** Every page and every demo ends in the same ask,
   "Let's talk about your fair", with a short form that reaches Anthony.
3. **The approved look.** The "Sunny board" look with the full-photo hero, and
   on computers a curtain that pulls back on the first scroll.
4. **Working utilities.** "Find my tickets" and "Client login" go to the real
   ticketing app. The contact form really delivers.
5. **Take over from WordPress with no dead ends.** `/iafe/` is live for the
   card QR codes, every old marketing address lands somewhere sensible, and
   the event pages that live under the domain keep working.
6. **Good on a phone first.** Phone visitors get the page at once, fast, with
   no curtain.

### Non-goals (not in this build)

- Pricing or per-ticket fees anywhere on the site.
- Any change to the ticketing app (`~/projects/EMC-Ticketing-Platform`).
- Live embeds of the real product. The app blocks framing and has no public
  demo for most features (section 4).
- Consumer pages for a specific fair's ticket deals (like the current
  `/greater-jacksonville-fair/`). The site should not make these hard to add
  later, but none ships now.
- A blog, a CMS, a client list page, case studies, careers.
- New analytics accounts. The consent and analytics code stays as it is, with
  empty IDs (inert).
- Keeping the July "carnival ticket" design or its drone-flight experience.
  They are retired from the live pages and stay in git history.

### Anti-goals (the build has failed if any of these is true)

- It looks AI-made or like a stock template.
- A number or claim appears that EMC has not approved (section 3.2).
- A demo could be mistaken for live data or a real checkout.
- The curtain blocks or slows a phone visitor, or delays the first view of the
  page on any device.
- A visitor fills in the form and the lead is silently lost.
- Anthony's cell number, or any phone number other than the toll-free number,
  appears on the site.
- Any of the 18 live event pages under the domain (section 3.6) stops
  working, or email for emctickets.com is disturbed.

## 3. Constraints

### 3.1 Dates

- Staging ready for Anthony to review by **Mon Nov 23**.
- Fixes and a real end-to-end form test on **Tue Nov 24**.
- Go-live **Wed Nov 25**, early in the day.
- Section 10 gives the build order so the site can still go live on time if
  the later tiers are not finished.

### 3.2 Wording and facts

EMC sales material follows rules that apply to every page here:

- No em dashes.
- No invented numbers. The only numbers allowed are the ones listed below.
- No "lowest price" or similar claim. No pricing or fees.
- Each page reads as a short story that ends in one prominent ask.
- Use the new three-red-ticket EMC logo, not the old gold wordmark.

Approved wording, to be used exactly where it appears:

- "One system from first ticket to final report."
- Sell: Online sales, Flash sales, Box office POS.
  Scan: Any gate, duplicates blocked. Barcode or QR. RFID wristbands later in
  2027.
  Count: Real-time validation. Daily reports. 24/7 dashboard.
- "40+ years in the industry"
- "The Florida State Fair, South Carolina State Fair and Coastal Carolina Fair
  all run their retail ticketing through EMC." (keep this sentence exactly; do
  not shorten it to "use EMC" or similar)
- "EMC is the exclusive event ticket partner of Walgreens."
- "8,000+ retail locations"
- "78% of Americans live within 5 miles of a Walgreens" with "Source:
  Walgreens." beside it.
- Walgreens "How it works" (from folder card 1):
  1. You set the tickets. You get free in-store posters, counter displays and
     signage.
  2. Walgreens sells them. Advance-sale promotions catch impulse buyers at the
     counter.
  3. Your revenue is locked in before the weather. Tickets are pre-sold and
     non-refundable.
  4. You get paid within 30 days of your event. No chargebacks. No credit card
     fees.
- "Same benefits at" Circle K and Menards.
- "Get a free in-store mockup of your event."
- Booth demos: RFID wristbands, Box office POS, Interactive fair map, our
  ticket-buyer call line, Pip (our talking AI clown for the front gate).
- "Let's talk about your fair."

Source of record for this wording: `~/projects/emc-iafe-onesheet/src/card-walgreens.html`
and `card-platform.html`.

The current WordPress pages carry other numbers (9.6 million daily customer
interactions, 56% female, $80,000 average income, 63% within 3 miles, "50% or
more of advance sales"). **None of those carry over.**

### 3.3 Contact details

- Anthony Quintana, `anthony@emctickets.com`. He is the first contact.
- Toll free, 24/7: 800-290-2090.
- Office address (footer and contact page): 8409 Land O Lakes Blvd, Land O
  Lakes, FL 34638.
- Legal contact in privacy and terms: `info@emctickets.com` (already in
  `src/site-config.js`).
- No other phone numbers and no other named people.

### 3.4 The existing project

- Repo: `quinto55/EMC-website-redesign`, public, at
  `/mnt/c/Users/Anthony Quintana/projects/EMC-website-redesign`.
- Static HTML pages, Vite 5 multi-page build, Vitest with happy-dom, GSAP
  available. No framework. Keep it that way.
- `vite.config.js` polls for file changes because the checkout is on a
  Windows drive under WSL. Keep that.
- `src/site-config.js`, `src/consent.js`, `src/analytics.js` and their tests
  stay. Analytics IDs are empty, so nothing loads.
- The repo is public, so nothing secret goes in it.
- Workflow in this repo: feature branches in the main checkout (no
  worktrees), merge with `--no-ff`, push when the plan's branches are merged.

### 3.5 Facts about the ticketing app (checked 2026-11-18)

- These load for a logged-out visitor and can be linked today:
  `https://app.emctickets.com/recover` (buyer ticket lookup),
  `https://app.emctickets.com/portal/login` (client sign-in),
  `https://app.emctickets.com/pos/tour` (14-step box-office tour, sample data).
- There is no public demo of the storefront, gate scanning or the live board.
  The live board demo needs a client login.
- The app sends `X-Frame-Options: DENY` and `frame-ancestors 'none'`, so
  nothing from it can be shown inside this site.
- The app has no contact or lead endpoint and refuses form posts from other
  sites.

### 3.6 The domain and its host today (checked 2026-11-18)

- **Eighteen event sites live in folders under the domain**, each its own
  WordPress install on the same host, all loading today: `/flstatefair/`,
  `/scstatefair/`, `/coastalcarolinafair/`, `/coastalcarolina-fairground/`,
  `/ccfair-tripleb/`, `/santaseforest/`, `/northfloridafair/`,
  `/reithofferfestivals/`, `/countrythunderfl/`, `/countrythunderwi/`,
  `/chicagofootballclassic/`, `/biggarlandfair/`, `/kansascityrenfest/`,
  `/michiganrenfest/`, `/minnesotarenfest/`, `/newyorkrenfair/`,
  `/stlouisrenfest/`, `/renaissancefestivals/`. They are not in the main
  site's sitemap. `/flstatefair/` is current: it is the Walgreens advance-sale
  page for the 2027 Florida State Fair, on sale in stores through 2/15/27.
  **These must keep working.** Repointing the domain would take all of them
  down at once.
- The main WordPress site also has working pages outside the marketing
  pages: `/event-intake-form/` (a long client intake form), `/event-list/` (a
  directory of event and partner sites, including the 18 above),
  `/circle-k-video/` and `/greater-jacksonville-fair/` (a Walgreens deal page
  for a fair that ended Nov 15).
- The host is a shared Apache server at `162.144.98.42`. Claude has no access
  to it today.
- The WordPress site loads Google Tag Manager container `GTM-WXP79P4D`.
- DNS is managed at GoDaddy (nameservers `ns51/ns52.domaincontrol.com`).
- `emctickets.com` A record: `162.144.98.42`. `www` is a CNAME to
  `emctickets.com`.
- Email is Microsoft 365 (MX `emctickets-com.mail.protection.outlook.com`).
- `app.emctickets.com` points at `159.65.38.62` (the ticketing app). So does
  a catch-all `*` record: any other subdomain, such as a fair's storefront at
  `<fair>.emctickets.com`, resolves to the app.
- Under the chosen go-live (section 5.13) no DNS record changes at all.

### 3.7 Images and footage

- The hero photo and curtain footage in the mockup are stand-ins made with AI
  for earlier EMC projects: `Coastal-Carolina-Fair-/assets/img/midway-golden-hour.jpg`
  and `assets-src/flight/seg1.mp4`. The photo has a garbled sign at the bottom
  right that must stay cropped out.
- Real photos or footage of a client fair need that fair's permission. None is
  cleared today. The build uses the stand-ins and makes each a one-file swap.
- Partner logos already in `public/logos/` (Walgreens, Circle K, Menards).
- The new EMC logo exists only as a small PNG (309 x 250). It is fine at
  header size. Do not scale it up.
- Do not use anything from `Desktop/EMC Master`.

## 4. Approaches considered

**1. Self-contained site (chosen).** The site is rebuilt in this repo and
published as static files. Demos are built into the pages as click-throughs
with sample data, modeled on the real product's screens and labeled as
samples. The box-office demo also links to the real tour. The contact form is
delivered by an outside form service. The ticketing app is not touched.
Trade-off: the demos are faithful copies rather than the live product, and one
outside service handles the form.

**2. Real product behind every demo.** Add public demo modes and a contact
endpoint to the ticketing app and have the site open them. It is the most
honest version of "the real product". It needs several changes and releases
to the production ticketing system in the week before IAFE, the same system
being demoed at the booth, and it needs the app's framing and cross-site rules
loosened. Rejected for now on risk and time. It is the right follow-up after
the show for the demos that earn it.

**3. Recordings instead of demos.** Screen recordings of the real product in
each section. Fastest, and it is the real product. Rejected because there is
nothing to click, which was the point, and today's screens show test data.

Anthony talks about outcomes and left the how to Claude. Claude chose
approach 1 and told him so on 2026-11-18. Where the static files are served
from was revised the same day after review; see section 5.13.

## 5. What gets built

### 5.1 Pages and addresses

All pages are directories with a trailing slash, to match the old WordPress
addresses.

| Address | Page | In the top menu |
|---|---|---|
| `/` | Home | logo |
| `/platform/` | Platform, with the demos | Platform |
| `/retail-partners/` | Walgreens, Circle K and Menards | Retail partners |
| `/marketing/` | EMC's marketing services | Marketing |
| `/about/` | About EMC | About |
| `/contact/` | Contact form and details | (the "Let's talk" button) |
| `/iafe/` | Landing page for the folder-card QR codes | not in the menu |
| `/privacy/`, `/terms/` | Legal | footer |
| `404.html` | Not found | |

**Header (every page).** Logo, then Platform, Retail partners, Marketing,
About. On the right: "Find my tickets" (to `https://app.emctickets.com/recover`),
"Client login" (to `https://app.emctickets.com/portal/login`), and a red
"Let's talk" button. On phones: logo, "Let's talk", and a menu button that
opens the four pages plus the two utility links.

**Footer (every page).** Logo, the four pages, Find my tickets, Client login,
address, email, toll-free number, Privacy, Terms, cookie settings.

**The ask band (bottom of every page).** Red rounded band: "Let's talk about
your fair.", "Anthony Quintana · anthony@emctickets.com", "Toll free, 24/7
800-290-2090", and the form (section 5.9). It has the id `talk`.

**Old addresses.** The old marketing pages are sent on with permanent (301)
redirects set on the web host (section 5.13):

| Old address | Goes to |
|---|---|
| `/what-we-do/` | `/platform/` |
| `/online/` | `/platform/#online-sales` |
| `/onsite/` | `/platform/#box-office` |
| `/social/` | `/marketing/` |
| `/contact-us/` | `/contact/` |
| `/privacy-and-terms/` | `/privacy/` |
| `/walgreens/` | `/retail-partners/` |
| `/events/` (an empty page) | `/` |

`/about/` keeps its address and gets the new page. **Everything else on the
host is left exactly as it is and keeps working through WordPress:** the 18
event sites, `/event-intake-form/`, `/event-list/`, `/circle-k-video/` and
`/greater-jacksonville-fair/`. They keep the old look. The new site does not
link to them.

### 5.2 The look

The mockup is the reference. Its values:

- Colors: ink `#1b1f2a`, muted text `#5d6370`, line `#ecdfca`, page cream
  `#fff8ec`, EMC red `#cf1a22` (button shadow `#9d1218`), teal `#0e9c84`,
  amber `#f2a900`, highlight yellow `#ffd66b`. Tile tints `#fdebe9`,
  `#e1f4f0`, `#fff1cc`.
- Type: Bricolage Grotesque 700 for headings (tight letter spacing), Figtree
  for text, DM Mono for small labels. Self-hosted, with `font-display: swap`.
- Shapes: pill buttons with a hard drop shadow, white cards with 22 to 24px
  corners, numbered colored squares (01, 02, 03), a "● LIVE" green pill and a
  "Sample data" amber pill.
- Everything below the hero is light and cream. Only the hero is on a photo.

The July design system (Fraunces, Inter Tight, navy and gold, ticket shapes)
is not used on the new pages.

### 5.3 Home page

Sections, in order (copy as in the mockup):

1. **Hero on the full photo.** Small label "Ticketing for fairs and
   festivals". Headline "One system from first ticket to final report." with
   "first ticket" and "final report" in yellow. Line: "Sell everywhere, scan
   at any gate and watch every ticket count as it happens." Buttons: "Let's
   talk about your fair" (to the ask band) and "See it work" (to
   `/platform/`). On the right, the live sample board (below) with a small
   "Running right now" chip.
2. **Proof strip**, overlapping the bottom of the photo: "40+ years in the
   industry", the three-fairs sentence, and the Walgreens, Circle K and
   Menards logos.
3. **Sell. Scan. Count.** Line: "Pick any tool and try it yourself. No
   sign-up." Three cards:
   - 01 Sell, "Online, at the window and in stores.": Online sales (Try it),
     Box office POS (Try it), Retail stores (See how).
   - 02 Scan, "Any gate. Duplicates blocked.": Gate scanning (Try it), RFID
     wristbands with a "Later in 2027" tag and no link.
   - 03 Count, "Every ticket, as it happens.": Live dashboard (Try it), Daily
     reports (See one).
   Each link goes to the matching demo on `/platform/`, or to
   `/retail-partners/`.
4. **New for your guests.** Three small cards: Interactive fair map ("Your
   grounds on every phone."), Pip ("A talking AI clown for the front gate."),
   Ticket-buyer call line ("Ticket answers by phone."). Each links to its
   block on `/platform/`.
5. **The ask band.**

**The live sample board.** A card titled "Demo County Fair, Friday" with a
LIVE pill and a "Sample data" pill. Three figures (tickets sold today, scanned
in, sales today), channel bars and a three-line feed of sales that ticks
every couple of seconds. It always carries the "Sample data" label. It stops
ticking when off screen or when the tab is hidden.

**Change from the mockup.** The mockup's board shows a "Retail stores" bar and
feed lines tagged Walgreens, Circle K and Menards. The real dashboard only
knows two channels, Online and Box office (`CHANNEL_LABEL` in the app's sales
report route, and `app/components/live/feed.tsx`), and store sales reach EMC
in the chains' reports days later. Showing store sales ticking in live would
show something the product does not do. So the sample board, the Live
dashboard demo and the sample report use **Online and Box office only**. The
"Retail stores" row in the Sell card stays, because it links to the retail
partners page and makes no live claim.

### 5.4 The curtain (home page, computers only)

Anthony's decisions: the curtain shows fair footage and pulls back to show the
page; it appears on computers only; phones go straight to the page; it pulls
back by itself after the first scroll.

**When it shows.** Only when all of these are true: the home page, a viewport
at least 1001px wide, the visitor has not asked for reduced motion, the
address has no `#anchor`, and it has not already been shown in this browser
session. Otherwise the page simply opens.

**Closed.** A cloth fills the window. Printed on it: looping fair footage, the
EMC logo at the top left, "Behind every great fair." in large white type, and
a small cue, "Scroll to pull back the curtain". The page does not scroll yet.

**Opening.** The first scroll down, a swipe, Space, the down arrow, Page Down,
Enter, or a click on the cloth starts it. The cloth gathers and sweeps off to
the right in about 1.6 seconds, with folds and a slight lag at the hem, as in
the mockup. As it passes, the photo behind eases back from a slight zoom and
the headline and the board rise into place. Then the page scrolls normally.
The curtain does not come back when the visitor scrolls back up.

**Requirements.**

- The page is complete and usable without the curtain. The hero is in the
  HTML and visible by default; the curtain is added on top only when the
  conditions above hold. If its script or the video fails, the visitor gets
  the page.
- Nothing above the fold waits on the footage. Show a still first and start
  the video when it is ready. Do not request the video at all on phones.
- The cue is a real, focusable button so keyboard and screen-reader users can
  open it. The page content is never hidden from assistive technology.
- Safety net: if the visitor does nothing for about 6 seconds, the curtain
  opens on its own.
- It must be smooth on an ordinary office laptop. If the cloth cannot be drawn
  smoothly, fall back to a plain slide.

How the cloth is drawn is the builder's choice. The mockup uses a 2D canvas:
the footage and text are drawn onto an offscreen "print", which is then drawn
as 120 vertical slices with pleat-weighted widths, a shear so the hem trails,
fold shading and a cast shadow. It works and can be reused.

### 5.5 Platform page and the demos

One page, `/platform/`, with a short intro and these blocks. Each demo block
has an id that the home page links to.

Rules for every demo:

- It runs entirely in the page: no sign-up, no network calls, nothing the
  visitor types is sent anywhere.
- It is visibly labeled "Sample data" and uses one shared made-up fair, "Demo
  County Fair", so the numbers agree between demos and with the home page
  board. Sample ticket types: Adult admission $12, Child admission $6, Ride
  wristband $30, Family 4-pack $40, Parking pass $10. These are sample fair
  prices, not EMC fees.
- It is modeled on the real product's screens (sources listed per demo) and
  must not show a feature the real product does not have.
- Inside the phone and tablet frames, a demo follows the real product's
  steps, labels and layout, drawn in this site's look (section 5.2). It is
  not a pixel copy of the product's own styling.
- No fee lines. The real checkout prints a per-ticket service fee, which this
  site must not show. A demo total is the sum of the sample ticket prices,
  and nothing says or implies there are no fees.
- It has a clear start, can be restarted, works by keyboard, and works on a
  phone.
- It ends with the ask: "Let's talk about your fair".

| Block (id) | The demo | Model it on |
|---|---|---|
| Online sales (`online-sales`) | "Buy a ticket", in a phone frame: the fair's page, choose tickets, a checkout step, then the ticket with its QR code. The checkout shows a filled-in sample buyer and a sample card; there are no real payment fields and nothing to type. The final ticket is marked as a sample. | Storefront screens in `Desktop/EMC Storefront Cleanup Screens/` and `app/routes/$eventSlug.tsx`, `app/components/storefront/` in the app |
| Box office (`box-office`) | "Ring up a sale", in a tablet frame: tap ticket tiles, see the total, take cash or card, sale complete. Below it, a link "Take the full box office tour" that opens `https://app.emctickets.com/pos/tour` in a new tab. | `app/components/pos/tour/` in the app, and `Desktop/EMC POS Demo Prints/` |
| Gate scanning (`gate-scanning`) | "Scan a ticket", in a phone frame: scan a ticket and get a green valid result; scan the same ticket again and get a red already-scanned result. The point is "duplicates blocked". | The scan results the app returns (`app/lib/codereadr/`, `app/lib/ticket-state.server.ts`). Gates use the CodeREADr scanner app; show EMC's results, do not imitate CodeREADr's screens or branding |
| Live dashboard (`live-dashboard`) | A larger live board than the home page's: tickets sold, scanned in, sales, pace through the day, scans by gate, and the sale feed, all ticking. | `app/components/live/` in the app (counter, money, pace, gates, feed) |
| Daily reports (`daily-reports`) | "See one": a sample end-of-day report on the page, with sales by ticket type and by channel, scans by gate, and totals. | `app/routes/portal.t.$slug.events.$eventId_.reports.sales.tsx` and `.reports.scans.tsx` |
| Retail stores (`retail`) | No demo. Three lines and a link to `/retail-partners/`. | |
| RFID wristbands (`rfid`) | No demo. "Later in 2027", one or two lines. | |
| For your guests (`guests`) | Three short blocks: Interactive fair map, Pip, Ticket-buyer call line. Text, with one image for Pip (`~/projects/fair-gate-avatar/public/clown/generic-clown.jpg`). No demo. During the show (through Dec 1) each says "See it at Booth #410". | |

### 5.6 Retail partners page

The Walgreens story from folder card 1, in this order: the headline "Sell your
fair tickets at Walgreens.", the exclusive-partner sentence, the two figures
with the source line, the four "How it works" steps, "Same benefits at" Circle
K and Menards with their logos, the three-fairs sentence, then the ask. On
this page the ask band's heading is "Get a free in-store mockup of your
event." and the form's button reads "Request my mockup". It replaces the old
`/walgreens/` page.

### 5.7 Marketing page

EMC's marketing services for events: media buying, promotions, ad production
and social. Short. Source copy: the current site's "What We Do" page and this
repo's July pages (`what-we-do.html`, `sell-social.html` in git history). No
figures, no client results, no named campaigns. It ends with the ask. The
copy is new writing, so it is flagged for Anthony's read on staging.

### 5.8 About and Contact pages

**About.** "40+ years in the industry", EMC's approach in a few short
paragraphs (rewritten from the current About page: EMC treats each event as a
partner, builds the program the event needs instead of a one-size system, and
answers its customer service line 24/7), then the ask. No new facts.

**Contact.** The form, Anthony's name and email, the toll-free number and the
office address.

### 5.9 The contact form

- **Fields:** Your name, Fair or event, Email (all required), and "Anything we
  should know?" (optional). The mockup shows the first three.
- **Sent along silently:** the page it was sent from, and the campaign tags
  from the visitor's first page view in the session (`utm_source`,
  `utm_medium`, `utm_campaign`, `utm_content`), so Anthony can see which card
  was scanned.
- **Delivery:** an email to `anthony@emctickets.com`, subject "Website
  inquiry: {fair or event}", with reply-to set to the visitor. Sent through an
  outside form service (open question Q2; Claude recommends Web3Forms). All
  delivery code sits behind one small module so the service can be swapped
  later without touching the pages. The service's key is needed by Mon Nov 23
  for the Tue Nov 24 test. If there is no working delivery at go-live, the
  form is not shown: the ask band shows the email address, an "Email Anthony"
  button and the toll-free number instead.
- **After sending:** the form is replaced by a short thank-you that names the
  visitor and repeats the toll-free number.
- **If sending fails:** what the visitor typed stays, and a clear message
  gives the email address and the toll-free number. A lead is never lost
  silently.
- **Spam:** a hidden trap field, plus whatever the form service provides.
- **Off the live domain** (local and staging), the form does not send real
  email unless a test switch is used, so testing does not fill Anthony's
  inbox.
- A short privacy line under the button links to `/privacy/`.
- One event, `lead_submitted`, goes to analytics when consent allows.

### 5.10 The IAFE page

The landing page for the three folder-card QR codes:
`/iafe/?utm_source=iafe&utm_medium=handout&utm_campaign=iafe2026&utm_content=<walgreens-card|platform-card|business-card>`.

- No curtain, no video. It must be fast on convention-hall phone signal.
- One line that depends on the date: before Nov 30, "See us at Booth #410 in
  Louisville, Nov 30 to Dec 1"; on Nov 30 and Dec 1, "We're at Booth #410
  today"; after, "Good to meet you in Louisville."
- The headline "One system from first ticket to final report.", the Sell,
  Scan, Count summary with links to the demos, and the five booth demos.
- The ask and form, right on the page, not only at the bottom.
- By card: with `utm_content=walgreens-card` the page leads with the Walgreens
  story and the form is the mockup request ("Get a free in-store mockup of
  your event.", button "Request my mockup"), because that card says "Scan to
  request yours". The other two cards, and no tag, get the standard page.
- `noindex`. Not in the menu or the sitemap.

### 5.11 Legal, search and sharing

- Privacy and Terms carry over from the July pages at their new addresses.
  Privacy gains a plain paragraph on what the form collects and which service
  delivers it. Flagged for Anthony's read.
- Each page has its own title and description, a canonical link, and sharing
  tags. The sharing image and the favicon set are redrawn in the new look with
  the new logo (`scripts/build-icons.mjs` already generates icons).
- `sitemap.xml` lists the eight public pages (not `/iafe/`). `robots.txt`
  keeps the WordPress rules that are there today.
- Staging must not be indexed.
- **Tracking.** The site launches with no trackers, as the July design
  decided. The cookie banner is shown only when at least one tracker is
  switched on, so it does not appear at launch. Whether the old Google Tag
  Manager container carries over is open question Q3.

### 5.12 Quality bar

- **Phones first.** No sideways scrolling at 360px wide. Tap targets at least
  44px.
- **Speed.** On phones the home page and `/iafe/` show their first screen
  without waiting on video, large scripts or web fonts. Photos are served in
  modern formats at sensible sizes. The curtain footage is a few megabytes at
  most and loads only on computers, with both WebM and MP4 versions.
- **Accessibility.** Text over the photo keeps readable contrast. Demos and
  the menu work by keyboard. Visible focus. Reduced-motion visitors get no
  curtain and no decorative motion. Form fields have labels and spoken error
  messages.
- **Wording checks in the test suite:** no em dash in any page, no phone
  number other than 800-290-2090, and the exact approved sentences from
  section 3.2 where they are used.

### 5.13 Hosting and go-live

**Chosen: the new pages go onto the current web host, alongside WordPress.**
The built site is a folder of static files. Those files are placed in the
existing host's web root. A short block of rules at the top of the root
`.htaccess` file does three things: it makes the new home page the one served
at `/`, it sends the old marketing addresses to their new ones (section 5.1),
and it sets caching for the new files. WordPress stays installed underneath,
and every address the new site does not claim keeps working exactly as today.

Why this way:

- The 18 event sites and the old working pages keep working with no effort.
- No DNS record changes, so email, the ticketing app and the fair storefront
  subdomains cannot be affected, and there is no wait for a new security
  certificate.
- Undo is quick: remove the block and the new home page file, and the old
  site is back.
- The host keeps ordinary visitor logs, which should be enough to count card
  scans on `/iafe/` without adding any tracker. To be confirmed once there is
  access.

What it needs: **access to the hosting account's files** (open question Q1).

Requirements for the builder:

- Read the host's real root `.htaccess` and folder listing before writing the
  rules. Expect WordPress's own block and possibly a page-cache block; the new
  block goes above both and must not edit them.
- The new site's folders and files must not collide with anything already in
  the web root. Give the build's asset folder a name that cannot collide.
- Do not move, rename or edit any WordPress file or any event-site folder.
- Take a copy of the original `.htaccess` first. Ship a written undo.
- Deploys after the first one must be a single repeatable step, not a manual
  file-by-file upload.
- Unknown addresses may keep getting WordPress's own not-found page. Routing
  them to the new 404 page is welcome only if it needs no change to
  WordPress.

**Staging:** the existing `scripts/deploy-pages.sh` path to
`https://quinto55.github.io/`, which serves from the root like production. It
replaces the July preview there.

**After go-live (Claude):** check every new page, each redirect, the three QR
links, both app links, all 18 event sites, the four old pages left in place,
and one real form submission on the live domain.

**Considered and not chosen:**

- *Repoint the domain to GitHub Pages* (the first draft of this plan). It
  takes down the 18 event sites, and GitHub Pages cannot pass those addresses
  back to the old host.
- *Put a forwarding service in front of both* (move the domain's DNS to
  Cloudflare, send the new pages one way and everything else to the old
  host). It works without access to the host's files, but it means moving
  every DNS record, including email and the ticketing app's, in the week
  before the show. This is the fallback if file access to the host cannot be
  had.

**Cleanup, with Anthony's OK:** GitHub Pages on this repo is switched on and
serves the raw, unbuilt source at `quinto55.github.io/EMC-website-redesign/`,
which is broken. It should be switched off.

### 5.14 What leaves the repo

The July pages (`what-we-do.html`, `sell-onsite.html`, `sell-online.html`,
`sell-social.html`, `contact.html`, `experience.html`, `reveal-hero.html`),
their styles, scripts and tests, the flight frames in
`public/experience-frames/`, and fonts no longer used. They were only ever
published on the preview address, so they need no redirects.
`tests/site-integrity.test.js` is updated to the new page list.

## 6. Decided by Anthony

- Purpose and funnel (section 1), and that utilities are wanted if they fit
  before IAFE.
- The new site replaces the WordPress site on emctickets.com. He offered to
  repoint the domain; review then showed that would take down the event
  sites, so the go-live method in section 5.13 is Claude's revised proposal
  and is not yet agreed.
- Look: the "Live board" direction, made "much lighter / brighter and more
  friendly" with the information streamlined, then "the sunny board".
- Hero background: "B Full Photo".
- Curtain: fair footage on the curtain, removed to see what is behind it;
  "Curtain only for computer. Straight to it for the phones."; pulled back
  after the first scroll.
- Contact details: remove his phone number; "just leave email and toll free".

## 7. Claude's calls (check these)

1. Build approach 1; the new pages go onto the current web host alongside
   WordPress (section 5.13); an outside form service.
2. Fonts: Bricolage Grotesque, Figtree, DM Mono. Anthony approved the look by
   eye, not the fonts by name.
3. The line on the curtain, "Behind every great fair.", is Claude's wording.
   Anthony has seen it twice and not changed it.
4. Curtain details: 1.6 seconds; stays open once pulled; shows once per
   browser session; opens by itself after about 6 idle seconds; skipped for
   reduced motion and for addresses with an anchor.
5. The stand-in photo and footage ship unless Anthony supplies cleared ones.
6. Page list and addresses, including one Platform page holding all the demos
   rather than a page per product.
7. "Let's talk" in the header jumps to the ask band on the same page; a
   separate `/contact/` page also exists.
8. The form adds one optional message field to the three in the mockup, and
   carries the campaign tags.
9. Only the numbers on the folder cards are used. The old Walgreens page's
   figures are dropped.
10. `/iafe/` changes its lead and form for the Walgreens card, has a
    date-aware line, and is not indexed.
11. No one but Anthony is named on the site.
12. The empty `/events/` page goes to the home page. The old working pages,
    including the expired `/greater-jacksonville-fair/`, are left as they are.
13. The sample fair's name, ticket types and prices.
14. Marketing and About copy is newly written from existing EMC text, with no
    new facts.
15. Store sales are taken off the sample board, the Live dashboard demo and
    the sample report, because the real dashboard does not show them
    (section 5.3). This changes what Anthony saw in the mockup.
16. Demo screens follow the product's steps in the site's look, with no fee
    lines (section 5.5).
17. No trackers and no cookie banner at launch (section 5.11).

## 8. Open questions for Anthony

- **Q1. Access to the web host.** Going live needs access to the files of the
  hosting account that serves emctickets.com (the host at `162.144.98.42`,
  not GoDaddy). Who has that login, and can Claude be given file access
  (SFTP or SSH), or will someone upload the files? Needed by Mon Nov 23.
- **Q2. Form service.** The form needs an outside service to turn a
  submission into an email. Claude recommends Web3Forms (free up to 250
  messages a month; no account, the key is emailed to the address that will
  receive the leads). Anthony must approve it and request the key, because it
  ties an EMC email address to an outside service. Needed by Mon Nov 23.
- **Q3. Google Tag Manager.** The current site loads a Google Tag Manager
  container. Does anyone use what it collects (ads, visitor reports)? If yes
  it carries over behind the cookie banner; if no it is dropped.

## 9. Left to the builder

- File and module layout, and how shared parts (header, footer, ask band) are
  kept identical across static pages.
- How the cloth is drawn, within section 5.4.
- Image formats and sizes, video encoding settings, font subsetting.
- The exact layout of each demo, within section 5.5 and the look in 5.2.
- Exact copy for Marketing, About, the demo captions and the thank-you and
  error messages, within section 3.2. New copy is listed in the hand-off so
  Anthony can read it on staging.
- How staging is kept out of search engines.
- The exact host rules and the deploy step, within section 5.13.

## 10. Build order

If time runs short, the site goes live with tier 1 complete and later tiers
following as updates.

1. **Tier 1, needed to go live:** the look and shared parts; Home
   with the live sample board; the contact form working end to end;
   `/contact/`; `/iafe/`; `/retail-partners/`; `/platform/` with the Live
   dashboard and Online sales demos and short text blocks for the rest;
   `/about/`; `/marketing/`; Privacy, Terms, 404; staging; the go-live
   package for the web host (rules, undo, deploy step). Everything except the
   last item can be built before Q1 is answered.
2. **Tier 2:** the curtain; the Box office, Gate scanning and Daily reports
   demos.
3. **Tier 3:** the "For your guests" blocks beyond one line each; the
   redrawn sharing image; polish.

## 11. How it is checked

- Unit tests for each demo's step logic, the form (validation, success,
  failure, test mode off the live domain), the curtain's show-or-skip rule,
  the date-aware IAFE line and the card-specific IAFE page.
- The site-integrity tests cover the page list, sitemap, page titles and the
  wording checks in section 5.12.
- Before go-live, every page is looked at in a real browser at phone and
  computer sizes, and the curtain is watched on a real computer.
- One real form submission is sent on staging with the test switch, and one
  on the live domain after go-live.
- After go-live, the checks listed in section 5.13 are run and the results
  reported, including all 18 event sites.

## 12. Changes after approval

**2026-11-20, asked for by Anthony after seeing the staging site.** He wanted
more attention on the fair map, a lot more on Pip and the call line, the
"brick and mortar" (retail) pieces linked to the retail page, and a top menu
that shows the site is more than one long page. Where the sections above
disagree with this one, this one is current.

- **A fifth menu page: Fair services, at `/fair-services/`** (changes 5.1,
  5.11). It holds Pip and the ticket-buyer call line, each with its video
  across the page and its points under it, in the videos' own words. It is
  public, in the sitemap (now nine pages) and in the top menu, phone menu and
  footer between Platform and Retail partners. The go-live package gains one
  folder (thirteen names; the live check after go-live makes 51 checks).
- **The top menu is a white rail of five tabs** with the current page filled
  in, on the photo too (changes 5.1, 5.2). On phones the menu button shows the
  word "Menu" beside its three bars.
- **Home page (changes 5.3 item 4).** "New for your guests" is replaced by
  two sections after Sell. Scan. Count.: a Fair services band (Pip and the
  call line as picture tiles that go to the new page), then "In stores. On
  the grounds." (Retail stores, to `/retail-partners/`, and the Interactive
  fair map, to its video on `/platform/`). The store logos in the proof strip
  link to `/retail-partners/`.
- **Platform page (changes 5.5).** Retail stores moves out of 01 Sell into a
  fourth group, "In stores and on the grounds", with the fair map as a full
  block (video, three points). The whole retail card links to
  `/retail-partners/`. The Fair services band follows. The old addresses
  `#guests`, `#guest-map`, `#guest-pip` and `#guest-call-line` still land on
  the matching thing.
- **IAFE page (changes 5.10).** The three booth demos that have a video link
  to it.
- **The header stays at the top of the window while the page scrolls**
  (asked for the same day: "keep it pinned and floating at the top while
  people scroll"; changes 5.1, 5.2). Once the page has scrolled, the bar
  floats on a cream card; on the home page it then shows the navy logo and
  ink text. It needs the page's script (`src/pin.js`): with JavaScript off
  the header scrolls away as before. The header stays in the page as the room
  its bar had and only the bar is fixed, so no other box changes when it pins
  (moving the body or `<main>` counted as a layout shift in measurements); a
  jump to a place on a page lands below the bar. In a window under 481px tall
  (a phone held sideways) it is not fixed.
