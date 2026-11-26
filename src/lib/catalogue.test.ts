import { describe, expect, it } from 'vitest';
import { filterPlanets, parseCatalogue, skyPosition } from './catalogue';
import { makePlanet } from '../test/fixtures';

describe('catalogue parsing', () => {
  it('keeps source nulls unknown and indexes every unique planet', () => {
    const catalogue = parseCatalogue([
      { pl_name: 'Alpha b', hostname: 'Alpha', pl_rade: null, pl_eqt: 250 },
      { pl_name: 'Alpha c', hostname: 'Alpha', pl_rade: 2.1 },
    ]);
    expect(catalogue.planets).toHaveLength(2);
    expect(catalogue.byName.get('Alpha b')?.pl_rade).toBeNull();
    expect(catalogue.byName.get('Alpha b')?.pl_bmasse).toBeNull();
    expect(catalogue.systems.get('Alpha')).toHaveLength(2);
  });

  it('rejects malformed rows, non-finite values, and duplicate identifiers', () => {
    expect(() => parseCatalogue([])).toThrow('empty');
    expect(() => parseCatalogue([{ pl_name: '', hostname: 'Alpha' }])).toThrow('identifier');
    expect(() => parseCatalogue([{ pl_name: 'Alpha b', hostname: 'Alpha', pl_rade: Number.NaN }])).toThrow('pl_rade');
    expect(() => parseCatalogue([{ pl_name: 'Alpha b', hostname: 'Alpha' }, { pl_name: 'Alpha b', hostname: 'Alpha' }])).toThrow('Duplicate');
  });

  it('marks missing atlas distances as imagined instead of inventing parsecs', () => {
    const missing = skyPosition(makePlanet({ ra: 10, dec: 20, sy_dist: null }));
    const measured = skyPosition(makePlanet({ ra: 10, dec: 20, sy_dist: 100 }));
    expect(missing.distanceSource).toBe('IMAGINED');
    expect(measured.distanceSource).toBe('MEASURED');
  });
});

describe('search and filters', () => {
  const worlds = [
    makePlanet({ pl_name: 'Rock b', hostname: 'Rock', pl_rade: 1.1, pl_eqt: 260, tran_flag: 1, sy_dist: 12 }),
    makePlanet({ pl_name: 'Gas c', hostname: 'Gas', pl_rade: 11, pl_eqt: 900, tran_flag: 0, sy_dist: 200 }),
    makePlanet({ pl_name: 'Unknown d', hostname: 'Elsewhere', pl_rade: null, pl_eqt: null }),
  ];

  it('searches both planet and host identifiers case-insensitively', () => {
    expect(filterPlanets(worlds, 'elsewhere', 'all').map((row) => row.pl_name)).toEqual(['Unknown d']);
    expect(filterPlanets(worlds, 'ROCK', 'all')).toHaveLength(1);
  });

  it('applies only evidence-supported filter membership', () => {
    expect(filterPlanets(worlds, '', 'rocky').map((row) => row.pl_name)).toEqual(['Rock b']);
    expect(filterPlanets(worlds, '', 'giants').map((row) => row.pl_name)).toEqual(['Gas c']);
    expect(filterPlanets(worlds, '', 'temperate').map((row) => row.pl_name)).toEqual(['Rock b']);
    expect(filterPlanets(worlds, '', 'transiting').map((row) => row.pl_name)).toEqual(['Rock b']);
    expect(filterPlanets(worlds, '', 'nearby').map((row) => row.pl_name)).toEqual(['Rock b']);
  });
});
