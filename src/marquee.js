export function buildMarqueeTrack(row, copies = 2) {
  const names = [...row.children];
  const track = document.createElement('div');
  track.className = 'partners__track';
  for (let half = 0; half < 2; half++) {
    const group = document.createElement('div');
    group.className = 'partners__group';
    if (half === 1) group.setAttribute('aria-hidden', 'true');
    for (let c = 0; c < copies; c++) {
      for (const name of names) {
        group.appendChild(half === 0 && c === 0 ? name : name.cloneNode(true));
      }
    }
    track.appendChild(group);
  }
  row.textContent = '';
  row.appendChild(track);
  return track;
}

export function initMarquee() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const row = document.querySelector('.partners__row');
  if (!row) return;
  row.classList.add('partners__row--marquee');
  buildMarqueeTrack(row);
}
