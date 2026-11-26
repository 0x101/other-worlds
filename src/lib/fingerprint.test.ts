import { describe, expect, it } from 'vitest';
import { orbitalFingerprint } from './fingerprint';
import { makePlanet } from '../test/fixtures';

const worlds = [
  makePlanet({ pl_name: 'Example b', hostname: 'Example', pl_orbper: 1, pl_orbeccen: 0, pl_rade: 1 }),
  makePlanet({ pl_name: 'Example c', hostname: 'Example', pl_orbper: 10, pl_orbeccen: 0.4, pl_rade: 4 }),
  makePlanet({ pl_name: 'Example d', hostname: 'Example', pl_orbper: null, pl_orbeccen: null, pl_rade: null }),
];

describe('deterministic orbital fingerprints', () => {
  it('is identical across calls and sibling ordering', () => {
    expect(orbitalFingerprint(worlds)).toEqual(orbitalFingerprint(worlds));
    expect(orbitalFingerprint(worlds)).toEqual(orbitalFingerprint([worlds[2], worlds[0], worlds[1]]));
  });

  it('omits unknown orbital inputs instead of inventing zero values', () => {
    const glyph = orbitalFingerprint(worlds);
    expect(glyph.worldCount).toBe(3);
    expect(glyph.knownPeriodCount).toBe(2);
    expect(glyph.orbits).toHaveLength(2);
    expect(glyph.orbits.some((orbit) => orbit.planet === 'Example d')).toBe(false);
    expect(glyph.markers.find((marker) => marker.planet === 'Example d')).toMatchObject({ orbitRadius: null, radius: null });
  });

  it('changes when a measured orbital input changes', () => {
    const original = orbitalFingerprint(worlds);
    const changed = orbitalFingerprint(worlds.map((world) => world.pl_name === 'Example c' ? { ...world, pl_orbeccen: 0.7 } : world));
    expect(changed.signature).not.toBe(original.signature);
  });

  it('gives every view of the same system the same glyph', () => {
    expect(orbitalFingerprint([worlds[1], ...worlds.filter((world) => world !== worlds[1])])).toEqual(orbitalFingerprint(worlds));
  });

  it('handles one known period and entirely missing periods', () => {
    expect(orbitalFingerprint([worlds[0]]).orbits[0].radius).toBe(63);
    const missing = orbitalFingerprint([makePlanet({ pl_orbper: null })]);
    expect(missing.orbits).toEqual([]);
    expect(missing.worldCount).toBe(1);
  });
});
