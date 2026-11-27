import { describe, expect, it } from 'vitest';
import { DEFAULT_SOLAR_EPOCH, SOLAR_MAX_EPOCH, SOLAR_MIN_EPOCH, formatSolarEpoch, normalizeSolarEpoch, shiftSolarEpoch, solarEpochFromDate, solarEpochMs } from './solarTime';

describe('explicit Solar System model time', () => {
  it('uses the preserved epoch for absent, malformed, normalized, or out-of-window URL input', () => {
    expect(normalizeSolarEpoch(null)).toBe(DEFAULT_SOLAR_EPOCH);
    expect(normalizeSolarEpoch('not-a-date')).toBe(DEFAULT_SOLAR_EPOCH);
    expect(normalizeSolarEpoch('2026-02-30T00:00:00.000Z')).toBe(DEFAULT_SOLAR_EPOCH);
    expect(normalizeSolarEpoch('1999-12-31T23:59:59.999Z')).toBe(DEFAULT_SOLAR_EPOCH);
    expect(normalizeSolarEpoch('2100-01-01T00:00:00.001Z')).toBe(DEFAULT_SOLAR_EPOCH);
    expect(normalizeSolarEpoch('2027-01-02T03:04:05.006Z')).toBe('2027-01-02T03:04:05.006Z');
  });

  it('steps in UTC days and clamps at the explicit model window', () => {
    expect(shiftSolarEpoch(DEFAULT_SOLAR_EPOCH, 1)).toBe('2026-11-27T00:00:00.000Z');
    expect(shiftSolarEpoch(DEFAULT_SOLAR_EPOCH, -1)).toBe('2026-11-25T00:00:00.000Z');
    expect(shiftSolarEpoch(DEFAULT_SOLAR_EPOCH, 0.25)).toBe('2026-11-26T06:00:00.000Z');
    expect(shiftSolarEpoch(SOLAR_MIN_EPOCH, -1)).toBe(SOLAR_MIN_EPOCH);
    expect(shiftSolarEpoch(SOLAR_MAX_EPOCH, 1)).toBe(SOLAR_MAX_EPOCH);
    expect(() => shiftSolarEpoch(DEFAULT_SOLAR_EPOCH, Number.NaN)).toThrow();
  });

  it('formats and selects explicit UTC values without using local timezone or the current clock', () => {
    expect(formatSolarEpoch(DEFAULT_SOLAR_EPOCH)).toBe('26 NOV 2026 · 00:00 UTC');
    expect(formatSolarEpoch('2027-01-02T03:04:05.006Z')).toBe('02 JAN 2027 · 03:04:05.006 UTC');
    expect(formatSolarEpoch('2027-01-02T03:04:05.000Z')).toBe('02 JAN 2027 · 03:04:05 UTC');
    expect(solarEpochFromDate('2028-02-29')).toBe('2028-02-29T00:00:00.000Z');
    expect(() => solarEpochFromDate('2027-02-29')).toThrow();
    expect(solarEpochMs(SOLAR_MIN_EPOCH)).toBe(Date.UTC(2000, 0, 1));
  });
});
