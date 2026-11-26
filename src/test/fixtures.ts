import type { PlanetRow } from '../types';
import { parseCatalogue } from '../lib/catalogue';

export function makePlanet(overrides: Partial<PlanetRow> = {}): PlanetRow {
  return parseCatalogue([{ pl_name: 'Example b', hostname: 'Example', ...overrides }]).planets[0];
}
