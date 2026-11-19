// @vitest-environment node
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { checkListing } from '../scripts/check-listing.mjs';
import { PAGES } from '../build/pages.js';
import sitePlugin from '../build/vite-plugin-site.js';
import {
  EVENT_SITES, OLD_PAGES, REDIRECTS, NEW_PAGES, QR_LINKS, APP_LINKS, SITE_FILES, CURTAIN_STILL, runChecks, sameAddress, redirectMatch,
} from '../scripts/check-live.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(resolve(ROOT, f), 'utf8');
const SPEC = read('docs/superpowers/specs/2026-11-18-site-relaunch-design.md');
const BLOCK = read('deploy/htaccess-block.conf');

describe('the lists in the check script', () => {
  it('lists the 18 event sites exactly as the design does', () => {
    expect(EVENT_SITES).toEqual(['/flstatefair/', '/scstatefair/', '/coastalcarolinafair/', '/coastalcarolina-fairground/', '/ccfair-tripleb/',
      '/santaseforest/', '/northfloridafair/', '/reithofferfestivals/', '/countrythunderfl/', '/countrythunderwi/', '/chicagofootballclassic/',
      '/biggarlandfair/', '/kansascityrenfest/', '/michiganrenfest/', '/minnesotarenfest/', '/newyorkrenfair/', '/stlouisrenfest/', '/renaissancefestivals/']);
  });

  it('matches the event sites and old pages written in spec 3.6', () => {
    const s = SPEC.slice(SPEC.indexOf('### 3.6'), SPEC.indexOf('### 3.7'));
    const paths = [...new Set([...s.matchAll(/`(\/[a-z0-9-]+\/)`/g)].map((m) => m[1]))];
    expect(paths.slice(0, 18)).toEqual(EVENT_SITES);
    expect(paths.slice(18)).toEqual(OLD_PAGES);
    expect(OLD_PAGES).toEqual(['/event-intake-form/', '/event-list/', '/circle-k-video/', '/greater-jacksonville-fair/']);
  });

  it('lists the eight redirects exactly as the design does', () => {
    expect(REDIRECTS).toEqual([['/what-we-do/', '/platform/'], ['/online/', '/platform/#online-sales'], ['/onsite/', '/platform/#box-office'],
      ['/social/', '/marketing/'], ['/contact-us/', '/contact/'], ['/privacy-and-terms/', '/privacy/'], ['/walgreens/', '/retail-partners/'], ['/events/', '/']]);
  });

  it('matches the old-address table in spec 5.1', () => {
    const rows = [...SPEC.matchAll(/^\| `(\/[a-z-]+\/)`(?: \(an empty page\))? \| `([^`]+)` \|$/gm)].map((m) => [m[1], m[2]]);
    expect(rows).toEqual(REDIRECTS);
  });

  it('takes the new page paths from the registry', () => {
    expect(NEW_PAGES).toEqual(PAGES.map((p) => p.path).filter((p) => p !== '/404.html'));
    expect(NEW_PAGES).toHaveLength(9);
  });

  it('lists the three QR links and the app links', () => {
    expect(QR_LINKS).toEqual(['walgreens-card', 'platform-card', 'business-card'].map(
      (c) => `/iafe/?utm_source=iafe&utm_medium=handout&utm_campaign=iafe2026&utm_content=${c}`));
    expect(APP_LINKS).toEqual(['https://app.emctickets.com/recover', 'https://app.emctickets.com/portal/login', 'https://app.emctickets.com/pos/tour']);
  });
});

it('treats only a trailing slash or www as the same address', () => {
  expect(sameAddress('https://emctickets.com/a/', 'https://emctickets.com/a')).toBe(true);
  expect(sameAddress('https://www.emctickets.com/a/', 'https://emctickets.com/a/')).toBe(true);
  expect(sameAddress('https://emctickets.com/b/', 'https://emctickets.com/a/')).toBe(false);
  expect(sameAddress('http://emctickets.com/a/', 'https://emctickets.com/a/')).toBe(false);
  expect(sameAddress('https://emctickets.com/a/?x=1', 'https://emctickets.com/a/')).toBe(false);
});

// ---- the rules block ----
/** Each RewriteRule, with the RewriteCond lines directly above it as its conditions. */
function parseBlock(text) {
  const rules = [];
  let conds = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('RewriteCond ')) {
      const m = line.match(/^RewriteCond\s+(%\{[A-Z_]+\})\s+(\S+)(?:\s+\[([^\]]*)\])?$/);
      if (!m) throw new Error(`cannot parse: ${line}`);
      const flags = m[3] ? m[3].split(',') : [];
      conds.push({ variable: m[1], pattern: m[2], flags, or: flags.includes('OR'), nc: flags.includes('NC'), line });
      continue;
    }
    if (!line.startsWith('RewriteRule ')) {
      if (conds.length) throw new Error(`a RewriteCond must sit directly above its RewriteRule: ${line}`);
      continue;
    }
    const m = line.match(/^RewriteRule\s+(\S+)\s+(\S+)\s+\[([^\]]*)\]$/);
    if (!m) throw new Error(`cannot parse: ${line}`);
    rules.push({ pattern: m[1], target: m[2], flags: m[3].split(','), re: new RegExp(m[1]), conds, line });
    conds = [];
  }
  return rules;
}
const RULES = parseBlock(BLOCK);
// The one rule that hands WordPress's own root addresses back to WordPress; every other rule is a redirect.
const WP_ROOT_RULES = RULES.filter((r) => r.target === '/index.php');
const REDIRECT_RULES = RULES.filter((r) => r.target !== '/index.php');
const WP_ROOT_LINES = [
  'RewriteCond %{REQUEST_METHOD} =POST [OR]',
  'RewriteCond %{QUERY_STRING} (^|&)(s|p|page_id|preview|rest_route|gf_page|wc-ajax|feed|jet_form_builder_submit)= [NC]',
  'RewriteRule ^$ /index.php [L]',
];

/** Whether Apache would apply `rule` to a request, from the rule's pattern and conditions compiled as regular expressions. */
function ruleApplies(rule, method, address) {
  const u = new URL(address, 'https://emctickets.com');
  if (!rule.re.test(apachePath(u.pathname))) return false;
  const vars = { '%{REQUEST_METHOD}': method, '%{QUERY_STRING}': u.search.replace(/^\?/, '') };
  const holds = (c) => {
    const value = vars[c.variable];
    if (value === undefined) throw new Error(`no stand-in for ${c.variable}`);
    if (c.pattern.startsWith('=')) { // lexical equality, not a pattern
      const want = c.pattern.slice(1);
      return c.nc ? value.toLowerCase() === want.toLowerCase() : value === want;
    }
    return new RegExp(c.pattern, c.nc ? 'i' : '').test(value);
  };
  // Conditions are ANDed; [OR] joins a condition with the next one.
  for (let i = 0; i < rule.conds.length; i++) {
    let ok = holds(rule.conds[i]);
    while (rule.conds[i].or && i + 1 < rule.conds.length) { i++; ok = holds(rule.conds[i]) || ok; }
    if (!ok) return false;
  }
  return true;
}
// the path as Apache hands it to a RewriteRule in .htaccess: no leading slash
const apachePath = (p) => p.replace(/^\//, '').split('?')[0].split('#')[0];
const bothForms = (p) => {
  const a = apachePath(p);
  return a === '' ? [''] : [a.replace(/\/$/, ''), a.replace(/\/$/, '') + '/'];
};

describe('the rules block', () => {
  it('has one anchored 301 rule per redirect with the right target and flags', () => {
    expect(RULES).toHaveLength(REDIRECTS.length + 1); // the redirects and the one WordPress root rule
    expect(REDIRECT_RULES).toHaveLength(REDIRECTS.length);
    for (const r of REDIRECT_RULES) expect(r.conds, r.line).toEqual([]);
    for (const [from, to] of REDIRECTS) {
      const hits = REDIRECT_RULES.filter((r) => bothForms(from).every((p) => r.re.test(p)));
      expect(hits, from).toHaveLength(1);
      const r = hits[0];
      expect(r.pattern.startsWith('^') && r.pattern.endsWith('$'), r.line).toBe(true);
      expect(r.target, from).toBe(to);
      expect(r.flags).toContain('R=301');
      expect(r.flags).toContain('L');
      expect(r.flags.includes('NE'), r.line).toBe(to.includes('#'));
      expect(r.flags.includes('QSD'), r.line).toBe(to.includes('#'));
    }
  });

  it('matches only its own source, in both slash forms, and nothing else on the host', () => {
    const others = [...EVENT_SITES, ...OLD_PAGES, ...NEW_PAGES, ...QR_LINKS.map((q) => q),
      '/wp-admin/', '/wp-admin/admin-ajax.php', '/wp-json/', '/wp-json/wp/v2/posts', '/wp-login.php', '/wp-content/', '/wp-includes/',
      '/index.php', '/wp-includes/js/jquery.js', '/robots.txt', '/sitemap.xml', '/emc-site/', '/emc-site/assets/x.js', '/index.html', '/404.html', '/', '/xmlrpc.php',
      '/flstatefair/events/', '/flstatefair/online/', '/scstatefair/contact-us/', '/what-we-do/more/', '/online-store/', '/eventsx/', '/my-events/',
      '/social-media/', '/walgreens-deal/', '/contact/', '/privacy-policy/'];
    const sources = new Set(REDIRECTS.map(([f]) => f));
    for (const r of REDIRECT_RULES) {
      for (const p of others) {
        if (sources.has(p)) continue;
        for (const form of bothForms(p)) expect(r.re.test(form), `${r.pattern} must not match "${form}"`).toBe(false);
      }
    }
    // each source matches its own rule in both forms and no other rule
    for (const [from] of REDIRECTS) {
      for (const form of bothForms(from)) {
        expect(RULES.filter((r) => r.re.test(form)), form).toHaveLength(1);
      }
    }
    // the WordPress root rule's pattern matches the root itself and no other address on the host
    for (const p of [...others, ...sources].filter((x) => x !== '/')) {
      for (const form of bothForms(p)) expect(WP_ROOT_RULES[0].re.test(form), `^$ must not match "${form}"`).toBe(false);
    }
  });

  it('hands WordPress its own root addresses: exactly one rule, ^$ to /index.php with [L], under two conditions', () => {
    expect(WP_ROOT_RULES).toHaveLength(1);
    const [rule] = WP_ROOT_RULES;
    expect(rule.pattern).toBe('^$');
    expect(rule.target).toBe('/index.php');
    expect(rule.flags).toEqual(['L']);
    expect(rule.conds.map((c) => c.line)).toEqual(WP_ROOT_LINES.slice(0, 2));
    expect(rule.conds.map((c) => [c.variable, c.flags])).toEqual([['%{REQUEST_METHOD}', ['OR']], ['%{QUERY_STRING}', ['NC']]]);
    // first thing after RewriteEngine On: its comment, its two conditions, then the rule, before every redirect
    const lines = BLOCK.split('\n');
    const engine = lines.indexOf('RewriteEngine On');
    expect(lines[engine + 1]).toMatch(/^# WordPress's own addresses at \/ still go to WordPress/);
    expect(lines.slice(engine + 2, engine + 5)).toEqual(WP_ROOT_LINES);
    expect(RULES[0]).toBe(rule);
  });

  it('the root rule applies to WordPress search, short links, form plugins and any POST to /, and to nothing else', () => {
    const [rule] = WP_ROOT_RULES;
    const applies = [['GET', '/?s=x'], ['GET', '/?p=1'], ['GET', '/?gf_page=upload'], ['GET', '/?jet_form_builder_submit=submit'], ['POST', '/'],
      ['GET', '/?page_id=2'], ['GET', '/?preview=true&p=5'], ['GET', '/?rest_route=/wp/v2/posts'], ['GET', '/?wc-ajax=x'], ['GET', '/?feed=rss2'],
      ['GET', '/?utm_source=iafe&s=fair'], ['POST', '/?gf_page=upload']];
    const doesNot = [['GET', '/'], ['GET', '/?utm_source=iafe&utm_medium=handout'], ['GET', '/?fbclid=abc'], ['GET', '/?sp=1'],
      ['GET', '/platform/?s=x'], ['GET', '/flstatefair/?s=x'], ['POST', '/platform/'], ['POST', '/flstatefair/'],
      ['GET', '/?utm_content=s=1'], ['GET', '/index.html?s=x'], ...QR_LINKS.map((q) => ['GET', q])];
    for (const [method, address] of applies) expect(ruleApplies(rule, method, address), `${method} ${address}`).toBe(true);
    for (const [method, address] of doesNot) expect(ruleApplies(rule, method, address), `${method} ${address}`).toBe(false);
    // and no redirect applies to any of them
    for (const [method, address] of [...applies, ...doesNot.filter(([, a]) => a.startsWith('/?') || a === '/')]) {
      for (const r of REDIRECT_RULES) expect(ruleApplies(r, method, address), `${r.pattern} on ${method} ${address}`).toBe(false);
    }
  });

  it('is fenced by its begin and end markers and touches nothing of WordPress', () => {
    const lines = BLOCK.replace(/\n+$/, '').split('\n');
    expect(lines[0]).toBe('# BEGIN EMC static site');
    expect(lines[lines.length - 1]).toBe('# END EMC static site');
    expect(lines[1]).toMatch(/2026-11-19/);
    expect(lines[1]).toMatch(/remove this block to undo/i);
    // index.php appears only in the DirectoryIndex line and as the WordPress root rule's target, once each
    expect(BLOCK.split('DirectoryIndex index.html index.php\n')).toHaveLength(2);
    expect(BLOCK.split(`${WP_ROOT_LINES[2]}\n`)).toHaveLength(2);
    expect(BLOCK.replace('DirectoryIndex index.html index.php', '').replace(WP_ROOT_LINES[2], '')).not.toContain('index.php');
    expect(BLOCK).not.toMatch(/RewriteBase/i);
    // the only conditions in the block are the WordPress root rule's two
    expect(BLOCK.split('\n').filter((l) => /RewriteCond/i.test(l))).toEqual(WP_ROOT_LINES.slice(0, 2));
    expect(BLOCK).not.toContain('—');
    expect(BLOCK).not.toMatch(/\d{3}-\d{3}-\d{4}/);
  });

  it('keeps every rule inside the mod_rewrite guard and comments each one', () => {
    const lines = BLOCK.split('\n');
    const open = lines.indexOf('<IfModule mod_rewrite.c>');
    const close = lines.indexOf('</IfModule>');
    expect(open).toBeGreaterThan(0);
    expect(close).toBeGreaterThan(open);
    lines.forEach((l, i) => {
      if (l.startsWith('RewriteRule ')) {
        expect(i > open && i < close, l).toBe(true);
        // the comment sits directly above the rule, or directly above the rule's conditions (the WordPress root rule only)
        let above = i - 1;
        while (lines[above].startsWith('RewriteCond ')) above--;
        if (above !== i - 1) expect(l, 'only the WordPress root rule has conditions').toBe(WP_ROOT_LINES[2]);
        expect(lines[above].startsWith('# '), `comment above: ${l}`).toBe(true);
      }
      if (l.startsWith('RewriteCond ')) expect(i > open && i < close, l).toBe(true);
    });
  });
});

describe('the cache file shipped inside the build', () => {
  const H = read('public/emc-site/.htaccess');
  it('has no rewrite rule and no directive outside an IfModule guard', () => {
    expect(H).not.toMatch(/Rewrite/i);
    let depth = 0;
    for (const raw of H.split('\n')) {
      const l = raw.trim();
      if (!l || l.startsWith('#')) continue;
      if (/^<IfModule\s+mod_\w+\.c>$/.test(l)) { expect(depth).toBe(0); depth = 1; continue; }
      if (l === '</IfModule>') { expect(depth).toBe(1); depth = 0; continue; }
      expect(depth, `outside a guard: ${l}`).toBe(1);
    }
    expect(depth).toBe(0);
  });
  it('sets the file types and the cache lengths', () => {
    for (const t of ['AddType video/mp4 .mp4', 'AddType image/avif .avif', 'AddType font/woff2 .woff2', 'AddType application/manifest+json .webmanifest']) {
      expect(H).toContain(t);
    }
    expect(H).toContain('max-age=31536000, immutable');
    expect(H).toContain('max-age=604800');
    expect(H).toContain('max-age=3600');
    expect(H).not.toContain('—');
  });
});

describe('scripts and settings', () => {
  it('builds the staging site with the staging mode and nothing else changed', () => {
    const s = read('scripts/deploy-pages.sh');
    expect(s).toContain('npx vite build --mode staging');
    expect(s).toContain('git push origin main');
    expect(s).not.toMatch(/^npx vite build$/m);
  });
  it('has the npm scripts and the ignore entries', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['build:host']).toBe('bash scripts/build-host.sh');
    expect(pkg.scripts['check:live']).toBe('node scripts/check-live.mjs');
    const gi = read('.gitignore').split('\n');
    expect(gi).toContain('dist-host/');
    expect(gi).toContain('dist-host.zip');
  });
  it('the host build script builds only into dist-host and checks the twelve entries', () => {
    const s = read('scripts/build-host.sh');
    expect(s).toContain('--outDir dist-host');
    expect(s).toContain('--emptyOutDir');
    expect(s).not.toMatch(/outDir dist\b(?!-)/);
    expect(s).toContain('set -euo pipefail');
  });
});

describe('the staging robots.txt', () => {
  const PROD = 'User-agent: *\nDisallow: /wp-admin/\n';
  const STAGING = 'User-agent: *\nDisallow: /\n';
  // What Vite does at the end of a build: hand the plugin the settings, then close the bundle.
  // A dev server calls closeBundle too, when it stops (command 'serve').
  const finish = (staging, root, outDir, command = 'build') => {
    const plugin = sitePlugin({ staging });
    plugin.configResolved({ root, command, build: { outDir } });
    plugin.closeBundle();
  };
  const withDir = (fn) => {
    const dir = mkdtempSync(resolve(tmpdir(), 'staging-'));
    try { fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
  };

  it('a staging build into an absolute folder disallows everything there', () => withDir((dir) => {
    writeFileSync(resolve(dir, 'robots.txt'), PROD);
    finish(true, ROOT, dir);
    expect(readFileSync(resolve(dir, 'robots.txt'), 'utf8')).toBe(STAGING);
  }));

  it('a relative folder is taken from the project root', () => withDir((dir) => {
    mkdirSync(resolve(dir, 'out'));
    writeFileSync(resolve(dir, 'out', 'robots.txt'), PROD);
    finish(true, dir, 'out');
    expect(readFileSync(resolve(dir, 'out', 'robots.txt'), 'utf8')).toBe(STAGING);
  }));

  it('a staging build whose folder is missing stops loudly', () => withDir((dir) => {
    expect(() => finish(true, dir, resolve(dir, 'not-there'))).toThrow(/robots\.txt/);
  }));

  it('a production build leaves robots.txt alone', () => withDir((dir) => {
    writeFileSync(resolve(dir, 'robots.txt'), PROD);
    finish(false, ROOT, dir);
    expect(readFileSync(resolve(dir, 'robots.txt'), 'utf8')).toBe(PROD);
  }));

  it('a dev server in staging mode writes nothing and never throws when it stops', () => withDir((dir) => {
    writeFileSync(resolve(dir, 'robots.txt'), PROD);
    finish(true, ROOT, dir, 'serve');
    expect(readFileSync(resolve(dir, 'robots.txt'), 'utf8')).toBe(PROD);
    expect(() => finish(true, dir, resolve(dir, 'not-there'), 'serve')).not.toThrow();
  }));
});

// ---- the listing check ----
const ENTRIES = ['about', 'contact', 'emc-site', 'index.html', 'iafe', 'marketing', 'platform', 'privacy', 'retail-partners', 'robots.txt', 'sitemap.xml', 'terms'];
const GOOD = ['wp-admin', 'wp-content', 'wp-includes', 'wp-config.php', 'index.php', 'flstatefair', 'event-sites'].join('\n') + '\n';

describe('the listing check', () => {
  it('accepts a plain web-root listing and counts the names', () => {
    const r = checkListing(GOOD, ENTRIES);
    expect(r).toMatchObject({ ok: true, names: 7, clashes: [], errors: [] });
  });
  it('rejects an empty listing', () => {
    expect(checkListing('', ENTRIES).ok).toBe(false);
    expect(checkListing('\n  \n', ENTRIES).errors[0]).toMatch(/empty/);
  });
  it('rejects a long-format listing', () => {
    const long = 'total 12\ndrwxr-xr-x 5 u g 4096 Nov 1 wp-content\n-rw-r--r-- 1 u g 99 Nov 1 wp-config.php\n';
    expect(checkListing(long, ENTRIES).errors[0]).toMatch(/long format/);
    expect(checkListing('-rw-r--r-- 1 u g 99 Nov 1 wp-config.php\n', ENTRIES).ok).toBe(false);
  });
  it('rejects a listing that does not look like the WordPress web root', () => {
    const r = checkListing('public_html\nmail\netc\n', ENTRIES);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/WordPress web root/);
  });
  it('finds a clash ignoring case and a trailing slash, and allows names with spaces', () => {
    const r = checkListing(GOOD + 'About/\nRobots.TXT\nmy folder\n', ENTRIES);
    expect(r.ok).toBe(false);
    expect(r.clashes).toEqual(['about', 'robots.txt']);
  });
  it('the script resolves a relative listing path from another directory and leaves no zip on a rejection', () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'listing-'));
    try {
      writeFileSync(resolve(dir, 'good.txt'), GOOD);
      writeFileSync(resolve(dir, 'empty.txt'), '');
      writeFileSync(resolve(dir, 'clash.txt'), GOOD + 'about\n');
      mkdirSync(resolve(dir, 'sub'));
      const run = (file, cwd = dir) => spawnSync('bash', [resolve(ROOT, 'scripts/build-host.sh'), '--check-only', file], { cwd, encoding: 'utf8' });
      const ok = run('good.txt');
      expect(ok.status, ok.stderr).toBe(0);
      expect(ok.stdout).toMatch(/Read 7 names/);
      expect(run('../good.txt', resolve(dir, 'sub')).status).toBe(0);
      const bad = run('empty.txt');
      expect(bad.status).toBe(1);
      expect(bad.stderr).toMatch(/empty/);
      const clash = run('clash.txt');
      expect(clash.status).toBe(1);
      expect(clash.stderr).toMatch(/CLASH: 'about'/);
      expect(run('missing.txt').status).toBe(2);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('a check-only rejection deletes nothing; a rejection before a build removes the old zip', () => {
    // A copy of the two scripts in a scratch folder, so the real checkout's zip is never touched.
    const dir = mkdtempSync(resolve(tmpdir(), 'host-'));
    try {
      mkdirSync(resolve(dir, 'scripts'));
      for (const f of ['build-host.sh', 'check-listing.mjs']) writeFileSync(resolve(dir, 'scripts', f), read(`scripts/${f}`));
      writeFileSync(resolve(dir, 'clash.txt'), GOOD + 'about\n');
      const zip = resolve(dir, 'dist-host.zip');
      writeFileSync(zip, 'the last good package');
      const run = (...args) => spawnSync('bash', [resolve(dir, 'scripts/build-host.sh'), ...args], { cwd: dir, encoding: 'utf8' });
      const check = run('--check-only', 'clash.txt');
      expect(check.status, check.stderr).toBe(1);
      expect(readFileSync(zip, 'utf8')).toBe('the last good package');
      const build = run('clash.txt');
      expect(build.status, build.stderr).toBe(1);
      expect(() => readFileSync(zip)).toThrow(/ENOENT/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

// ---- the check script against a local server ----
describe('runChecks', () => {
  let server; let base;
  const SITE = new Set([...EVENT_SITES, ...OLD_PAGES, '/events-ok/']);
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x');
      const p = u.pathname;
      const mark = '<html><head><meta name="emc-site" content="relaunch"><link rel="stylesheet" href="/emc-site/assets/home-abc.css"></head></html>';
      if (p === '/robots.txt' || p === '/sitemap.xml' || p === '/emc-site/assets/home-abc.css' || p === CURTAIN_STILL || p.startsWith('/emc-site/video/')) { res.writeHead(200); return res.end('file'); }
      if (p === '/coastalcarolinafair/') { res.writeHead(301, { Location: 'http://' + req.headers.host + '/coastalcarolinafair' }); return res.end(); }
      if (p === '/coastalcarolinafair') { res.writeHead(200); return res.end('wp'); }
      if (p === '/scstatefair/') { res.writeHead(301, { Location: 'http://' + req.headers.host + '/scstatefair' }); return res.end(); }
      if (p === '/santaseforest/') { res.writeHead(404); return res.end('no'); }
      if (p === '/northfloridafair/') { res.writeHead(302, { Location: '/elsewhere/' }); return res.end(); }
      if (SITE.has(p) || p === '/scstatefair') { res.writeHead(200); return res.end('wp'); }
      if (p === '/platform/') { res.writeHead(200); return res.end('wordpress page without the marker'); }
      if (NEW_PAGES.includes(p)) { res.writeHead(200); return res.end(mark); }
      const r = REDIRECTS.find(([f]) => f === p);
      if (r) {
        if (p === '/online/') { res.writeHead(301, { Location: '/platform/' }); return res.end(); }
        if (p === '/social/') { res.writeHead(302, { Location: r[1] }); return res.end(); }
        res.writeHead(301, { Location: r[1] }); return res.end();
      }
      res.writeHead(404); res.end('nope');
    });
    await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(() => new Promise((ok) => server.close(ok)));

  const find = (rs, frag) => rs.find((r) => r.url.includes(frag));

  it('pre: event sites and old pages must answer 200; slash or www redirects are OK and say so', async () => {
    const rs = await runChecks(base, { phase: 'pre', pauseMs: 0 });
    expect(rs.length).toBe(EVENT_SITES.length + OLD_PAGES.length + APP_LINKS.length);
    expect(find(rs, '/flstatefair/').ok).toBe(true);
    const slash = find(rs, '/coastalcarolinafair/');
    expect(slash.ok).toBe(true);
    expect(slash.detail).toMatch(/same address/i);
    expect(find(rs, '/scstatefair/').ok).toBe(true);
    const nf = find(rs, '/santaseforest/');
    expect(nf.ok).toBe(false);
    expect(nf.detail).toMatch(/200/);
    expect(nf.detail).toMatch(/404/);
    expect(find(rs, '/northfloridafair/').ok).toBe(false);
    expect(rs.every((r) => typeof r.name === 'string' && typeof r.url === 'string')).toBe(true);
  });

  it('post: new pages need 200 and the marker; redirects need 301 and the exact Location', async () => {
    const rs = await runChecks(base, { phase: 'post', pauseMs: 0 });
    const pages = rs.filter((r) => NEW_PAGES.some((p) => r.url === base + p) && r.name.includes('new page'));
    expect(pages).toHaveLength(9);
    expect(pages.find((r) => r.url === base + '/platform/').ok).toBe(false);
    expect(pages.find((r) => r.url === base + '/platform/').detail).toMatch(/emc-site/);
    expect(pages.filter((r) => !r.ok)).toHaveLength(1);
    const reds = rs.filter((r) => r.name.includes('redirect'));
    expect(reds).toHaveLength(8);
    expect(reds.find((r) => r.url === base + '/online/').ok).toBe(false);   // hash missing
    expect(reds.find((r) => r.url === base + '/online/').detail).toMatch(/online-sales/);
    expect(reds.find((r) => r.url === base + '/social/').ok).toBe(false);   // 302 not 301
    expect(reds.find((r) => r.url === base + '/onsite/').ok).toBe(true);
    expect(reds.find((r) => r.url === base + '/events/').ok).toBe(true);
    const qr = rs.filter((r) => r.name.includes('QR'));
    expect(qr).toHaveLength(3);
  });
});

// ---- what the live check now catches ----
describe('runChecks: files, stray index pages and http-first redirects', () => {
  const MARK = '<html><head><meta name="emc-site" content="relaunch"><link rel="stylesheet" href="/emc-site/assets/home-abc.css"></head></html>';
  /** A local stand-in for the live host. `broken` maps a path to what that path does instead of answering 200. */
  async function host(broken = {}) {
    const server = http.createServer((req, res) => {
      const p = new URL(req.url, 'http://x').pathname;
      if (broken[p]) { const [status, body, headers] = broken[p]; res.writeHead(status, headers); return res.end(body ?? ''); }
      if (EVENT_SITES.includes(p) || OLD_PAGES.includes(p)) { res.writeHead(200); return res.end('wp'); }
      if (NEW_PAGES.includes(p)) { res.writeHead(200); return res.end(MARK); }
      const r = REDIRECTS.find(([f]) => f === p);
      if (r) { res.writeHead(301, { Location: r[1] }); return res.end(); }
      if (SITE_FILES.some((f) => f === p) || p === '/emc-site/assets/home-abc.css' || p === CURTAIN_STILL || p.startsWith('/emc-site/video/')) { res.writeHead(200); return res.end('file'); }
      res.writeHead(404); res.end('nope');
    });
    await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
    return { base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((ok) => server.close(ok)) };
  }
  const run = async (broken, phase = 'post') => {
    const h = await host(broken);
    try { return { rs: await runChecks(h.base, { phase, pauseMs: 0 }), base: h.base }; } finally { await h.close(); }
  };
  const failures = (rs) => rs.filter((r) => !r.ok);

  it('a healthy host passes every check: 25 before go-live, 50 after', async () => {
    const pre = await run({}, 'pre');
    expect(pre.rs).toHaveLength(25);
    expect(failures(pre.rs)).toEqual([]);
    const post = await run({}, 'post');
    expect(post.rs).toHaveLength(50);
    expect(failures(post.rs)).toEqual([]);
  });

  it('post also asks for /robots.txt, /sitemap.xml, one stylesheet, one video and the curtain\'s still, each of them 200', async () => {
    expect(SITE_FILES).toEqual(['/robots.txt', '/sitemap.xml']);
    expect(CURTAIN_STILL).toBe('/emc-site/curtain/fair-poster.jpg');
    const { rs, base } = await run({});
    for (const f of [...SITE_FILES, CURTAIN_STILL, '/emc-site/assets/home-abc.css']) expect(rs.find((r) => r.url === base + f), f).toMatchObject({ ok: true });
    const video = rs.find((r) => r.name === 'video');
    expect(video.url).toMatch(/\/emc-site\/video\/[\w-]+\.mp4$/);
    expect(rs.find((r) => r.name === 'stylesheet').url).toBe(base + '/emc-site/assets/home-abc.css');
    expect(rs.filter((r) => r.name === 'site file')).toHaveLength(2);
  });

  it('none of those files are asked for before go-live', async () => {
    const { rs } = await run({}, 'pre');
    expect(rs.map((r) => r.name).filter((n) => n !== 'event site' && n !== 'old page' && n !== 'app link')).toEqual([]);
  });

  it('a missing robots.txt, sitemap.xml, curtain still or video fails and says which file and what to do', async () => {
    for (const [path, word] of [['/robots.txt', 'robots.txt'], ['/sitemap.xml', 'sitemap.xml'], [CURTAIN_STILL, 'fair-poster.jpg']]) {
      const { rs, base } = await run({ [path]: [404, 'nope'] });
      const bad = failures(rs);
      expect(bad, path).toHaveLength(1);
      expect(bad[0].url).toBe(base + path);
      expect(bad[0].detail, path).toMatch(/404/);
      expect(bad[0].detail, path).toMatch(/upload|emc-site|root/i);
      expect(bad[0].url).toContain(word);
    }
    const { rs } = await run({ '/emc-site/video/emc-online-ordering.mp4': [404, 'nope'] });
    const bad = failures(rs);
    expect(bad).toHaveLength(1);
    expect(bad[0].name).toBe('video');
    expect(bad[0].detail).toMatch(/404/);
  });

  it('a home page with no stylesheet link, or a stylesheet that does not answer, fails and says so', async () => {
    let { rs } = await run({ '/': [200, '<html><head><meta name="emc-site" content="relaunch"></head></html>'] });
    let bad = failures(rs).filter((r) => r.name === 'stylesheet');
    expect(bad).toHaveLength(1);
    expect(bad[0].detail).toMatch(/no stylesheet/i);
    ({ rs } = await run({ '/emc-site/assets/home-abc.css': [500, 'boom'] }));
    bad = failures(rs).filter((r) => r.name === 'stylesheet');
    expect(bad).toHaveLength(1);
    expect(bad[0].url).toMatch(/home-abc\.css$/);
    expect(bad[0].detail).toMatch(/500/);
  });

  it('an event site whose page carries the new site\'s marker fails, in both phases, and says what to do', async () => {
    for (const phase of ['pre', 'post']) {
      const { rs, base } = await run({ '/flstatefair/': [200, MARK] }, phase);
      const bad = failures(rs);
      expect(bad, phase).toHaveLength(1);
      expect(bad[0].url).toBe(base + '/flstatefair/');
      expect(bad[0].name).toBe('event site');
      expect(bad[0].detail).toMatch(/emc-site/);
      expect(bad[0].detail).toMatch(/index\.html/);
      expect(bad[0].detail).toMatch(/download|copy/i);
    }
  });

  it('an event site that answers 200 with its own page is still fine', async () => {
    const { rs } = await run({ '/flstatefair/': [200, '<html><title>Florida State Fair</title></html>'] });
    expect(failures(rs)).toEqual([]);
  });

  it('a redirect that answers correctly over http before https is OK with a note; a wrong one still fails', () => {
    const want = 'https://emctickets.com/platform/';
    expect(redirectMatch('https://emctickets.com/platform/', want)).toEqual({ ok: true, note: '' });
    expect(redirectMatch('http://emctickets.com/platform/', want)).toMatchObject({ ok: true });
    expect(redirectMatch('http://emctickets.com/platform/', want).note).toMatch(/http first/i);
    expect(redirectMatch('http://emctickets.com/platform/#online-sales', 'https://emctickets.com/platform/#online-sales').ok).toBe(true);
    expect(redirectMatch('http://emctickets.com/marketing/', want)).toEqual({ ok: false, note: '' });
    expect(redirectMatch('http://emctickets.com/platform/', 'http://emctickets.com/platform/')).toEqual({ ok: true, note: '' });
    expect(redirectMatch('https://emctickets.com/platform/', 'http://emctickets.com/platform/').ok).toBe(false);
    expect(redirectMatch(null, want).ok).toBe(false);
  });

  it('the runbook states the real number of checks, and the script\'s last line prints it', () => {
    const guide = read('deploy/GO-LIVE.md');
    expect(guide).toContain('`25 OK, 0 FAIL`');
    expect(guide).toContain('`50 OK, 0 FAIL`');
    expect(guide).not.toMatch(/\b45 OK\b/);
    for (const f of ['robots.txt', 'sitemap.xml', 'stylesheet', 'video', 'fair-poster.jpg']) expect(guide, f).toContain(f);
    expect(read('scripts/check-live.mjs')).toContain('${results.length} checks (${phase})');
  });
});
