import { describe, expect, it } from 'vitest';
import { GAIA_BY_ID, GAIA_NEIGHBOURHOOD, gaiaDisplayColour, gaiaDisplayPosition, gaiaDisplayRadius, parseGaiaNeighbourhood } from './gaia';

function withStar(patch: Record<string, unknown>) {
  return { ...GAIA_NEIGHBOURHOOD, stars: GAIA_NEIGHBOURHOOD.stars.map((star, index) => index === 0 ? { ...star, ...patch } : star) };
}

describe('Gaia DR3 neighbourhood', () => {
  it('preserves exact source identities, epoch, quality fields, and published distances', () => {
    expect(GAIA_NEIGHBOURHOOD.rowCount).toBe(384);
    expect(GAIA_NEIGHBOURHOOD.stars).toHaveLength(384);
    expect(GAIA_NEIGHBOURHOOD.referenceEpoch).toEqual({ value: 2016, label: 'J2016.0', timeScale: 'TCB' });
    expect(new Set(GAIA_NEIGHBOURHOOD.stars.map((star) => star.source_id)).size).toBe(384);
    expect(GAIA_NEIGHBOURHOOD.stars.every((star) => typeof star.source_id === 'string' && star.parallax_over_error >= 20 && star.ruwe <= 1.4)).toBe(true);
    const barnardsStar = GAIA_BY_ID.get('4472832130942575872')!;
    expect(barnardsStar.parallax).toBeCloseTo(546.975939730948, 10);
    expect(barnardsStar.r_med_geo).toBe(1.8281064);
    expect(barnardsStar.r_med_geo).not.toBe(1000 / barnardsStar.parallax);
    expect(barnardsStar.r_lo_geo).toBeLessThan(barnardsStar.r_med_geo);
    expect(barnardsStar.r_hi_geo).toBeGreaterThan(barnardsStar.r_med_geo);
  });

  it('uses published heliocentric geometric distance for compressed display geometry', () => {
    const star = { ...GAIA_NEIGHBOURHOOD.stars[0], ra: 0, dec: 0, r_med_geo: 10 };
    const position = gaiaDisplayPosition(star);
    const radius = 5 + Math.log10(11) * 13;
    expect(position.x).toBeCloseTo(radius, 10);
    expect(position.y).toBe(0);
    expect(position.z).toBe(0);
    expect(gaiaDisplayRadius(20)).toBeGreaterThan(gaiaDisplayRadius(2));
    expect(() => gaiaDisplayRadius(0)).toThrow();
  });

  it('rejects unsafe IDs, epochs, parallaxes, and distances instead of supplying fallbacks', () => {
    expect(() => parseGaiaNeighbourhood(withStar({ source_id: 4472832130942575872 }))).toThrow(/source ID/);
    expect(() => parseGaiaNeighbourhood(withStar({ ref_epoch: 2015.5 }))).toThrow(/J2016/);
    expect(() => parseGaiaNeighbourhood(withStar({ parallax_over_error: 8 }))).toThrow(/parallax quality/);
    expect(() => parseGaiaNeighbourhood(withStar({ parallax: -2 }))).toThrow(/parallax quality/);
    expect(() => parseGaiaNeighbourhood(withStar({ r_med_geo: null }))).toThrow(/r_med_geo/);
    expect(() => parseGaiaNeighbourhood(withStar({ r_lo_geo: 20 }))).toThrow(/distance interval/);
  });

  it('maps measured BP-RP to bounded display colours without claiming imaging', () => {
    expect(gaiaDisplayColour(-0.4)).toBe('#91b7ff');
    expect(gaiaDisplayColour(4.5)).toBe('#dc7957');
    expect(gaiaDisplayColour(1.2)).toMatch(/^#[0-9a-f]{6}$/);
    expect(() => gaiaDisplayColour(Number.NaN)).toThrow();
  });
});
