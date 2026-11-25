// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker, { decide, MOVED } from '../deploy/cloudflare/worker.js';
import { REDIRECTS } from '../scripts/check-live.mjs';
import { namesFromZone, canon } from '../scripts/check-dns.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BLOCK = readFileSync(resolve(ROOT, 'deploy/htaccess-block.conf'), 'utf8');
const at = (path, method = 'GET') => decide(new URL(`https://emctickets.com${path}`), method);

describe('the Cloudflare worker decides like the Apache block', () => {
  it('shows the new home page at /, tracking links included', () => {
    expect(at('/')).toBe('home');
    expect(at('/', 'HEAD')).toBe('home');
    expect(at('/?fbclid=abc')).toBe('home');
    expect(at('/?utm_source=iafe&utm_medium=handout')).toBe('home');
    expect(at('/?sort=x')).toBe('home'); // "s" only as a whole name
  });

  it("hands WordPress its own addresses at /", () => {
    for (const q of ['s=test', 'p=12', 'page_id=46', 'preview=true', 'rest_route=/wp/v2', 'gf_page=x', 'wc-ajax=y', 'feed=rss2',
      'jet_form_builder_submit=1', 'utm_source=x&s=fair', 'S=upper']) {
      expect(at(`/?${q}`), q).toBe('origin');
    }
    expect(at('/', 'POST')).toBe('origin');
    expect(at('/', 'OPTIONS')).toBe('origin');
  });

  it('sends everything else to the old host', () => {
    for (const p of ['/flstatefair/', '/flstatefair/wp-content/x.jpg', '/event-intake-form/', '/wp-admin/', '/wp-json/', '/index.php',
      '/Walgreens/', '/what-we-do/more/', '/constructor/', '/__proto__/']) {
      expect(at(p), p).toBe('origin');
    }
  });

  it('moves the eight old addresses, keeping the query except where the target is a section', () => {
    expect(at('/what-we-do')).toBe('/platform/');
    expect(at('/what-we-do/?ref=a')).toBe('/platform/?ref=a');
    expect(at('/online/?utm_source=x')).toBe('/platform/#online-sales');
    expect(at('/events/')).toBe('/');
  });

  it('moves the same addresses as the Apache block and the check script', () => {
    const fromBlock = [...BLOCK.matchAll(/^RewriteRule \^([a-z-]+)\/\?\$ (\S+) \[R=301/gm)].map((m) => [m[1], m[2]]);
    expect(fromBlock).toHaveLength(8);
    expect([...MOVED]).toEqual(fromBlock);
    expect([...MOVED].map(([from, to]) => [`/${from}/`, to])).toEqual(REDIRECTS);
  });

  it('hands WordPress the same query names as the Apache block', () => {
    const names = BLOCK.match(/\(\^\|&\)\(([^)]+)\)=/)[1].split('|');
    const src = readFileSync(resolve(ROOT, 'deploy/cloudflare/worker.js'), 'utf8');
    expect(src.match(/\(\^\|&\)\(([^)]+)\)=/)[1].split('|')).toEqual(names);
  });
});

describe('the Cloudflare worker answers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('serves the home page from the files, passes WordPress through, and redirects with a relative address', async () => {
    const origin = vi.fn(async () => new Response('wordpress'));
    vi.stubGlobal('fetch', origin);
    const env = { ASSETS: { fetch: vi.fn(async () => new Response('new home')) } };

    expect(await (await worker.fetch(new Request('https://emctickets.com/?utm_source=x'), env)).text()).toBe('new home');
    expect(await (await worker.fetch(new Request('https://emctickets.com/?s=fair'), env)).text()).toBe('wordpress');
    expect(await (await worker.fetch(new Request('https://emctickets.com/flstatefair/'), env)).text()).toBe('wordpress');
    const moved = await worker.fetch(new Request('https://emctickets.com/contact-us/'), env);
    expect(moved.status).toBe(301);
    expect(moved.headers.get('Location')).toBe('/contact/');
  });
});

describe('the DNS check', () => {
  it('reads every owner name from a GoDaddy zone file', () => {
    const zone = [
      '; Domain: emctickets.com', '$ORIGIN emctickets.com.', '$TTL 600',
      '@\t3600\t IN \tSOA\tns51.domaincontrol.com.\tdns.jomax.net. (', '\t\t\t\t2026111601', '\t\t\t\t)',
      '@\t600\t IN \tA\t162.144.98.42', '\t600\t IN \tMX\t0\temctickets-com.mail.protection.outlook.com.',
      '*\t3600\t IN \tA\t159.65.38.62', 'www\t3600\t IN \tCNAME\t@',
      '_dmarc\t3600\t IN \tTXT\t"v=DMARC1; p=none"', 'Selector1._domainkey\t3600\t IN \tCNAME\tx.onmicrosoft.com.',
      'other.emctickets.com.\t600\t IN \tA\t1.2.3.4',
    ].join('\n');
    expect(namesFromZone(zone)).toEqual(['*.emctickets.com', '_dmarc.emctickets.com', 'emctickets.com', 'other.emctickets.com',
      'selector1._domainkey.emctickets.com', 'www.emctickets.com']);
  });

  it('compares answers whatever their order or letter case', () => {
    expect(canon(['B', 'a'])).toBe(canon(['A', 'b']));
    expect(canon([])).toBe(canon(undefined));
    expect(canon([{ exchange: 'x', priority: 0 }])).not.toBe(canon([{ exchange: 'y', priority: 0 }]));
  });
});
