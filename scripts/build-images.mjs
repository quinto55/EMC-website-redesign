// Builds the home page hero photo set from the approved crop of the golden-hour midway
// (the garbled sign at the bottom right is already cropped out of this file; never go
// back to the uncropped source). Three widths, each as AVIF, WebP and JPEG.
//
//   npm run images
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(root, 'docs/superpowers/specs/assets/2026-11-18-site-relaunch/files/golden-wide.jpg');
const OUT = join(root, 'public/emc-site/img');
const WIDTHS = [800, 1280, 1760];
const FORMATS = {
  avif: (img) => img.avif({ quality: 50, effort: 6 }),
  webp: (img) => img.webp({ quality: 72, effort: 6 }),
  jpg: (img) => img.jpeg({ quality: 76, mozjpeg: true, progressive: true }),
};

mkdirSync(OUT, { recursive: true });
const { width: sourceWidth } = await sharp(SOURCE).metadata();
for (const width of WIDTHS) {
  if (width > sourceWidth) throw new Error(`hero-${width} would upscale the ${sourceWidth}px source`);
  for (const [ext, encode] of Object.entries(FORMATS)) {
    const file = join(OUT, `hero-${width}.${ext}`);
    const info = await encode(sharp(SOURCE).resize({ width, kernel: 'lanczos3' })).toFile(file);
    const kb = Math.round(statSync(file).size / 1024);
    console.log(`wrote public/emc-site/img/hero-${width}.${ext} (${info.width} x ${info.height}, ${kb} KB)`);
  }
}

// Phones draw the photo in a tall box, so a wide file is blown up to fill its height. This is the part a phone shows
// (around the 30% mark the page centres it on), cut at the source's full resolution: as sharp as the photo gets.
const { height: sourceHeight } = await sharp(SOURCE).metadata();
const TALL = { width: 560, height: sourceHeight };
const left = Math.round((sourceWidth - TALL.width) * 0.3);
for (const [ext, encode] of Object.entries(FORMATS)) {
  const file = join(OUT, `hero-tall-${TALL.width}.${ext}`);
  const info = await encode(sharp(SOURCE).extract({ left, top: 0, ...TALL })).toFile(file);
  console.log(`wrote public/emc-site/img/hero-tall-${TALL.width}.${ext} (${info.width} x ${info.height}, ${Math.round(statSync(file).size / 1024)} KB)`);
}
