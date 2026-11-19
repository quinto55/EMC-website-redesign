// Builds the favicon set from the EMC logo: the three red tickets (the TICKETS word
// below them is cropped away), centred on a cream square. The tickets are never drawn
// larger than they are in the logo file.
//
//   npm run icons
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOGO = join(root, 'public/emc-site/img/emc-logo-on-dark.png');
const OUT = join(root, 'public/emc-site/icons');
const CREAM = '#fff8ec';
// Share of the square left empty on each side; tab-sized icons keep only a hairline so the tickets stay legible.
const padding = (size) => (size <= 32 ? 0.03 : 0.12);

const TARGETS = [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['apple-touch-icon.png', 180],
  ['favicon-192x192.png', 192],
  ['favicon-512x512.png', 512],
];

/** The row where the tickets end: the emptiest row in the gap above the TICKETS word. */
async function ticketsBottom(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const opaque = (y) => {
    let n = 0;
    for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 20) n++;
    return n;
  };
  let best = Math.round(info.height * 0.7);
  for (let y = best; y < Math.round(info.height * 0.9); y++) if (opaque(y) < opaque(best)) best = y;
  return { width: info.width, bottom: best };
}

const { width, bottom } = await ticketsBottom(LOGO);
const tickets = await sharp(await sharp(LOGO).extract({ left: 0, top: 0, width, height: bottom }).png().toBuffer())
  .trim()
  .png()
  .toBuffer({ resolveWithObject: true });
const { width: tw, height: th } = tickets.info;
console.log(`tickets cropped to ${tw} x ${th}`);

mkdirSync(OUT, { recursive: true });
for (const [name, size] of TARGETS) {
  const room = size * (1 - 2 * padding(size));
  const scale = Math.min(1, room / tw, room / th); // never above native size
  const w = Math.max(1, Math.round(tw * scale));
  const h = Math.max(1, Math.round(th * scale));
  const art = await sharp(tickets.data).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: CREAM } })
    .composite([{ input: art, left: Math.round((size - w) / 2), top: Math.round((size - h) / 2) }])
    .png()
    .toFile(join(OUT, name));
  console.log(`wrote public/emc-site/icons/${name} (tickets ${w} x ${h})`);
}
