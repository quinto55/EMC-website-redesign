#!/usr/bin/env node
// Checks a listing of the host's web root against the names the package would upload.
//   node scripts/check-listing.mjs <listing-file> <package entry> [<package entry> ...]
// Stops (exit 1) on an empty listing, a long-format (ls -l) listing, a listing that does not
// look like a WordPress web root, or any name that already exists on the host.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const WEB_ROOT_MARKERS = ['wp-config.php', 'wp-content', 'wp-admin', 'wp-includes'];

const normalise = (s) => s.trim().replace(/^\.\//, '').replace(/\/+$/, '').toLowerCase();

export function checkListing(text, entries) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');
  const errors = [];
  if (lines.length === 0) {
    return { ok: false, names: 0, clashes: [], errors: ['the listing is empty'] };
  }
  const longFormat = lines.filter((l) => /^total\s+\d+$/i.test(l) || /^[-dlbcps][rwxsStT-]{9}[.+@]?(\s|$)/.test(l));
  if (longFormat.length) {
    errors.push(`the listing is in long format (like "ls -l"): "${longFormat[0]}". Save a plain list, one name per line (ls -A)`);
  }
  const names = lines.map(normalise);
  if (!errors.length && !WEB_ROOT_MARKERS.some((m) => names.includes(m))) {
    errors.push(`none of ${WEB_ROOT_MARKERS.join(', ')} is in the listing, so it does not look like the WordPress web root`);
  }
  const clashes = errors.length ? [] : entries.filter((e) => names.includes(normalise(e)));
  return { ok: errors.length === 0 && clashes.length === 0, names: names.length, clashes, errors };
}

function main(argv) {
  const [file, ...entries] = argv;
  if (!file || entries.length === 0) {
    console.error('Usage: node scripts/check-listing.mjs <listing-file> <package entry> ...');
    return 2;
  }
  let text;
  try { text = readFileSync(resolve(file), 'utf8'); } catch { console.error(`Listing file not found: ${file}`); return 2; }
  const r = checkListing(text, entries);
  console.log(`Read ${r.names} names from ${file}`);
  console.log(`Compared with the package entries: ${entries.join(' ')}`);
  for (const e of r.errors) console.error(`REJECTED: ${e}`);
  for (const c of r.clashes) console.error(`CLASH: '${c}' already exists in the host's web root`);
  if (r.ok) console.log('No clash: none of the package names exists on the host yet.');
  return r.ok ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
