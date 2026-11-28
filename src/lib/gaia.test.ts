import { describe, expect, it } from 'vitest';
import {
  GAIA_BY_ID,
  GAIA_MAX_YEAR_OFFSET,
  GAIA_MIN_YEAR_OFFSET,
  GAIA_NEIGHBOURHOOD,
  formatGaiaTime,
  gaiaDisplayColour,
  gaiaDisplayPosition,
  gaiaDisplayRadius,
  gaiaStateAt,
  normalizeGaiaYearOffset,
  parseGaiaNeighbourhood,
  shiftGaiaYearOffset,
  type GaiaStar,
} from './gaia';

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
    expect(GAIA_NEIGHBOURHOOD.motionModel).toMatchObject({ status: 'DERIVED', timeScale: 'TCB', minYearOffset: -10000, maxYearOffset: 10000, stepYears: 1000 });
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

  it('propagates local tangent proper motion with μα* already including cos(δ)', () => {
    const star: GaiaStar = { ...GAIA_NEIGHBOURHOOD.stars[0], ra: 0, dec: 0, r_med_geo: 10, pmra: 206264.80624709636, pmdec: 0 };
    const state = gaiaStateAt(star, 100);
    // 206264.806... mas/yr is 0.001 rad/yr: 100 years adds 1 pc transversely at 10 pc.
    expect(state.positionPc.x).toBeCloseTo(10, 10);
    expect(state.positionPc.y).toBeCloseTo(0, 12);
    expect(state.positionPc.z).toBeCloseTo(1, 10);
    expect(state.distancePc).toBeCloseTo(Math.sqrt(101), 10);
    expect(state.ra).toBeCloseTo(Math.atan2(1, 10) * 180 / Math.PI, 10);
    expect(state.dec).toBeCloseTo(0, 12);
    expect(Math.hypot(state.displayPosition.x, state.displayPosition.y, state.displayPosition.z)).toBeCloseTo(gaiaDisplayRadius(10), 10);
  });

  it('keeps declination motion distinct and remains finite near a celestial pole', () => {
    const star = { ...GAIA_NEIGHBOURHOOD.stars[0], ra: 275, dec: 89.999, pmra: 100000, pmdec: -1000 };
    const state = gaiaStateAt(star, -10000);
    expect(Number.isFinite(state.ra) && Number.isFinite(state.dec)).toBe(true);
    expect(state.ra).toBeGreaterThanOrEqual(0);
    expect(state.ra).toBeLessThan(360);
    expect(state.dec).toBeGreaterThanOrEqual(-90);
    expect(state.dec).toBeLessThanOrEqual(90);
    expect(state.distancePc).toBeGreaterThan(0);
    const reference = gaiaStateAt(star, 0);
    expect(reference.ra).toBeCloseTo(star.ra, 10);
    // Inverse trigonometry near the pole loses sub-nanodegree precision in float64.
    expect(reference.dec).toBeCloseTo(star.dec, 9);
  });

  it('moves Barnard’s Star without replacing its exact identity or J2016.0 distance interval', () => {
    const star = GAIA_BY_ID.get('4472832130942575872')!;
    const state = gaiaStateAt(star, 1000);
    expect(state.sourceId).toBe(star.source_id);
    expect(state.ra).toBeLessThan(star.ra);
    expect(state.dec).toBeGreaterThan(star.dec);
    expect(star.r_lo_geo).toBe(1.82797492);
    expect(star.r_hi_geo).toBe(1.82822526);
    expect(gaiaDisplayPosition(star, 1000)).toEqual(state.displayPosition);
    expect(gaiaStateAt(star, 0).displayPosition).toEqual(gaiaDisplayPosition(star));
  });

  it('uses strict integer Julian-year offsets, bounded manual steps, and explicit TCB labels', () => {
    expect(normalizeGaiaYearOffset(null)).toBe(0);
    expect(normalizeGaiaYearOffset('1000')).toBe(1000);
    expect(normalizeGaiaYearOffset('-10000')).toBe(-10000);
    for (const invalid of ['1.5', '+1000', '01', 'Infinity', '10001', 'invalid']) expect(normalizeGaiaYearOffset(invalid)).toBe(0);
    expect(shiftGaiaYearOffset(0)).toBe(1000);
    expect(shiftGaiaYearOffset(0, -1000)).toBe(-1000);
    expect(shiftGaiaYearOffset(GAIA_MAX_YEAR_OFFSET)).toBe(GAIA_MAX_YEAR_OFFSET);
    expect(shiftGaiaYearOffset(GAIA_MIN_YEAR_OFFSET, -1000)).toBe(GAIA_MIN_YEAR_OFFSET);
    expect(formatGaiaTime(0)).toBe('J2016.0 · reference epoch · TCB');
    expect(formatGaiaTime(1000)).toBe('J2016.0 + 1,000 Julian years · TCB');
    expect(formatGaiaTime(-1000)).toBe('J2016.0 − 1,000 Julian years · TCB');
    expect(() => gaiaStateAt(GAIA_NEIGHBOURHOOD.stars[0], 0.5)).toThrow(/integer/);
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
