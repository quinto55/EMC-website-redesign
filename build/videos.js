// The product walkthrough videos on the platform page. They are made in the Demo Video terminal,
// never in this repo; `npm run videos` copies the finished files listed here into
// public/emc-site/video. The repo is public: only videos marked `cleared` are ever copied.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const VIDEO_SOURCE_DIR = process.env.EMC_VIDEO_SRC
  || '/mnt/c/Users/Anthony Quintana/Desktop/EMC Pitch Materials/Product Demo Videos';
export const VIDEO_PUBLIC_DIR = 'public/emc-site/video';
const VIDEO_URL = '/emc-site/video';

export const VIDEOS = [
  { id: 'online-ordering', title: 'Online ordering', file: 'emc-online-ordering.mp4', poster: 'emc-online-ordering-poster.jpg', cleared: true,
    caption: 'The real product, recorded with a sample fair. About a minute.' },
  { id: 'box-office', title: 'Box office', file: 'emc-box-office.mp4', poster: 'emc-box-office-poster.jpg', cleared: true,
    caption: 'The real product, recorded with a sample fair. About a minute.' },
  { id: 'live-board', title: 'Live board', file: 'emc-live-board.mp4', poster: 'emc-live-board-poster.jpg', cleared: true,
    caption: 'The real product, recorded with a sample fair. About a minute.' },
  // These three were recorded with a client fair's material. Only the name-blinded versions (files ending -web)
  // may be used. Set cleared to false to take one off the site at once.
  { id: 'fair-map', title: 'Interactive fair map', file: 'emc-fair-map-web.mp4', poster: 'emc-fair-map-web-poster.jpg', cleared: true,
    caption: "A real fair's map, with the fair's name left out. About a minute." },
  { id: 'phone-line', title: 'Ticket-buyer call line', file: 'emc-phone-line-web.mp4', poster: 'emc-phone-line-web-poster.jpg', cleared: true,
    caption: "A sample call, with the fair's name left out. About a minute." },
  { id: 'pip', title: 'Pip', file: 'emc-pip-gate-helper-web.mp4', poster: 'emc-pip-gate-helper-web-poster.jpg', cleared: true,
    caption: 'Pip answering guests at a front gate kiosk. Under a minute.' },
];

// Never in this repo (they show the client fair's name): emc-fair-map.mp4, emc-phone-line.mp4, emc-pip-gate-helper.mp4,
// emc-all-products-booth-loop.mp4, their posters, all-seven-at-a-glance.jpg, and anything in a subfolder (the 720p
// copies, in "small copies (720p, booth versions)", are not name-blinded).
export const NEVER_COPY = ['emc-fair-map.mp4', 'emc-phone-line.mp4', 'emc-pip-gate-helper.mp4', 'emc-all-products-booth-loop.mp4'];

/** The never-copy videos, their posters and the contact sheet, lowercased: the source drive ignores case.
 *  Subfolders are refused separately. */
const REFUSED = new Set([
  ...NEVER_COPY,
  ...NEVER_COPY.map((f) => f.replace(/\.mp4$/, '-poster.jpg')),
  'all-seven-at-a-glance.jpg',
].map((f) => f.toLowerCase()));

export const videoById = (id) => VIDEOS.find((v) => v.id === id) ?? null;

/** Throws unless `name` is a plain file name at the top of the source folder and not refused. */
function checkCopyable(name, id) {
  if (typeof name !== 'string' || !name || /[\\/]/.test(name) || name === '.' || name === '..') {
    throw new Error(`Video "${id}": "${name}" is not a file at the top level of the source folder`);
  }
  if (REFUSED.has(name.toLowerCase())) throw new Error(`Video "${id}": ${name} must never be copied into this public repo`);
}

/** What `npm run videos` copies: one entry per cleared video, with absolute paths. */
export function copyPlan(videos = VIDEOS) {
  for (const v of videos) {
    checkCopyable(v.file, v.id);
    checkCopyable(v.poster, v.id);
  }
  const out = resolve(ROOT, VIDEO_PUBLIC_DIR);
  return videos.filter((v) => v.cleared).map((v) => ({
    id: v.id,
    from: resolve(VIDEO_SOURCE_DIR, v.file),
    to: resolve(out, v.file),
    posterFrom: resolve(VIDEO_SOURCE_DIR, v.poster),
    posterTo: resolve(out, v.poster),
  }));
}

/** The video's { width, height, seconds } from videos.json; throws if its files are not in the folder. */
export function publishedMeta(video, dir = resolve(ROOT, VIDEO_PUBLIC_DIR)) {
  const missing = [video.file, video.poster, 'videos.json'].filter((f) => !existsSync(join(dir, f)));
  let meta;
  if (!missing.length) meta = JSON.parse(readFileSync(join(dir, 'videos.json'), 'utf8'))[video.id];
  if (missing.length || !meta) {
    throw new Error(`Video "${video.id}" is missing from ${VIDEO_PUBLIC_DIR} (${missing.join(', ') || 'videos.json entry'}): run npm run videos`);
  }
  return meta;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The native player: it plays with JavaScript off, loads nothing until the visitor presses play,
 * and never starts on its own. '' when the video is not cleared.
 */
export function renderVideoHTML(video, meta) {
  if (!video?.cleared) return '';
  const { width, height } = meta ?? {};
  if (!(width > 0 && height > 0)) throw new Error(`Video "${video.id}" has no size in videos.json: run npm run videos`);
  const src = `${VIDEO_URL}/${video.file}`;
  return [
    `<figure class="video" data-video="${esc(video.id)}">`,
    `  <video controls playsinline preload="none" poster="${VIDEO_URL}/${esc(video.poster)}" width="${width}" height="${height}" aria-label="${esc(video.title)} video">`,
    `    <source src="${esc(src)}" type="video/mp4">`,
    `    <a href="${esc(src)}">Watch the video: ${esc(video.title)}</a>`,
    '  </video>',
    `  <figcaption>${esc(video.caption)}</figcaption>`,
    '</figure>',
  ].join('\n');
}

/**
 * The video's still, as a picture for a tile that links to the page where the video plays. It loads only when the
 * visitor scrolls near it. '' when the video is not cleared (its still is not in the repo either).
 */
export function renderPosterHTML(video, meta) {
  if (!video?.cleared) return '';
  const { width, height } = meta ?? {};
  if (!(width > 0 && height > 0)) throw new Error(`Video "${video.id}" has no size in videos.json: run npm run videos`);
  // The still has the video's shape; the picture is drawn at most 640px wide, so half the video's size is declared.
  return `<span class="shot"><img src="${VIDEO_URL}/${esc(video.poster)}" width="${Math.round(width / 2)}" height="${Math.round(height / 2)}" alt="" loading="lazy" decoding="async"></span>`;
}
