import type { PlanetRow, SurfaceKind, WorldKind, WorldRecipe } from '../types';
import { hashString } from './catalogue';

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function classifyWorld(planet: PlanetRow): WorldKind {
  const radius = planet.pl_rade;
  const mass = planet.pl_bmasse;
  if ((radius !== null && radius >= 5.5) || (mass !== null && mass >= 100)) return 'gas-giant';
  if ((radius !== null && radius >= 3.1) || (mass !== null && mass >= 30)) return 'ice-giant';
  if (radius !== null && radius >= 1.8) return 'sub-neptune';
  if ((radius !== null && radius < 1.8) || (mass !== null && mass < 30)) return 'rocky';
  return 'unknown';
}

const KIND_LABELS: Record<WorldKind, string> = {
  rocky: 'Rocky world',
  'sub-neptune': 'Sub-Neptune',
  'ice-giant': 'Ice giant',
  'gas-giant': 'Gas giant',
  unknown: 'Unclassified world',
};

function surfaceFor(kind: WorldKind): SurfaceKind {
  if (kind === 'rocky') return 'terrain';
  if (kind === 'gas-giant') return 'bands';
  if (kind === 'ice-giant') return 'ice-bands';
  return 'clouds';
}

const PALETTES = {
  frozen: ['#162f3c', '#527e87', '#b5c9bd'],
  cold: ['#182c32', '#5d817b', '#b7b49b'],
  mild: ['#2a2622', '#8e7657', '#c2b591'],
  hot: ['#2a1916', '#9e4f35', '#d8a565'],
  extreme: ['#21171a', '#9f4638', '#f0bd79'],
} as const;

export function generateWorld(planet: PlanetRow): WorldRecipe {
  const seed = hashString(planet.pl_name);
  const random = seededRandom(seed);
  const kind = classifyWorld(planet);
  const temperature = planet.pl_eqt;
  const temperatureBand = temperature === null ? 'unknown'
    : temperature < 180 ? 'frozen'
      : temperature < 320 ? 'cold'
        : temperature < 700 ? 'mild'
          : temperature < 1400 ? 'hot' : 'extreme';
  const palette = [...PALETTES[temperatureBand === 'unknown' ? 'cold' : temperatureBand]] as [string, string, string];
  if (kind === 'ice-giant') {
    palette[0] = '#122c38'; palette[1] = '#4f8792'; palette[2] = '#b9d4cb';
  } else if (kind === 'gas-giant' && temperatureBand === 'cold') {
    palette[0] = '#2a2724'; palette[1] = '#8f8066'; palette[2] = '#d6c6a5';
  }
  const radius = planet.pl_rade ?? 1;
  const insolation = planet.pl_insol ?? (planet.pl_eqt === null ? null : (planet.pl_eqt / 278.5) ** 4);
  const teff = planet.st_teff ?? 5500;
  return {
    seed,
    kind,
    kindLabel: KIND_LABELS[kind],
    surface: surfaceFor(kind),
    palette,
    atmosphereColor: kind === 'rocky' && temperatureBand === 'hot' ? '#d78755' : palette[2],
    atmosphereStrength: kind === 'rocky' ? 0.16 : kind === 'unknown' ? 0.24 : 0.42,
    displayRadius: Math.min(2.45, Math.max(1.55, 1.5 + Math.cbrt(Math.max(0.1, radius)) * 0.36)),
    illumination: insolation === null ? 1.25 : Math.min(3.2, Math.max(0.7, 0.85 + Math.log10(insolation + 1) * 0.85)),
    starColor: teff < 3700 ? '#ffb07a' : teff < 5200 ? '#ffd0a0' : teff < 6500 ? '#ffe5bd' : '#c7dcff',
    noiseScale: 1.6 + random() * 3.2,
    bandCount: 5 + Math.floor(random() * 9),
    axialTilt: random() * 0.55 - 0.275,
    rotationSeconds: 70 + random() * 110,
    temperatureBand,
  };
}

export function derivedGravity(planet: PlanetRow): number | null {
  if (planet.pl_bmasse === null || planet.pl_rade === null || planet.pl_rade <= 0) return null;
  return 9.80665 * planet.pl_bmasse / (planet.pl_rade ** 2);
}

export function displayOrbit(planet: PlanetRow, index: number): { radius: number; basis: 'MEASURED' | 'DERIVED' | 'IMAGINED'; au: number | null } {
  let au = planet.pl_orbsmax;
  let basis: 'MEASURED' | 'DERIVED' | 'IMAGINED' = 'MEASURED';
  if (au === null && planet.pl_orbper !== null && planet.st_mass !== null && planet.st_mass > 0) {
    au = Math.cbrt(planet.st_mass * (planet.pl_orbper / 365.25) ** 2);
    basis = 'DERIVED';
  }
  if (au === null) {
    basis = 'IMAGINED';
    return { radius: 5 + index * 2.6, basis, au: null };
  }
  return { radius: Math.min(24, Math.max(4, 3.8 + Math.log1p(Math.max(0, au)) * 5)), basis, au };
}

export function formatValue(value: number | string | null, unit = '', digits = 2): string {
  if (value === null || value === '') return 'Unknown';
  if (typeof value === 'string') return value;
  const formatted = Math.abs(value) >= 1000 || Number.isInteger(value)
    ? value.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : value.toLocaleString('en-US', { maximumFractionDigits: digits });
  return `${formatted}${unit ? ` ${unit}` : ''}`;
}
