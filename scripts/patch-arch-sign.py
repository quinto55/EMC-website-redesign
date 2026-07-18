#!/usr/bin/env python3
"""Remove the AI-garbled text from the entrance-arch sign in the flight frames.

Seedance rendered gibberish lettering on the gate marquee (frames 1-6 of the
flight). This inpaints only those text regions — every other pixel is
untouched. Run AFTER scripts/build-flight-frames.py whenever frames are
rebuilt from source. Rects are (x0, y0, x1, y1) in desktop 1280x720 space;
the mobile tier scales by 900/1280.
"""
import cv2
import numpy as np
import os

OUT_DIR = 'public/experience-frames'
DESKTOP_W = 1280
MOBILE_W = 900

FRAME_RECTS = {
    1: [(515, 160, 795, 220), (435, 200, 810, 280)],
    2: [(505, 125, 800, 190), (425, 170, 830, 265)],
    3: [(495, 95, 805, 165), (420, 145, 850, 245)],
    4: [(390, 40, 820, 110), (345, 90, 850, 200)],
    5: [(275, 0, 845, 60), (270, 40, 845, 155)],
    6: [(210, 0, 880, 85)],
}
RADIUS = 7


def patch(path, rects, scale):
    img = cv2.imread(path)
    if img is None:
        raise SystemExit(f'unreadable: {path}')
    mask = np.zeros(img.shape[:2], np.uint8)
    for (x0, y0, x1, y1) in rects:
        sx0, sy0 = int(x0 * scale), int(y0 * scale)
        sx1, sy1 = int(x1 * scale), int(y1 * scale)
        mask[max(0, sy0):sy1, max(0, sx0):sx1] = 255
    out = cv2.inpaint(img, mask, RADIUS, cv2.INPAINT_TELEA)
    cv2.imwrite(path, out, [cv2.IMWRITE_JPEG_QUALITY, 72])


def main():
    for tier, width in (('desktop', DESKTOP_W), ('mobile', MOBILE_W)):
        scale = width / DESKTOP_W
        for n, rects in FRAME_RECTS.items():
            p = os.path.join(OUT_DIR, tier, f'f{n:04d}.jpg')
            patch(p, rects, scale)
            print(f'patched {p}')


if __name__ == '__main__':
    main()
