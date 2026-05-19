import { describe, it, expect } from 'vitest';
import { generateTicketPositions, FEATURED_COUNT } from '../src/hero/positions.js';

describe('generateTicketPositions', () => {
  it('returns the requested number of positions', () => {
    const ps = generateTicketPositions(40, 1);
    expect(ps.length).toBe(40);
  });

  it('is deterministic given the same seed', () => {
    const a = generateTicketPositions(20, 42);
    const b = generateTicketPositions(20, 42);
    expect(a).toEqual(b);
  });

  it('marks exactly FEATURED_COUNT positions as featured', () => {
    const ps = generateTicketPositions(40, 7);
    const featured = ps.filter((p) => p.featured);
    expect(featured.length).toBe(FEATURED_COUNT);
  });

  it('assigns a unique service tag to each featured position', () => {
    const ps = generateTicketPositions(40, 7);
    const services = ps.filter((p) => p.featured).map((p) => p.service);
    expect(new Set(services).size).toBe(FEATURED_COUNT);
  });

  it('positions roughly occupy the right two-thirds (x > -0.3)', () => {
    const ps = generateTicketPositions(60, 5);
    const inRange = ps.filter((p) => p.x > -3).length;
    expect(inRange / ps.length).toBeGreaterThan(0.85);
  });
});
