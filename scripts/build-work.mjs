// Builds the work samples (build/work.js) from the originals in assets-src/work into public/emc-site/work:
// each as WebP and JPEG at its kind's widths, cropped to its kind's shape from the centre.
//
//   npm run work
import sharp from 'sharp';
import { mkdirSync, statSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WORK_SETS, WORK_PUBLIC_DIR, WORK_SOURCE_DIR, workFiles } from '../build/work.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, WORK_SOURCE_DIR);
const OUT = join(root, WORK_PUBLIC_DIR);
mkdirSync(OUT, { recursive: true });

const wanted = new Set();
let total = 0;
for (const [setName, set] of Object.entries(WORK_SETS)) {
  for (const item of set.items) {
    const source = join(SRC, item.source);
    const { width: sourceWidth } = await sharp(source).metadata();
    for (const f of workFiles(setName, item)) {
      if (f.width > sourceWidth) throw new Error(`${item.slug}-${f.width} would upscale the ${sourceWidth}px source ${item.source}`);
      const resized = () => sharp(source).resize({ width: f.width, height: f.height, fit: 'cover', position: 'centre', kernel: 'lanczos3' });
      await resized().webp({ quality: 78, effort: 6 }).toFile(join(OUT, f.webp));
      await resized().flatten({ background: '#ffffff' }).jpeg({ quality: 78, mozjpeg: true, progressive: true }).toFile(join(OUT, f.jpg));
      for (const name of [f.webp, f.jpg]) { wanted.add(name); total += statSync(join(OUT, name)).size; }
    }
    console.log(`${setName}: ${item.slug}`);
  }
}
// Nothing may stay in the folder that the list does not name: a sample taken off the list leaves the site.
for (const name of readdirSync(OUT)) {
  if (!wanted.has(name)) { rmSync(join(OUT, name)); console.log(`removed ${name}`); }
}
console.log(`${wanted.size} files, ${Math.round(total / 1024)} KB in ${WORK_PUBLIC_DIR}`);
