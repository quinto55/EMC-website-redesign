#!/usr/bin/env node
// Before the nameserver switch (deploy/GO-LIVE-CLOUDFLARE.md): does Cloudflare answer every record of the domain the way
// GoDaddy does today? Asks both sets of name servers directly, for every name in the zone file exported from GoDaddy.
//   node scripts/check-dns.mjs <zone-file-from-godaddy.txt> <cloudflare-nameserver> <cloudflare-nameserver>
// Exits 1 if any answer differs. Read-only: DNS questions only.
import { Resolver } from 'node:dns/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ZONE = 'emctickets.com';
export const GODADDY = ['ns51.domaincontrol.com', 'ns52.domaincontrol.com'];
const TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'CAA'];
// Orange-cloud names: Cloudflare answers with its own addresses for these, on purpose.
export const PROXIED = new Set([ZONE, `www.${ZONE}`]);

/** Every owner name in a BIND zone file, as full lower-case names. */
export function namesFromZone(text, origin = ZONE) {
  const names = new Set([origin]);
  for (const line of text.split(/\r?\n/)) {
    // Blank, comment, $ORIGIN/$TTL and indented lines (same owner as the line before, or a wrapped record) name no one new.
    if (!line.trim() || /^[;$\s(]/.test(line)) continue;
    const owner = line.split(/\s+/)[0].toLowerCase();
    names.add(owner === '@' ? origin : owner.endsWith('.') ? owner.slice(0, -1) : `${owner}.${origin}`);
  }
  return [...names].sort();
}

/** One answer as comparable text; no record of that type is []. */
export const canon = (records) => JSON.stringify((records ?? []).map((r) => JSON.stringify(r).toLowerCase()).sort());

async function resolverFor(hosts) {
  const ips = (await Promise.all(hosts.map((h) => new Resolver().resolve4(h)))).flat();
  const r = new Resolver({ timeout: 5000, tries: 2 });
  r.setServers(ips);
  return r;
}

async function ask(resolver, name, type) {
  try {
    return await resolver.resolve(name, type);
  } catch (e) {
    if (e.code === 'ENODATA' || e.code === 'ENOTFOUND') return [];
    return { error: e.code || String(e) };
  }
}

export async function compareZone(names, cloudflareHosts) {
  const [gd, cf] = await Promise.all([resolverFor(GODADDY), resolverFor(cloudflareHosts)]);
  const rows = [];
  for (const name of names) {
    for (const type of TYPES) {
      // www only points at the domain itself, so it is skipped whole; the domain's own mail and text records are compared.
      if (PROXIED.has(name) && (name !== ZONE || ['A', 'AAAA', 'CNAME'].includes(type))) continue;
      const [a, b] = await Promise.all([ask(gd, name, type), ask(cf, name, type)]);
      if (canon(a) === '[]' && canon(b) === '[]') continue;
      rows.push({ name, type, ok: !a.error && !b.error && canon(a) === canon(b), godaddy: a, cloudflare: b });
    }
  }
  return rows;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [file, ...cfHosts] = process.argv.slice(2);
  if (!file || cfHosts.length === 0) {
    console.error('Usage: node scripts/check-dns.mjs <zone-file-from-godaddy.txt> <cloudflare-nameserver> <cloudflare-nameserver>');
    process.exit(2);
  }
  const names = namesFromZone(readFileSync(file, 'utf8'));
  console.log(`Comparing ${names.length} names at GoDaddy and at ${cfHosts.join(', ')} (${[...PROXIED].join(' and ')}: addresses skipped, Cloudflare's own).`);
  const rows = await compareZone(names, cfHosts);
  for (const r of rows) {
    console.log(`${r.ok ? 'OK  ' : 'DIFF'}  ${r.type.padEnd(5)} ${r.name}${r.ok ? '' : `\n        GoDaddy:    ${JSON.stringify(r.godaddy)}\n        Cloudflare: ${JSON.stringify(r.cloudflare)}`}`);
  }
  const bad = rows.filter((r) => !r.ok).length;
  console.log(`\n${rows.length - bad} OK, ${bad} DIFF`);
  process.exit(bad ? 1 : 0);
}
