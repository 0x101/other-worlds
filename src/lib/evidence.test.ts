import { describe, expect, it } from 'vitest';
import { evidenceFor, detectionLabels } from './evidence';
import { makePlanet } from '../test/fixtures';

describe('evidence provenance labels', () => {
  it('separates archive source fields, calculations, and reconstruction', () => {
    const planet = makePlanet({ pl_rade: 2, pl_bmasse: 4, pl_orbsmax: 0.4, tran_flag: 1, rv_flag: 1 });
    const evidence = evidenceFor(planet, [planet]);
    expect(evidence.find((item) => item.label === 'Planet radius')).toMatchObject({ status: 'MEASURED', value: '2 R⊕' });
    expect(evidence.find((item) => item.label === 'Surface gravity')).toMatchObject({ status: 'DERIVED', value: '9.81 m/s²' });
    expect(evidence.find((item) => item.label === 'Surface & clouds')?.status).toBe('IMAGINED');
    expect(detectionLabels(planet)).toEqual(['Transit', 'Radial velocity']);
  });

  it('keeps missing measurements and dependent calculations Unknown', () => {
    const planet = makePlanet({ pl_rade: null, pl_bmasse: null, pl_orbsmax: null, pl_orbper: null });
    const evidence = evidenceFor(planet, [planet]);
    expect(evidence.find((item) => item.label === 'Planet radius')?.value).toBe('Unknown');
    expect(evidence.find((item) => item.label === 'Planet mass')?.value).toBe('Unknown');
    expect(evidence.find((item) => item.label === 'Surface gravity')?.value).toBe('Unknown');
    expect(evidence.find((item) => item.label === 'Displayed orbit radius')?.status).toBe('IMAGINED');
  });
});
