import type { Catalogue, PlanetRow, ViewName } from '../types';
import snapshot from '../data/solar-system.json';
import { generateWorld } from './world';

export const GOLDEN_PLANET = 'TRAPPIST-1 e';
export const GOLDEN_EPOCH = '2026-11-26T00:00:00.000Z';

export interface SolarBody {
  name: string;
  heliocentricAu: number;
  eqjAu: [number, number, number];
  eclipticAu: [number, number, number];
}

export interface SolarSnapshot {
  schema: string;
  epoch: string;
  origin: string;
  frame: string;
  units: string;
  status: 'DERIVED';
  source: { name: string; version: string; license: string; url: string; method: string };
  transformation: string;
  generatedAt: string;
  bodies: SolarBody[];
}

export const SOLAR_SNAPSHOT = snapshot as SolarSnapshot;

export const VIEW_CONTEXT: Record<ViewName, { position: string; scale: string; frame: string }> = {
  earth: { position: 'Earth / you are here', scale: 'Local portrait · body size enlarged', frame: 'Composite surface · not live' },
  solar: { position: 'Sun / Solar System', scale: 'Logarithmic distance · enlarged bodies', frame: 'ECL J2000 display · fixed UTC epoch' },
  neighbourhood: { position: 'Sun / nearby exoplanet hosts', scale: 'Logarithmic parsecs', frame: 'NASA archive RA/Dec · snapshot' },
  atlas: { position: 'Sun / observed exoplanet sky', scale: 'Logarithmic parsecs', frame: 'NASA archive RA/Dec · snapshot' },
  system: { position: 'Selected exoplanet host', scale: 'Compressed orbital radii', frame: 'Archive orbit fields · phases illustrative' },
  planet: { position: 'Selected exoplanet portrait', scale: 'Normalized body portrait', frame: 'Evidence-bound · surface imagined' },
  lookback: { position: 'Selected host / facing the Sun', scale: 'Direction preserved · distance compressed', frame: 'NASA archive geometry · schematic' },
};

const BODY_STYLE: Record<string, { color: string; radius: number }> = {
  Mercury: { color: '#a69c8c', radius: 0.24 },
  Venus: { color: '#d5b37b', radius: 0.34 },
  Earth: { color: '#75a9b8', radius: 0.38 },
  Mars: { color: '#b77655', radius: 0.29 },
  Jupiter: { color: '#c8ac8d', radius: 0.88 },
  Saturn: { color: '#d0bd91', radius: 0.76 },
  Uranus: { color: '#8cb9bd', radius: 0.55 },
  Neptune: { color: '#668da9', radius: 0.55 },
};

export function solarDisplayRadius(au: number): number {
  if (!Number.isFinite(au) || au <= 0) throw new Error('Heliocentric distance must be positive.');
  return 3.8 + Math.log1p(au) * 6.2;
}

export function solarDisplayBodies() {
  return SOLAR_SNAPSHOT.bodies.map((body) => {
    const length = Math.hypot(...body.eclipticAu);
    const scale = solarDisplayRadius(body.heliocentricAu) / length;
    return {
      ...body,
      ...BODY_STYLE[body.name],
      displayRadius: solarDisplayRadius(body.heliocentricAu),
      position: {
        x: body.eclipticAu[0] * scale,
        y: body.eclipticAu[2] * scale * 2,
        z: -body.eclipticAu[1] * scale,
      },
    };
  });
}

export interface NearbyHost {
  planet: PlanetRow;
  distancePc: number;
  position: { x: number; y: number; z: number };
}

function completeArchivePosition(planet: PlanetRow): boolean {
  return planet.ra !== null && planet.dec !== null && planet.sy_dist !== null && Number.isFinite(planet.sy_dist) && planet.sy_dist > 0;
}

export function archiveDirection(planet: PlanetRow): { x: number; y: number; z: number } | null {
  if (!completeArchivePosition(planet)) return null;
  const ra = planet.ra! * Math.PI / 180;
  const dec = planet.dec! * Math.PI / 180;
  return {
    x: Math.cos(dec) * Math.cos(ra),
    y: Math.sin(dec),
    z: Math.cos(dec) * Math.sin(ra),
  };
}

export function nearbyHosts(catalogue: Catalogue, limit = 96): NearbyHost[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > 96) throw new Error('Neighbourhood limit must be between 1 and 96.');
  const hosts: NearbyHost[] = [];
  for (const siblings of catalogue.systems.values()) {
    const planet = siblings.find(completeArchivePosition);
    if (!planet) continue;
    const direction = archiveDirection(planet)!;
    const distancePc = planet.sy_dist!;
    const radius = 5 + Math.log10(distancePc + 1) * 13;
    hosts.push({
      planet,
      distancePc,
      position: { x: direction.x * radius, y: direction.y * radius, z: direction.z * radius },
    });
  }
  return hosts.sort((a, b) => a.distancePc - b.distancePc || a.planet.hostname.localeCompare(b.planet.hostname)).slice(0, limit);
}

export function lookBackGeometry(planet: PlanetRow) {
  const direction = archiveDirection(planet);
  if (!direction || planet.sy_dist === null) return null;
  return { direction, distancePc: planet.sy_dist, camera: { x: direction.x * 42, y: direction.y * 42, z: direction.z * 42 } };
}

export function hostColor(host: NearbyHost): string {
  return generateWorld(host.planet).starColor;
}
