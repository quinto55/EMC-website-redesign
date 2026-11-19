// Copies the finished product walkthrough videos into the site (npm run videos).
//
// The videos are made in the Demo Video terminal; this script never records, edits or
// re-encodes them. It reads only the exact file names that build/videos.js lists for cleared
// videos, from the top level of the source folder (set EMC_VIDEO_SRC to use another folder),
// and nothing from its subfolders. For each one it:
//   - copies the MP4 with `ffmpeg -c copy -movflags +faststart` (the same streams, with the
//     index moved to the front so playback can start early), then checks the streams match;
//   - writes the poster as a 960-wide JPEG;
//   - records width, height and seconds in videos.json.
// Anything else in public/emc-site/video is deleted, so the folder holds only the plan.
import sharp from 'sharp';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIDEO_SOURCE_DIR, VIDEO_PUBLIC_DIR, copyPlan } from '../build/videos.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(root, VIDEO_PUBLIC_DIR);
const POSTER_WIDTH = 960;
const POSTER_QUALITY = 78;

const fail = (message) => {
  console.error(`npm run videos: ${message}`);
  process.exit(1);
};
const has = (tool) => !spawnSync(tool, ['-version'], { stdio: 'ignore' }).error;
const run = (tool, args) => {
  const r = spawnSync(tool, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.error || r.status !== 0) fail(`${tool} ${args.join(' ')} failed:\n${r.stderr || r.error}`);
  return r.stdout;
};

/** The file's streams (what a copy must keep) and its size and length. */
function probe(file) {
  const info = JSON.parse(run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]));
  const streams = info.streams.map((s) => [s.codec_type, s.codec_name, s.profile, s.width, s.height, s.pix_fmt,
    s.r_frame_rate, s.sample_rate, s.channels, s.nb_frames].join(' ')).sort();
  const video = info.streams.find((s) => s.codec_type === 'video');
  if (!video) fail(`${file} has no video stream`);
  return { streams, width: video.width, height: video.height, seconds: Math.round(Number(info.format.duration) * 10) / 10 };
}

const plan = copyPlan(); // throws on any file the repo must never hold
const sourceDir = resolve(VIDEO_SOURCE_DIR);
if (!existsSync(sourceDir)) fail(`the source folder is missing: ${sourceDir}`);
for (const p of plan) {
  for (const from of [p.from, p.posterFrom]) {
    if (dirname(from) !== sourceDir) fail(`${from} is not at the top level of ${sourceDir}`);
    if (!existsSync(from)) fail(`"${p.id}" is cleared but its file is missing: ${from}`);
  }
}
if (!has('ffprobe')) fail('ffprobe is not on the PATH (it comes with ffmpeg); it reads each video\'s size and length');
const ffmpeg = has('ffmpeg');
if (!ffmpeg) console.warn('warning: ffmpeg is not on the PATH, so the videos are copied as they are (playback may not start early)');

mkdirSync(OUT, { recursive: true });
const keep = new Set(['videos.json', ...plan.flatMap((p) => [basename(p.to), basename(p.posterTo)])]);
for (const name of readdirSync(OUT)) {
  if (!keep.has(name)) {
    rmSync(join(OUT, name), { recursive: true, force: true });
    console.log(`deleted ${VIDEO_PUBLIC_DIR}/${name} (not in the plan)`);
  }
}

const meta = {};
const mb = (file) => `${(statSync(file).size / 1024 / 1024).toFixed(1)} MB`;
for (const p of plan) {
  const source = probe(p.from);
  if (ffmpeg) run('ffmpeg', ['-v', 'error', '-y', '-i', p.from, '-c', 'copy', '-movflags', '+faststart', p.to]);
  else copyFileSync(p.from, p.to);
  const copy = probe(p.to);
  if (copy.streams.join('|') !== source.streams.join('|')) {
    rmSync(p.to, { force: true });
    fail(`the copy of ${basename(p.from)} does not have the same streams as the source:\n  ${source.streams.join('\n  ')}\nvs\n  ${copy.streams.join('\n  ')}`);
  }
  const poster = await sharp(p.posterFrom)
    .resize({ width: POSTER_WIDTH, kernel: 'lanczos3', withoutEnlargement: true })
    .jpeg({ quality: POSTER_QUALITY, mozjpeg: true, progressive: true })
    .toFile(p.posterTo);
  meta[p.id] = { width: copy.width, height: copy.height, seconds: copy.seconds };
  console.log(`${p.id.padEnd(16)} ${basename(p.to).padEnd(30)} ${mb(p.to).padStart(7)}  ${copy.width} x ${copy.height}, ${copy.seconds} s, `
    + `streams kept (${copy.streams.map((s) => s.split(' ').slice(0, 2).join(' ')).join(', ')}); poster ${poster.width} x ${poster.height}, `
    + `${Math.round(statSync(p.posterTo).size / 1024)} KB`);
}
writeFileSync(join(OUT, 'videos.json'), `${JSON.stringify(meta, null, 2)}\n`);
console.log(`wrote ${VIDEO_PUBLIC_DIR}/videos.json (${plan.length} videos)`);
