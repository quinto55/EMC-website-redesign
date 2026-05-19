export const SERVICES = ['festivals', 'fairs', 'theme-parks', 'sports', 'box-office'];
export const FEATURED_COUNT = SERVICES.length;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateTicketPositions(count, seed = 1) {
  const rand = mulberry32(seed);
  const positions = [];

  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(rand()) * 6;
    const theta = rand() * Math.PI * 2;
    positions.push({
      index: i,
      x: 2 + Math.cos(theta) * r * 1.2,
      y: (rand() - 0.5) * 6,
      z: (rand() - 0.5) * 4 - 1,
      yaw: rand() * Math.PI * 2,
      pitch: (rand() - 0.5) * 0.6,
      phase: rand() * Math.PI * 2,
      amp: 0.15 + rand() * 0.25,
      featured: false,
      service: null,
    });
  }

  // Pick 5 well-spread tickets as featured. Sort by x and grab evenly-stepped indices.
  const sorted = [...positions].sort((a, b) => a.x - b.x);
  const step = Math.floor(sorted.length / FEATURED_COUNT);
  for (let i = 0; i < FEATURED_COUNT; i++) {
    const target = sorted[Math.min(i * step + Math.floor(step / 2), sorted.length - 1)];
    positions[target.index].featured = true;
    positions[target.index].service = SERVICES[i];
  }
  return positions;
}
