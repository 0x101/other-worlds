import { describe, expect, it } from 'vitest';
import { GOLDEN_EPOCH, SOLAR_SNAPSHOT, VIEW_CONTEXT, lookBackGeometry, nearbyHosts, solarDisplayBodies, solarDisplayRadius } from './goldenPath';
import { parseCatalogue } from './catalogue';
import { makePlanet } from '../test/fixtures';

describe('golden-path scientific contracts', () => {
  it('retains a fixed epoch, units, source frame, and eight finite heliocentric positions', () => {
    expect(SOLAR_SNAPSHOT.epoch).toBe(GOLDEN_EPOCH);
    expect(SOLAR_SNAPSHOT.units).toBe('au');
    expect(SOLAR_SNAPSHOT.frame).toContain('EQJ');
    expect(SOLAR_SNAPSHOT.transformation).toContain('Rotation_EQJ_ECL');
    expect(VIEW_CONTEXT.solar.frame).toContain('ECL J2000 display');
    expect(SOLAR_SNAPSHOT.bodies.map((body) => body.name)).toEqual(['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']);
    for (const body of SOLAR_SNAPSHOT.bodies) {
      expect(body.heliocentricAu).toBeGreaterThan(0);
      expect(Math.hypot(...body.eqjAu)).toBeCloseTo(body.heliocentricAu, 8);
      expect(body.eclipticAu.every(Number.isFinite)).toBe(true);
    }
  });

  it('uses monotonic logarithmic Solar System display radii without copying physical distances', () => {
    expect(solarDisplayRadius(30)).toBeGreaterThan(solarDisplayRadius(1));
    expect(solarDisplayRadius(1)).toBeGreaterThan(solarDisplayRadius(0.4));
    expect(() => solarDisplayRadius(0)).toThrow();
    expect(solarDisplayBodies()).toHaveLength(8);
  });

  it('builds a bounded real neighbourhood and excludes missing or invalid distances', () => {
    const catalogue = parseCatalogue([
      { pl_name: 'Near b', hostname: 'Near', ra: 10, dec: 20, sy_dist: 4 },
      { pl_name: 'Far b', hostname: 'Far', ra: 30, dec: -10, sy_dist: 8 },
      { pl_name: 'Unknown b', hostname: 'Unknown', ra: 30, dec: -10, sy_dist: null },
      { pl_name: 'Invalid b', hostname: 'Invalid', ra: 30, dec: -10, sy_dist: -2 },
    ]);
    const hosts = nearbyHosts(catalogue);
    expect(hosts.map((host) => host.planet.hostname)).toEqual(['Near', 'Far']);
    expect(hosts[0].distancePc).toBe(4);
    expect(Math.hypot(...Object.values(hosts[0].position))).toBeCloseTo(5 + Math.log10(5) * 13, 10);
  });

  it('orients look-back from the host towards the Sun without inventing missing geometry', () => {
    const planet = makePlanet({ hostname: 'Host', ra: 0, dec: 0, sy_dist: 12 });
    const geometry = lookBackGeometry(planet)!;
    expect(geometry.direction).toEqual({ x: 1, y: 0, z: 0 });
    expect(geometry.camera).toEqual({ x: 42, y: 0, z: 0 });
    expect(geometry.distancePc).toBe(12);
    expect(lookBackGeometry(makePlanet({ sy_dist: null }))).toBeNull();
    expect(lookBackGeometry(makePlanet({ sy_dist: -4 }))).toBeNull();
  });
});
