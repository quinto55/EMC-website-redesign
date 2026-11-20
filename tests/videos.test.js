import { describe, it, expect, vi, afterEach } from 'vitest';
import { readdirSync, readFileSync, openSync, readSync, fstatSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  VIDEOS, NEVER_COPY, VIDEO_SOURCE_DIR, VIDEO_PUBLIC_DIR, videoById, copyPlan, renderVideoHTML, renderPosterHTML, publishedMeta,
} from '../build/videos.js';
import { GENERATORS } from '../build/render.js';
import { initVideos } from '../src/video.js';
import { ROOT } from './helpers/pages.js';

const PUBLIC_DIR = resolve(ROOT, VIDEO_PUBLIC_DIR);
const parse = (html) => new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

/** The four-letter types of an MP4's top-level boxes, in file order. */
function topLevelBoxes(file) {
  const fd = openSync(file, 'r');
  try {
    const size = fstatSync(fd).size;
    const head = Buffer.alloc(16);
    const types = [];
    for (let at = 0; at < size; ) {
      readSync(fd, head, 0, 16, at);
      let length = head.readUInt32BE(0);
      if (length === 1) length = Number(head.readBigUInt64BE(8));
      if (length === 0) length = size - at;
      if (length < 8) throw new Error(`${file}: bad box at ${at}`);
      types.push(head.toString('latin1', 4, 8));
      at += length;
    }
    return types;
  } finally {
    closeSync(fd);
  }
}

describe('the video manifest', () => {
  it('lists the six videos, and the three recorded with a client fair use only the name-blinded files', () => {
    expect(VIDEOS.map((v) => v.id)).toEqual(['online-ordering', 'box-office', 'live-board', 'fair-map', 'phone-line', 'pip']);
    for (const id of ['fair-map', 'phone-line', 'pip']) {
      expect(videoById(id).file, id).toMatch(/-web\.mp4$/);
      expect(videoById(id).poster, id).toMatch(/-web-poster\.jpg$/);
    }
    for (const v of VIDEOS) expect(NEVER_COPY).not.toContain(v.file);
    expect(videoById('nope')).toBeNull();
  });

  it('every caption is free of digits (the site allows only approved numbers)', () => {
    for (const v of VIDEOS) expect(v.caption, v.id).not.toMatch(/\d/);
  });

  it('only cleared videos are ever copied', () => {
    expect(copyPlan().map((p) => p.id)).toEqual(VIDEOS.filter((v) => v.cleared).map((v) => v.id));
    expect(copyPlan([{ id: 'x', file: 'x.mp4', poster: 'x.jpg', cleared: false }])).toEqual([]);
  });

  it('plans each copy from the top of the source folder into the public video folder', () => {
    const [plan] = copyPlan([{ ...videoById('box-office'), cleared: true }]);
    expect(plan.id).toBe('box-office');
    expect(plan.from).toBe(resolve(VIDEO_SOURCE_DIR, 'emc-box-office.mp4'));
    expect(plan.posterFrom).toBe(resolve(VIDEO_SOURCE_DIR, 'emc-box-office-poster.jpg'));
    expect(plan.to).toBe(resolve(PUBLIC_DIR, 'emc-box-office.mp4'));
    expect(plan.posterTo).toBe(resolve(PUBLIC_DIR, 'emc-box-office-poster.jpg'));
  });

  it('refuses to plan a copy of a file on the never-copy list', () => {
    expect(() => copyPlan([{ id: 'x', file: 'emc-fair-map.mp4', poster: 'x.jpg', cleared: true }])).toThrow(/emc-fair-map\.mp4/);
    // Their posters are never copied either.
    expect(() => copyPlan([{ id: 'x', file: 'x.mp4', poster: 'emc-phone-line-poster.jpg', cleared: true }])).toThrow(/emc-phone-line-poster\.jpg/);
  });

  it('the never-copy check ignores case (the source drive does)', () => {
    expect(() => copyPlan([{ id: 'x', file: 'EMC-Fair-Map.mp4', poster: 'x.jpg', cleared: true }])).toThrow(/EMC-Fair-Map\.mp4 must never be copied/);
    expect(() => copyPlan([{ id: 'x', file: 'x.mp4', poster: 'Emc-Fair-Map-Poster.jpg', cleared: true }])).toThrow(/Emc-Fair-Map-Poster\.jpg must never be copied/);
    expect(() => copyPlan([{ id: 'x', file: 'x.mp4', poster: 'All-Seven-At-A-Glance.JPG', cleared: true }])).toThrow(/must never be copied/);
  });

  it('refuses a file outside the top of the source folder', () => {
    for (const file of ['web (720p)/emc-fair-map-720p.mp4', '../x.mp4', 'sub\\x.mp4']) {
      expect(() => copyPlan([{ id: 'x', file, poster: 'x.jpg', cleared: true }]), file).toThrow(/top level/);
    }
  });
});

describe('the video player markup', () => {
  // These take a manifest entry and mark it cleared themselves, so they hold whatever the manifest says today.
  it('a cleared video renders a native player that needs no JavaScript', () => {
    const doc = parse(renderVideoHTML({ ...videoById('box-office'), cleared: true }, { width: 1920, height: 1080 }));
    const figure = doc.querySelector('figure[data-video="box-office"]');
    expect(figure).not.toBeNull();
    const video = figure.querySelector('video');
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.getAttribute('preload')).toBe('none');
    expect(video.getAttribute('poster')).toBe('/emc-site/video/emc-box-office-poster.jpg');
    expect(video.getAttribute('width')).toBe('1920');
    expect(video.getAttribute('height')).toBe('1080');
    for (const attr of ['autoplay', 'muted', 'loop']) expect(video.hasAttribute(attr), attr).toBe(false);
    expect(video.getAttribute('aria-label')).toContain('Box office');

    const source = video.querySelector('source');
    expect(source.getAttribute('src')).toBe('/emc-site/video/emc-box-office.mp4');
    expect(source.getAttribute('type')).toBe('video/mp4');
    expect(video.querySelector('a[href="/emc-site/video/emc-box-office.mp4"]')).not.toBeNull();

    expect(figure.querySelector('figcaption').textContent.trim()).toBe('The real product, recorded with a sample fair. About a minute.');
  });

  it('a video that is not cleared renders nothing', () => {
    expect(renderVideoHTML({ ...videoById('pip'), cleared: false }, {})).toBe('');
  });

  it('a cleared video without its size cannot render', () => {
    expect(() => renderVideoHTML({ ...videoById('pip'), cleared: true }, {})).toThrow(/run npm run videos/);
  });

  it('a cleared video whose files are missing stops the build', () => {
    expect(() => publishedMeta(videoById('pip'), resolve(ROOT, 'no-such-folder'))).toThrow(/run npm run videos/);
  });

  it('each video has a page generator: its player when cleared, nothing when not', () => {
    for (const v of VIDEOS) {
      const html = GENERATORS[`video-${v.id}`]();
      if (v.cleared) expect(html, v.id).toContain(`data-video="${v.id}"`);
      else expect(html, v.id).toBe('');
    }
  });
});

describe("a video's still, for a tile that links to the page where it plays", () => {
  it('a cleared video renders its still as a picture that loads only when scrolled near, with no player', () => {
    const video = videoById('pip');
    const d = parse(renderPosterHTML(video, { width: 1920, height: 1080 }));
    const img = d.querySelector('span.shot > img');
    expect(img.getAttribute('src')).toBe(`/emc-site/video/${video.poster}`);
    expect(img.getAttribute('alt')).toBe(''); // the tile's own words name it
    expect(img.getAttribute('loading')).toBe('lazy');
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['960', '540']);
    expect(d.querySelectorAll('video, source, a')).toHaveLength(0);
  });

  it('a video that is not cleared renders nothing: its still is not in the repo either', () => {
    expect(renderPosterHTML({ ...videoById('pip'), cleared: false }, { width: 1920, height: 1080 })).toBe('');
    expect(renderPosterHTML(null, {})).toBe('');
  });

  it('a cleared video without its size cannot render a still', () => {
    expect(() => renderPosterHTML(videoById('pip'), {})).toThrow(/npm run videos/);
  });

  it('each video has a still generator beside its player generator', () => {
    for (const video of VIDEOS) {
      const out = GENERATORS[`poster-${video.id}`]();
      if (video.cleared) expect(out).toContain(`/emc-site/video/${video.poster}`);
      else expect(out).toBe('');
    }
  });
});

describe('the video files in the repo', () => {
  it('every cleared video and poster is in the repo, and nothing else is', () => {
    const cleared = VIDEOS.filter((v) => v.cleared);
    const expected = [...cleared.flatMap((v) => [v.file, v.poster]), 'videos.json'].sort();
    const present = readdirSync(PUBLIC_DIR).sort();
    expect(present).toEqual(expected);
    for (const name of NEVER_COPY) expect(present).not.toContain(name);

    const meta = JSON.parse(readFileSync(resolve(PUBLIC_DIR, 'videos.json'), 'utf8'));
    expect(Object.keys(meta).sort()).toEqual(cleared.map((v) => v.id).sort());
    for (const v of cleared) {
      expect(meta[v.id].width, v.id).toBeGreaterThan(0);
      expect(meta[v.id].height, v.id).toBeGreaterThan(0);
      expect(meta[v.id].seconds, v.id).toBeGreaterThan(0);
    }
  });

  it('each video can start playing before it has finished downloading', () => {
    for (const v of VIDEOS.filter((x) => x.cleared)) {
      const boxes = topLevelBoxes(resolve(PUBLIC_DIR, v.file));
      expect(boxes.indexOf('moov'), v.file).toBeGreaterThan(-1);
      expect(boxes.indexOf('moov'), v.file).toBeLessThan(boxes.indexOf('mdat'));
    }
  });
});

describe('initVideos', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('starting one video pauses the others and reports the play once', () => {
    document.body.innerHTML = ['a', 'b', 'c']
      .map((id) => `<figure data-video="${id}"><video controls></video></figure>`).join('');
    const [a, b, c] = document.querySelectorAll('video');
    for (const v of [a, b, c]) v.pause = vi.fn();
    const track = vi.fn();
    initVideos(document, track);

    a.dispatchEvent(new Event('play'));
    expect(a.pause).not.toHaveBeenCalled();
    expect(b.pause).toHaveBeenCalledTimes(1);
    expect(c.pause).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('video_play', { id: 'a' });

    a.dispatchEvent(new Event('play')); // paused and played again: no second report
    expect(track).toHaveBeenCalledTimes(1);

    b.dispatchEvent(new Event('play'));
    expect(a.pause).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenLastCalledWith('video_play', { id: 'b' });
  });

  it('a page without videos is fine', () => {
    expect(() => initVideos(document, vi.fn())).not.toThrow();
  });
});
