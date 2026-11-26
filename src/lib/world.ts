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
  frozen: ['#101c24', '#58717a', '#c5d3cb'],
  cold: ['#192323', '#6f7d6e', '#c9c0a4'],
  mild: ['#241c18', '#967354', '#dec59b'],
  hot: ['#241312', '#ad593c', '#e9ae70'],
  extreme: ['#180d12', '#91453b', '#f4bc79'],
} as const;

const GAS_PALETTES = {
  frozen: ['#161a20', '#77766f', '#ddd2b8'],
  cold: ['#1c1917', '#93816a', '#e2cfac'],
  mild: ['#211714', '#a66f4b', '#e7c69b'],
  hot: ['#0c1c2a', '#2e657f', '#b1ced0'],
  extreme: ['#250f0c', '#b85d37', '#f3c48a'],
  unknown: ['#191d1e', '#697a75', '#c0c8b9'],
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
  const paletteVariant = Math.floor(random() * 4);
  const palette = [...PALETTES[temperatureBand === 'unknown' ? 'cold' : temperatureBand]] as [string, string, string];
  if (kind === 'gas-giant') {
    const selected = GAS_PALETTES[temperatureBand];
    palette.splice(0, 3, ...selected);
  } else if (kind === 'ice-giant') {
    const icePalettes = [
      ['#102631', '#438697', '#c1dedd'], ['#111d31', '#486d9b', '#c2d2df'],
      ['#122a2a', '#4c9087', '#c4ded2'], ['#181f2c', '#607a91', '#cad4d2'],
    ] as const;
    palette.splice(0, 3, ...icePalettes[paletteVariant]);
  } else if (kind === 'sub-neptune' || kind === 'unknown') {
    if (temperatureBand === 'frozen' || temperatureBand === 'cold') palette.splice(0, 3, '#10252d', '#477d86', '#c5d9d2');
    if (temperatureBand === 'mild') palette.splice(0, 3, '#171b1b', '#786c57', '#d3c6a9');
    if (temperatureBand === 'hot') palette.splice(0, 3, '#171716', '#8f6747', '#dcc398');
    if (temperatureBand === 'extreme') palette.splice(0, 3, '#171113', '#87554c', '#d5a58a');
    if (kind === 'unknown') palette.splice(0, 3, '#141b1c', '#41544f', '#8b9b8f');
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
    atmosphereColor: kind === 'rocky' && (temperatureBand === 'hot' || temperatureBand === 'extreme') ? '#e39a69' : palette[2],
    atmosphereStrength: kind === 'rocky' ? 0.18 : kind === 'unknown' ? 0.18 : 0.42,
    displayRadius: Math.min(2.45, Math.max(1.55, 1.5 + Math.cbrt(Math.max(0.1, radius)) * 0.36)),
    illumination: insolation === null ? 0.95 : Math.min(1.25, Math.max(0.82, 0.92 + Math.log10(insolation + 1) * 0.2)),
    starColor: teff < 3700 ? '#ffb07a' : teff < 5200 ? '#ffd0a0' : teff < 6500 ? '#ffe5bd' : '#c7dcff',
    noiseScale: 1.8 + random() * 3.4,
    bandCount: 4 + Math.floor(random() * 6),
    axialTilt: random() * 0.55 - 0.275,
    rotationSeconds: 70 + random() * 110,
    temperatureBand,
    paletteVariant,
    cloudCover: 0.3 + random() * 0.38,
    relief: 0.55 + random() * 0.8,
    storminess: random(),
    heat: temperature === null ? 0 : Math.min(1, Math.max(0, (temperature - 500) / 1100)),
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
