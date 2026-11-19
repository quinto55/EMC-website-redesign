#!/usr/bin/env node
// Read-only checks of the live site, before and after go-live.
//   node scripts/check-live.mjs <base-url> --pre | --post
// Only GET requests, one at a time, with a pause between them. Exits 1 if any check failed.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES } from '../build/pages.js';
import { VIDEOS } from '../build/videos.js';

// Copied from the design (spec 3.6, 5.1, 5.10). Plain data: the tests compare them with the spec.
export const EVENT_SITES = ['/flstatefair/', '/scstatefair/', '/coastalcarolinafair/', '/coastalcarolina-fairground/', '/ccfair-tripleb/',
  '/santaseforest/', '/northfloridafair/', '/reithofferfestivals/', '/countrythunderfl/', '/countrythunderwi/', '/chicagofootballclassic/',
  '/biggarlandfair/', '/kansascityrenfest/', '/michiganrenfest/', '/minnesotarenfest/', '/newyorkrenfair/', '/stlouisrenfest/', '/renaissancefestivals/'];
export const OLD_PAGES = ['/event-intake-form/', '/event-list/', '/circle-k-video/', '/greater-jacksonville-fair/'];
export const REDIRECTS = [['/what-we-do/', '/platform/'], ['/online/', '/platform/#online-sales'], ['/onsite/', '/platform/#box-office'],
  ['/social/', '/marketing/'], ['/contact-us/', '/contact/'], ['/privacy-and-terms/', '/privacy/'], ['/walgreens/', '/retail-partners/'], ['/events/', '/']];
export const NEW_PAGES = PAGES.map((p) => p.path).filter((p) => p !== '/404.html');
export const QR_LINKS = ['walgreens-card', 'platform-card', 'business-card'].map(
  (c) => `/iafe/?utm_source=iafe&utm_medium=handout&utm_campaign=iafe2026&utm_content=${c}`);
// Files the new site puts in the web root and under /emc-site/, asked for after go-live.
export const SITE_FILES = ['/robots.txt', '/sitemap.xml'];
export const CURTAIN_STILL = '/emc-site/curtain/fair-poster.jpg';
export const APP_LINKS = ['https://app.emctickets.com/recover', 'https://app.emctickets.com/portal/login', 'https://app.emctickets.com/pos/tour'];

const MARKER = 'name="emc-site"';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const TIMEOUT_MS = 20000;
const MAX_HOPS = 3;

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

// One GET, no automatic redirects. Never throws: a failure comes back as { error }.
async function get(url, { wantBody, timeoutMs }) {
  try {
    const res = await fetch(url, {
      method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' },
    });
    let body = '';
    if (wantBody) body = await res.text();
    else await res.body?.cancel();
    return { status: res.status, location: res.headers.get('location'), body };
  } catch (e) {
    const why = e?.name === 'TimeoutError' ? `no answer within ${timeoutMs / 1000} seconds` : `${e?.cause?.code || e?.message || e}`;
    return { error: why };
  }
}

// The same address apart from a trailing slash or a leading www.
export function sameAddress(a, b) {
  const norm = (u) => {
    const x = new URL(u);
    return `${x.protocol}//${x.host.replace(/^www\./i, '').toLowerCase()}${x.pathname.replace(/\/+$/, '')}${x.search}${x.hash}`;
  };
  return norm(a) === norm(b);
}

const describeGot = (r) => (r.error ? `an error (${r.error})` : `${r.status}${r.location ? ` to ${r.location}` : ''}`);

// Expect 200. A redirect to the same address (different trailing slash or www) is followed and noted.
async function expectOk(url, opts) {
  let cur = url;
  let note = '';
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const r = await get(cur, { wantBody: opts.needBody || opts.noMarker, timeoutMs: opts.timeoutMs });
    if (r.error) return { ok: false, detail: `expected 200, got ${describeGot(r)}` };
    if (r.status === 200) {
      if (opts.needBody && !r.body.includes(MARKER)) {
        return { ok: false, detail: `expected 200 with ${MARKER} in the page, got 200 without it (not a new page)` };
      }
      if (opts.noMarker && r.body.includes(MARKER)) {
        return { ok: false, detail: `this page carries the new site's ${MARKER}, so a stray index.html (the new home page) was promoted into this folder. Download a copy of that file, then rename or delete it so the event site's own page shows, and run the check again` };
      }
      return { ok: true, detail: note };
    }
    if (r.status >= 300 && r.status < 400 && r.location) {
      const next = new URL(r.location, cur).href;
      if (sameAddress(next, url)) {
        if (!note) note = `redirects to the same address (${next}), trailing slash or www only`;
        cur = next;
        continue;
      }
    }
    return { ok: false, detail: `expected 200, got ${describeGot(r)}` };
  }
  return { ok: false, detail: 'expected 200, got a redirect loop' };
}

// Is `got` the redirect's target? Exactly, or the same address over http where https is wanted (a host that answers
// over http first and upgrades on the next hop). Both are compared as absolute addresses, hash included.
export function redirectMatch(got, want) {
  if (!got) return { ok: false, note: '' };
  if (got === want) return { ok: true, note: '' };
  if (want.startsWith('https://') && got === `http://${want.slice('https://'.length)}`) {
    return { ok: true, note: `answers over http first (${got}): the right page, but check in a browser that it ends on https` };
  }
  return { ok: false, note: '' };
}

// Expect a 301 whose Location is the target (see redirectMatch).
async function expectRedirect(url, target, opts) {
  const r = await get(url, { wantBody: false, timeoutMs: opts.timeoutMs });
  if (r.error) return { ok: false, detail: `expected 301 to ${target}, got ${describeGot(r)}` };
  const want = new URL(target, url).href;
  const got = r.location ? new URL(r.location, url).href : null;
  if (r.status === 301) {
    const m = redirectMatch(got, want);
    if (m.ok) return { ok: true, detail: m.note };
  }
  return { ok: false, detail: `expected 301 to ${want}, got ${describeGot(r)}` };
}

// A file the new site must serve: 200, whatever it holds. `hint` says what to do when it does not.
async function expectFile(url, opts, hint) {
  const r = await get(url, { wantBody: false, timeoutMs: opts.timeoutMs });
  if (r.status === 200) return { ok: true, detail: '' };
  return { ok: false, detail: `expected 200, got ${describeGot(r)}. ${hint}` };
}

// The home page's first stylesheet must answer 200. Its address is read from the page itself, because the build names it.
async function expectStylesheet(root, opts) {
  const home = await get(`${root}/`, { wantBody: true, timeoutMs: opts.timeoutMs });
  const href = home.body?.match(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/i)?.[1];
  if (!href) {
    return { ok: false, url: `${root}/`, detail: `no stylesheet link found in the home page (${home.error ? `it did not load: ${home.error}` : `got ${describeGot(home)}`}). Check that the new home page was uploaded and that its emc-site/ folder is next to it` };
  }
  const url = new URL(href, `${root}/`).href;
  const res = await expectFile(url, opts, 'Check that the emc-site/ folder was uploaded whole, assets included');
  return { ...res, url };
}

// The first video the site shows (the files are named in build/videos.js; held ones are not on the site).
const siteVideo = () => `/emc-site/video/${VIDEOS.find((v) => v.cleared).file}`;

/** Every check for one phase, in the order it runs: { name, url, run(url) } where run gives { ok, detail, url? }. */
export function buildPlan(root, phase, opts = { timeoutMs: TIMEOUT_MS }) {
  const plan = [];
  // An event site must answer 200 with its own page: the new site's marker means a stray index.html was promoted.
  for (const p of EVENT_SITES) plan.push({ name: 'event site', url: root + p, run: (u) => expectOk(u, { ...opts, noMarker: true }) });
  for (const p of OLD_PAGES) plan.push({ name: 'old page', url: root + p, run: (u) => expectOk(u, opts) });
  for (const u of APP_LINKS) plan.push({ name: 'app link', url: u, run: (x) => expectOk(x, opts) });
  if (phase === 'post') {
    for (const p of NEW_PAGES) plan.push({ name: 'new page', url: root + p, run: (u) => expectOk(u, { ...opts, needBody: true }) });
    for (const [from, to] of REDIRECTS) plan.push({ name: 'redirect', url: root + from, run: (u) => expectRedirect(u, root + to, opts) });
    for (const q of QR_LINKS) plan.push({ name: 'QR link', url: root + q, run: (u) => expectOk(u, { ...opts, needBody: true }) });
    for (const f of SITE_FILES) {
      plan.push({ name: 'site file', url: root + f, run: (u) => expectFile(u, opts, `Upload ${f.slice(1)} to the web root (section 4 of deploy/GO-LIVE.md)`) });
    }
    plan.push({ name: 'stylesheet', url: `${root}/`, run: () => expectStylesheet(root, opts) });
    plan.push({ name: 'video', url: root + siteVideo(), run: (u) => expectFile(u, opts, 'Check that emc-site/video/ was uploaded whole, and not blocked by the host') });
    plan.push({ name: 'curtain still', url: root + CURTAIN_STILL, run: (u) => expectFile(u, opts, 'Check that emc-site/curtain/ was uploaded whole') });
  }
  return plan;
}

export async function runChecks(base, { phase, pauseMs = 300, timeoutMs = TIMEOUT_MS } = {}) {
  if (phase !== 'pre' && phase !== 'post') throw new Error("phase must be 'pre' or 'post'");
  const plan = buildPlan(base.replace(/\/+$/, ''), phase, { timeoutMs });
  const results = [];
  for (let i = 0; i < plan.length; i++) {
    if (i > 0 && pauseMs > 0) await sleep(pauseMs);
    const { name, url, run } = plan[i];
    const { ok, detail, url: shown } = await run(url);
    results.push({ name, url: shown ?? url, ok, detail });
  }
  return results;
}

export const formatLine = ({ name, url, ok, detail }) => `${ok ? 'OK  ' : 'FAIL'}  ${name}  ${url}${detail ? `  ${ok ? '(' : ': '}${detail}${ok ? ')' : ''}` : ''}`;

async function main(argv) {
  const base = argv.find((a) => /^https?:\/\//.test(a));
  const phase = argv.includes('--post') ? 'post' : argv.includes('--pre') ? 'pre' : null;
  if (!base || !phase || (argv.includes('--pre') && argv.includes('--post'))) {
    console.error('Usage: node scripts/check-live.mjs <base-url> --pre | --post');
    return 2;
  }
  console.log(`Checking ${base} (${phase}). GET requests only, one at a time.`);
  const results = await runChecks(base, { phase });
  for (const r of results) console.log(formatLine(r));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} OK, ${failed.length} FAIL, ${results.length} checks (${phase})`);
  return failed.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
