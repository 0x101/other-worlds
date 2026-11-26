import { describe, expect, it } from 'vitest';
import { classifyWorld, derivedGravity, displayOrbit, generateWorld } from './world';
import { makePlanet } from '../test/fixtures';

describe('deterministic procedural worlds', () => {
  it('generates identical recipes for the same planet identifier', () => {
    const first = generateWorld(makePlanet({ pl_name: 'TRAPPIST-1 e', pl_rade: 0.92, pl_eqt: 250 }));
    const second = generateWorld(makePlanet({ pl_name: 'TRAPPIST-1 e', pl_rade: 0.92, pl_eqt: 250 }));
    const different = generateWorld(makePlanet({ pl_name: 'TRAPPIST-1 f', pl_rade: 0.92, pl_eqt: 250 }));
    expect(first).toEqual(second);
    expect(first.seed).not.toBe(different.seed);
  });

  it.each([
    [{ pl_rade: 11, pl_bmasse: 300 }, 'gas-giant', 'bands'],
    [{ pl_rade: 4, pl_bmasse: 20 }, 'ice-giant', 'ice-bands'],
    [{ pl_rade: 2.4, pl_bmasse: 8 }, 'sub-neptune', 'clouds'],
    [{ pl_rade: 1.1, pl_bmasse: 1.4 }, 'rocky', 'terrain'],
    [{ pl_rade: null, pl_bmasse: null }, 'unknown', 'clouds'],
  ] as const)('maps %s to a safe atmospheric or rocky treatment', (values, kind, surface) => {
    const world = generateWorld(makePlanet(values));
    expect(classifyWorld(makePlanet(values))).toBe(kind);
    expect(world.surface).toBe(surface);
    if (kind !== 'rocky') expect(world.surface).not.toBe('terrain');
  });

  it('uses measured parameters without replacing missing values', () => {
    const small = generateWorld(makePlanet({ pl_rade: 0.7 }));
    const large = generateWorld(makePlanet({ pl_rade: 1.7 }));
    expect(large.displayRadius).toBeGreaterThan(small.displayRadius);
    expect(derivedGravity(makePlanet({ pl_rade: null, pl_bmasse: 2 }))).toBeNull();
    expect(derivedGravity(makePlanet({ pl_rade: 2, pl_bmasse: 4 }))).toBeCloseTo(9.80665);
  });

  it('labels Kepler-derived and layout-only orbital scales explicitly', () => {
    expect(displayOrbit(makePlanet({ pl_orbsmax: 0.5 }), 0).basis).toBe('MEASURED');
    expect(displayOrbit(makePlanet({ pl_orbsmax: null, pl_orbper: 365.25, st_mass: 1 }), 0)).toMatchObject({ basis: 'DERIVED', au: 1 });
    expect(displayOrbit(makePlanet({ pl_orbsmax: null, pl_orbper: null }), 0).basis).toBe('IMAGINED');
  });
});
