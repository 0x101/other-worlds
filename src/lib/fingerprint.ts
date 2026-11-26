import type { PlanetRow } from '../types';
import { hashString } from './catalogue';

export interface FingerprintOrbit {
  planet: string;
  radius: number;
  eccentricity: number | null;
  rotation: number;
  period: number;
}

export interface FingerprintMarker {
  planet: string;
  angle: number;
  radius: number | null;
  orbitRadius: number | null;
  lane: number;
}

export interface OrbitalFingerprint {
  host: string;
  signature: number;
  worldCount: number;
  knownPeriodCount: number;
  orbits: FingerprintOrbit[];
  markers: FingerprintMarker[];
}

/**
 * Derived art, never an ephemeris. Orbits use log-period position within the
 * known sibling range; eccentricity is encoded only when present. Unknown-period
 * worlds receive an outer-lane marker but no invented orbit. Phase and marker
 * order are deterministic artistic choices based on stable catalogue identity.
 */
export function orbitalFingerprint(planets: PlanetRow[]): OrbitalFingerprint {
  const ordered = [...planets].sort((a, b) => a.pl_name.localeCompare(b.pl_name));
  const host = ordered[0]?.hostname ?? 'Unknown system';
  const known = ordered.filter((planet) => planet.pl_orbper !== null && Number.isFinite(planet.pl_orbper) && planet.pl_orbper > 0);
  const periods = known.map((planet) => Math.log(planet.pl_orbper as number));
  const minimum = periods.length ? Math.min(...periods) : 0;
  const maximum = periods.length ? Math.max(...periods) : 1;
  const orbitByName = new Map<string, FingerprintOrbit>();
  for (const planet of known) {
    const period = planet.pl_orbper as number;
    const normalized = periods.length === 1 ? 0.5 : (Math.log(period) - minimum) / (maximum - minimum);
    const identity = hashString(planet.pl_name);
    const eccentricity = planet.pl_orbeccen !== null && Number.isFinite(planet.pl_orbeccen) && planet.pl_orbeccen >= 0 ? Math.min(0.9, planet.pl_orbeccen) : null;
    orbitByName.set(planet.pl_name, {
      planet: planet.pl_name,
      radius: 30 + normalized * 66,
      eccentricity,
      rotation: identity % 180,
      period,
    });
  }
  const orbits = known.map((planet) => orbitByName.get(planet.pl_name) as FingerprintOrbit);
  const markers = ordered.map((planet, lane) => {
    const orbit = orbitByName.get(planet.pl_name);
    return {
      planet: planet.pl_name,
      angle: (hashString(planet.pl_name) % 3600) / 10,
      radius: planet.pl_rade !== null && Number.isFinite(planet.pl_rade) && planet.pl_rade > 0 ? Math.min(5, 1.7 + Math.cbrt(planet.pl_rade)) : null,
      orbitRadius: orbit?.radius ?? null,
      lane,
    };
  });
  const signatureSource = ordered.map((planet) => {
    const orbit = orbitByName.get(planet.pl_name);
    return `${planet.pl_name}:${orbit?.radius.toFixed(4) ?? 'none'}:${orbit?.eccentricity ?? 'unknown'}:${planet.pl_rade ?? 'unknown'}`;
  }).join('|');
  return {
    host,
    signature: hashString(`${host}|${signatureSource}`),
    worldCount: ordered.length,
    knownPeriodCount: known.length,
    orbits,
    markers,
  };
}
