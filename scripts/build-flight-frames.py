#!/usr/bin/env python3
"""Build tiered JPEG frame sequences for the flight-scrub experience page.

Reads assets-src/flight/seg*.mp4 (sorted), samples ~FPS_OUT frames/sec,
crossfades SEAM_BLEND frames across each segment seam, writes desktop and
mobile JPEG tiers plus manifest.json and poster.jpg. Re-runnable (idempotent).
"""
import cv2
import glob
import json
import os
import shutil

SRC_DIR = 'assets-src/flight'
OUT_DIR = 'public/experience-frames'
TIERS = {'desktop': 1280, 'mobile': 900}
FPS_OUT = 10
SEAM_BLEND = 6
JPEG_Q = 72
CHUNK = 30
POSTER_AT = 0.92  # fraction of the flight used for the poster frame


def read_segment_frames(path, fps_out=FPS_OUT):
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    step = max(1, round(fps / fps_out))
    frames, i = [], 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i % step == 0:
            frames.append(frame)
        i += 1
    cap.release()
    if not frames:
        raise SystemExit(f'no frames decoded from {path}')
    return frames


def crossfade(a, b, n=SEAM_BLEND):
    """Consume n tail frames of a and n head frames of b into n blended frames."""
    out = a[:-n]
    for k in range(n):
        t = (k + 1) / (n + 1)
        out.append(cv2.addWeighted(a[len(a) - n + k], 1 - t, b[k], t, 0))
    out.extend(b[n:])
    return out


def write_tier(frames, tier, width):
    d = os.path.join(OUT_DIR, tier)
    if os.path.isdir(d):
        shutil.rmtree(d)
    os.makedirs(d)
    for i, frame in enumerate(frames, 1):
        h, w = frame.shape[:2]
        img = cv2.resize(frame, (width, round(h * width / w)),
                         interpolation=cv2.INTER_AREA)
        cv2.imwrite(os.path.join(d, f'f{i:04d}.jpg'), img,
                    [cv2.IMWRITE_JPEG_QUALITY, JPEG_Q])


def main():
    segs = sorted(glob.glob(os.path.join(SRC_DIR, 'seg*.mp4')))
    if not segs:
        raise SystemExit(f'no segments found in {SRC_DIR}')
    print('segments:', segs)
    frames = read_segment_frames(segs[0])
    for s in segs[1:]:
        frames = crossfade(frames, read_segment_frames(s))
    print('total frames:', len(frames))

    for tier, width in TIERS.items():
        write_tier(frames, tier, width)
        print(f'{tier}: {len(frames)} frames @ {width}px')

    poster = frames[int(len(frames) * POSTER_AT)]
    h, w = poster.shape[:2]
    poster = cv2.resize(poster, (1280, round(h * 1280 / w)),
                        interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(OUT_DIR, 'poster.jpg'), poster,
                [cv2.IMWRITE_JPEG_QUALITY, 80])

    manifest = {
        'frames': len(frames),
        'chunk': CHUNK,
        'fps': FPS_OUT,
        'tiers': {
            'desktop': {'path': '/experience-frames/desktop/', 'width': 1280},
            'mobile': {'path': '/experience-frames/mobile/', 'width': 900},
        },
    }
    with open(os.path.join(OUT_DIR, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)
    print('manifest written:', manifest['frames'], 'frames')


if __name__ == '__main__':
    main()
