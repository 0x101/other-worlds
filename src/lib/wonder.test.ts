import { describe, expect, it } from 'vitest';
import { parseCatalogue } from './catalogue';
import { CURATED_JOURNEYS, journeyWorlds, wonderFor } from './wonder';
import { makePlanet } from '../test/fixtures';

const catalogue = parseCatalogue([...new Set(CURATED_JOURNEYS.flatMap((journey) => journey.planetNames))].map((name, index) => ({
  pl_name: name,
  hostname: name.startsWith('TRAPPIST-1') ? 'TRAPPIST-1' : `Host ${index}`,
  pl_orbper: name === '55 Cnc e' ? 0.7365474 : name === 'Kepler-10 b' ? 0.8374907 : name === 'WASP-18 b' ? 0.94145223 : name.startsWith('TRAPPIST-1') ? 6.101013 : null,
  pl_rade: 1,
  pl_bmasse: 1,
  pl_insol: 1,
  discoverymethod: name === '51 Peg b' ? 'Radial Velocity' : name === 'HD 95086 b' ? 'Imaging' : 'Transit',
})));

describe('Wonder and curated journeys', () => {
  it('resolves only real catalogue identities and preserves seven TRAPPIST-1 stops', () => {
    const seven = journeyWorlds(catalogue, CURATED_JOURNEYS[0]);
    expect(seven).toHaveLength(7);
    expect(new Set(seven.map((planet) => planet.hostname))).toEqual(new Set(['TRAPPIST-1']));
    expect(journeyWorlds(catalogue, { ...CURATED_JOURNEYS[1], planetNames: ['Not a real planet'] })).toEqual([]);
  });

  it('keeps every short-year stop below one Earth day', () => {
    for (const planet of journeyWorlds(catalogue, CURATED_JOURNEYS[1])) expect(planet.pl_orbper).toBeLessThan(1);
  });

  it('covers three distinct source discovery methods', () => {
    expect(new Set(journeyWorlds(catalogue, CURATED_JOURNEYS[2]).map((planet) => planet.discoverymethod))).toEqual(new Set(['Transit', 'Radial Velocity', 'Imaging']));
  });

  it('derives hour and gravity claims with transparent arithmetic', () => {
    const result = wonderFor(makePlanet({ pl_orbper: 0.5, pl_bmasse: 2, pl_rade: 2, pl_insol: 3 }));
    expect(result.facts[0].value).toBe('12 Earth hours');
    expect(result.facts[1].value).toBe('0.5 × Earth');
    expect(result.facts[2].value).toBe('3 × Earth');
  });

  it('shortens rather than fabricates a narrative when evidence is missing', () => {
    const result = wonderFor(makePlanet());
    expect(result.facts).toHaveLength(1);
    expect(result.facts[0].value).toBe('Much remains unknown');
    expect(JSON.stringify(result)).not.toContain('NaN');
  });
});
