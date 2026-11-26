import { describe, expect, it } from 'vitest';
import { exactShareUrl, factsForTemplate, orbitalStudyModel, SHARE_TEMPLATE_SPECS, shareFacts, shareFilename } from './share';
import { DEFAULT_JOURNEY } from './urlState';
import { makePlanet } from '../test/fixtures';

describe('finished Share template mapping', () => {
  it('uses only source or transparently derived numeric facts', () => {
    const facts = shareFacts(makePlanet({ pl_rade: 2, pl_bmasse: 8, pl_orbper: 3, pl_insol: 4 }));
    expect(facts.slice(0, 4)).toEqual([
      { label: 'LOCAL YEAR', value: '3 days', status: 'MEASURED' },
      { label: 'RADIUS', value: '2 R⊕', status: 'MEASURED' },
      { label: 'SURFACE GRAVITY', value: '2 × Earth', status: 'DERIVED' },
      { label: 'STARLIGHT', value: '4 × Earth', status: 'MEASURED' },
    ]);
  });

  it('labels a sub-two-day hour conversion as derived', () => {
    expect(shareFacts(makePlanet({ pl_orbper: 0.5 }))[0]).toEqual({ label: 'LOCAL YEAR', value: '12 Earth hours', status: 'DERIVED' });
  });

  it('maps Portrait to one fact, Field Note to a small set, and Orbital Study to system data', () => {
    const planet = makePlanet({ pl_rade: 2, pl_bmasse: 8, pl_orbper: 3, pl_insol: 4, pl_eqt: 500, sy_dist: 10 });
    expect(factsForTemplate(planet, 'portrait')).toHaveLength(1);
    expect(factsForTemplate(planet, 'field-note')).toHaveLength(4);
    expect(factsForTemplate(planet, 'orbital-study')).toEqual([]);
  });

  it('omits missing facts without zero substitution', () => {
    const planet = makePlanet();
    expect(shareFacts(planet)).toEqual([]);
    expect(factsForTemplate(planet, 'portrait')).toEqual([]);
    expect(factsForTemplate(planet, 'field-note')).toEqual([]);
    const study = orbitalStudyModel(planet, [planet]);
    expect(study.rows[0]).toMatchObject({ period: null, eccentricity: null, radius: null });
    expect(study.hostFacts).toEqual([]);
  });

  it('uses real sibling values and omits unknown fields in Orbital Study', () => {
    const selected = makePlanet({ pl_name: 'Example b', hostname: 'Example', pl_orbper: 2, pl_rade: 1 });
    const sibling = makePlanet({ pl_name: 'Example c', hostname: 'Example', pl_orbper: null, pl_orbeccen: null, pl_rade: 3 });
    const study = orbitalStudyModel(selected, [sibling, selected]);
    expect(study.rows.map((row) => row.name)).toEqual(['Example b', 'Example c']);
    expect(study.rows[0]).toMatchObject({ selected: true, period: '2 days', radius: '1 R⊕' });
    expect(study.rows[1]).toMatchObject({ selected: false, period: null, eccentricity: null, radius: '3 R⊕' });
    expect(study.fingerprint).toEqual(study.fingerprint);
  });

  it('bounds long sibling lists while retaining the real total', () => {
    const selected = makePlanet({ pl_name: 'Example 00', hostname: 'Example' });
    const siblings = Array.from({ length: 12 }, (_, index) => makePlanet({ pl_name: `Example ${String(index).padStart(2, '0')}`, hostname: 'Example' }));
    const study = orbitalStudyModel(selected, siblings);
    expect(study.rows).toHaveLength(12);
    expect(study.visibleRows).toHaveLength(8);
    expect(study.hiddenRowCount).toBe(4);
  });

  it('encodes the exact world, camera, and finished template in the reopen URL', () => {
    const journey = { ...DEFAULT_JOURNEY, planetName: 'K2-18 b', view: 'planet' as const, camera: { azimuth: 0.4, elevation: -0.1 } };
    const url = exactShareUrl(journey, 'field-note', 'http://localhost:7100/?planet=old#fragment');
    expect(url).toBe('http://localhost:7100/?planet=K2-18+b&view=planet&az=0.400&el=-0.100&share=field-note');
    expect(shareFilename(makePlanet({ pl_name: 'K2-18 b' }), 'field-note')).toBe('k2-18-b-field-note.png');
  });

  it('provides high-resolution dimensions and stable filenames for all templates', () => {
    for (const template of ['portrait', 'field-note', 'orbital-study'] as const) {
      expect(SHARE_TEMPLATE_SPECS[template].width).toBeGreaterThanOrEqual(1800);
      expect(SHARE_TEMPLATE_SPECS[template].height).toBeGreaterThanOrEqual(1800);
      expect(shareFilename(makePlanet(), template)).toMatch(new RegExp(`-${template}\\.png$`));
    }
  });
});
