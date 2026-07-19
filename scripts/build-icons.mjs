import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dir, '../public');
const svg = readFileSync(join(publicDir, 'favicon.svg'));
const out = (name) => join(publicDir, name);

const targets = [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['favicon-192x192.png', 192],
  ['favicon-512x512.png', 512],
  ['apple-touch-icon.png', 180],
];

for (const [name, size] of targets) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(out(name));
  console.log(`wrote public/${name}`);
}
