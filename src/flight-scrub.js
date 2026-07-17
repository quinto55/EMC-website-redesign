export function frameIndexFor(progress, frameCount) {
  const p = Math.max(0, Math.min(1, progress));
  return Math.min(frameCount - 1, Math.floor(p * frameCount));
}

export function nearestLoaded(index, loadedFlags) {
  if (loadedFlags[index]) return index;
  for (let d = 1; d < loadedFlags.length; d++) {
    if (index - d >= 0 && loadedFlags[index - d]) return index - d;
    if (index + d < loadedFlags.length && loadedFlags[index + d]) return index + d;
  }
  return -1;
}

export function nearestPending(target, loadedFlags, inflightFlags) {
  const n = loadedFlags.length;
  const pending = (i) => !loadedFlags[i] && !inflightFlags[i];
  for (let d = 0; d < n; d++) {
    if (target - d >= 0 && pending(target - d)) return target - d;
    if (target + d < n && pending(target + d)) return target + d;
  }
  return -1;
}

export function coverRect(cw, ch, iw, ih) {
  const s = Math.max(cw / iw, ch / ih);
  const w = iw * s;
  const h = ih * s;
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
}

export function beatRangesFrom(els) {
  return [...els].map((el) => ({
    el,
    start: parseFloat(el.dataset.start),
    end: parseFloat(el.dataset.end),
  }));
}

export async function initFlightScrub(ctx) {
  const stage = document.querySelector('[data-flight]');
  if (!stage) return;
  const beats = beatRangesFrom(stage.querySelectorAll('.flight__beat'));

  const goStatic = () => {
    stage.classList.add('flight--static');
    beats.forEach((b) => b.el.classList.add('is-active'));
  };

  if (!ctx || ctx.reduced) {
    goStatic();
    return;
  }

  let manifest;
  try {
    manifest = await (await fetch('/experience-frames/manifest.json')).json();
  } catch {
    goStatic(); // frames unavailable: degrade to the static page
    return;
  }

  const tier = matchMedia('(max-width: 768px)').matches
    ? manifest.tiers.mobile
    : manifest.tiers.desktop;
  const total = manifest.frames;
  const images = new Array(total);
  const loaded = new Array(total).fill(false);
  const canvas = stage.querySelector('.flight__canvas');
  const c2d = canvas.getContext('2d');
  const urlFor = (i) => `${tier.path}f${String(i + 1).padStart(4, '0')}.jpg`;

  let current = -1;
  const draw = (i) => {
    const img = images[i];
    if (!img) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const r = coverRect(cw, ch, img.naturalWidth, img.naturalHeight);
    c2d.drawImage(img, r.x, r.y, r.w, r.h);
    current = i;
  };

  const loadFrame = (i) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Pre-decode so the first draw of this frame never does a synchronous
        // JPEG decode on the main thread mid-scrub.
        const finish = () => {
          images[i] = img;
          loaded[i] = true;
          resolve(true);
        };
        if (img.decode) img.decode().then(finish, finish);
        else finish();
      };
      img.onerror = () => resolve(false);
      img.src = urlFor(i);
    });

  // Chunk 1 gates interactivity; its progress drives the loader bar.
  const loader = stage.querySelector('.flight__loader');
  const bar = stage.querySelector('.flight__loader-bar');
  const gate = Math.min(manifest.chunk, total);
  let done = 0;
  let ok = 0;
  await Promise.all(
    Array.from({ length: gate }, (_, i) =>
      loadFrame(i).then((success) => {
        if (success) ok += 1;
        done += 1;
        if (bar) bar.style.transform = `scaleX(${done / gate})`;
      })
    )
  );
  if (loader) loader.classList.add('is-done');
  if (ok === 0) {
    goStatic(); // frame tier unreachable: poster + stacked copy
    return;
  }
  draw(0);

  // Stream the remaining frames with a small worker pool that always fetches
  // the pending frame nearest the current scrub position — on a slow
  // connection the loading frontier follows the visitor instead of the
  // visitor outrunning a sequential queue and freezing at its edge.
  let targetIndex = 0;
  // attempted[i] marks a frame as claimed by a worker (or already failed once)
  // so each frame is fetched at most once — same try-once semantics as a
  // sequential pass, without a failed URL being re-picked forever.
  const attempted = loaded.map(Boolean);
  const workers = 6;
  for (let w = 0; w < workers; w++) {
    (async () => {
      for (;;) {
        const i = nearestPending(targetIndex, loaded, attempted);
        if (i === -1) return;
        attempted[i] = true;
        await loadFrame(i);
      }
    })();
  }

  const state = { p: 0 };
  ctx.gsap.to(state, {
    p: 1,
    ease: 'none',
    onUpdate: () => {
      targetIndex = frameIndexFor(state.p, total);
      const idx = nearestLoaded(targetIndex, loaded);
      if (idx !== -1 && idx !== current) draw(idx);
      beats.forEach((b) =>
        b.el.classList.toggle('is-active', state.p >= b.start && state.p <= b.end)
      );
    },
    // Runway length is the scroll-per-flight knob: shorter = each wheel tick
    // advances more of the flight. 250% ≈ 27 ticks for the full flight.
    scrollTrigger: { trigger: stage, start: 'top top', end: '+=250%', pin: true, scrub: 1 },
  });

  window.addEventListener('resize', () => {
    if (current >= 0) {
      const i = current;
      current = -1; // force size recompute + redraw
      draw(i);
    }
  });
}
