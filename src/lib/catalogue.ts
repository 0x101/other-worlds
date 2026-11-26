import type { Catalogue, FilterName, PlanetRow } from '../types';
import { classifyWorld } from './world';

const NUMBER_FIELDS = [
  'sy_pnum', 'sy_snum', 'cb_flag', 'pl_rade', 'pl_bmasse', 'pl_dens',
  'pl_orbper', 'pl_orbsmax', 'pl_orbeccen', 'pl_eqt', 'pl_insol',
  'st_teff', 'st_rad', 'st_mass', 'st_lum', 'disc_year', 'ra', 'dec',
  'sy_dist', 'pl_controv_flag', 'tran_flag', 'rv_flag', 'ttv_flag',
  'pul_flag', 'ptv_flag', 'ast_flag', 'obm_flag', 'micro_flag',
  'etv_flag', 'ima_flag', 'dkin_flag',
] as const;

const STRING_FIELDS = [
  'pl_bmassprov', 'st_spectype', 'discoverymethod', 'disc_facility', 'disc_refname',
] as const;

export function parseCatalogue(input: unknown): Catalogue {
  if (!Array.isArray(input)) throw new Error('Catalogue response is not an array.');
  const planets = input.map((candidate, index): PlanetRow => {
    if (!candidate || typeof candidate !== 'object') throw new Error(`Invalid catalogue row ${index}.`);
    const raw = candidate as Record<string, unknown>;
    if (typeof raw.pl_name !== 'string' || !raw.pl_name.trim() || typeof raw.hostname !== 'string' || !raw.hostname.trim()) {
      throw new Error(`Catalogue row ${index} has no planet or host identifier.`);
    }
    const row = { pl_name: raw.pl_name, hostname: raw.hostname } as PlanetRow;
    for (const field of NUMBER_FIELDS) {
      const value = raw[field] ?? null;
      if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) {
        throw new Error(`Catalogue row ${index} has an invalid ${field} value.`);
      }
      row[field] = value;
    }
    for (const field of STRING_FIELDS) {
      const value = raw[field] ?? null;
      if (value !== null && typeof value !== 'string') throw new Error(`Catalogue row ${index} has an invalid ${field} value.`);
      row[field] = value;
    }
    return row;
  });
  if (!planets.length) throw new Error('Catalogue is empty.');
  const byName = new Map<string, PlanetRow>();
  const systems = new Map<string, PlanetRow[]>();
  for (const planet of planets) {
    if (byName.has(planet.pl_name)) throw new Error(`Duplicate planet identifier: ${planet.pl_name}.`);
    byName.set(planet.pl_name, planet);
    const siblings = systems.get(planet.hostname) ?? [];
    siblings.push(planet);
    systems.set(planet.hostname, siblings);
  }
  for (const siblings of systems.values()) siblings.sort((a, b) => a.pl_name.localeCompare(b.pl_name));
  return { planets, byName, systems };
}

export function filterPlanets(planets: PlanetRow[], query: string, filter: FilterName): PlanetRow[] {
  const needle = query.trim().toLocaleLowerCase();
  return planets.filter((planet) => {
    if (needle && !`${planet.pl_name} ${planet.hostname}`.toLocaleLowerCase().includes(needle)) return false;
    switch (filter) {
      case 'all': return true;
      case 'rocky': return classifyWorld(planet) === 'rocky';
      case 'giants': return ['gas-giant', 'ice-giant'].includes(classifyWorld(planet));
      case 'temperate': return planet.pl_eqt !== null && planet.pl_eqt >= 180 && planet.pl_eqt <= 320;
      case 'transiting': return planet.tran_flag === 1;
      case 'nearby': return planet.sy_dist !== null && planet.sy_dist <= 50;
    }
  });
}

export interface SkyPosition {
  x: number;
  y: number;
  z: number;
  distanceSource: 'MEASURED' | 'IMAGINED';
  directionSource: 'MEASURED' | 'IMAGINED';
}

export function skyPosition(planet: PlanetRow): SkyPosition {
  const fallbackSeed = hashString(planet.hostname);
  const ra = planet.ra ?? ((fallbackSeed % 3600) / 10);
  const dec = planet.dec ?? (((fallbackSeed >>> 12) % 1600) / 10 - 80);
  const radius = planet.sy_dist === null
    ? 24 + ((fallbackSeed >>> 4) % 60) / 10
    : 6 + Math.log10(Math.max(0.1, planet.sy_dist) + 1) * 11;
  const raRadians = ra * Math.PI / 180;
  const decRadians = dec * Math.PI / 180;
  return {
    x: radius * Math.cos(decRadians) * Math.cos(raRadians),
    y: radius * Math.sin(decRadians),
    z: radius * Math.cos(decRadians) * Math.sin(raRadians),
    distanceSource: planet.sy_dist === null ? 'IMAGINED' : 'MEASURED',
    directionSource: planet.ra === null || planet.dec === null ? 'IMAGINED' : 'MEASURED',
  };
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export const FILTER_LABELS: Record<FilterName, string> = {
  all: 'All worlds',
  rocky: 'Rocky',
  giants: 'Gas & ice giants',
  temperate: '180–320 K',
  transiting: 'Transiting',
  nearby: 'Within 50 pc',
};

export const SUGGESTED_NAMES = ['TRAPPIST-1 e', 'Proxima Centauri b', 'Kepler-1649 c', 'K2-18 b', '55 Cancri e'];
