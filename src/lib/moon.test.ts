import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MOON_EPOCH,
  MOON_DISPLAY_RADIUS,
  MOON_EXPEDITION,
  MOON_MAX_EPOCH,
  MOON_MIN_EPOCH,
  formatMoonEpoch,
  formatMoonOffset,
  moonEpochMs,
  moonStateAt,
  moonTraceAt,
  normalizeMoonEpoch,
  shiftMoonEpoch,
} from './moon';

describe('timestamped Moon scientific contract', () => {
  it('retains the pinned generator, reference epoch, units, frames, time semantics, and uncertainty limits', () => {
    expect(MOON_EXPEDITION.schema).toBe('other-worlds/moon-expedition-v1');
    expect(MOON_EXPEDITION.source).toMatchObject({ name: 'Astronomy Engine', version: '2.1.19', generatedAt: '2026-11-27T22:29:52.000Z' });
    expect(MOON_EXPEDITION.position).toMatchObject({ units: 'au', frame: 'EQJ/J2000', origin: 'Earth centre', lightTimeCorrection: false, aberrationCorrection: false, uncertainty: null });
    expect(MOON_EXPEDITION.source.timeSemantics).toContain('UT1 and UTC');
    expect(DEFAULT_MOON_EPOCH).toBe('2026-12-18T00:00:00.000Z');
    expect(MOON_MIN_EPOCH).toBe('2026-12-17T00:00:00.000Z');
    expect(MOON_MAX_EPOCH).toBe('2026-12-19T00:00:00.000Z');
  });

  it('uses strict explicit UTC milliseconds and clamps three-hour steps to the declared window', () => {
    expect(moonEpochMs(DEFAULT_MOON_EPOCH)).toBe(Date.parse(DEFAULT_MOON_EPOCH));
    expect(normalizeMoonEpoch('invalid')).toBe(DEFAULT_MOON_EPOCH);
    expect(normalizeMoonEpoch('2026-12-20T00:00:00.000Z')).toBe(DEFAULT_MOON_EPOCH);
    expect(() => moonEpochMs('2026-12-18T00:00:00Z')).toThrow(/ISO UTC/);
    expect(shiftMoonEpoch(DEFAULT_MOON_EPOCH)).toBe('2026-12-18T03:00:00.000Z');
    expect(shiftMoonEpoch(MOON_MAX_EPOCH)).toBe(MOON_MAX_EPOCH);
    expect(shiftMoonEpoch(MOON_MIN_EPOCH, -180)).toBe(MOON_MIN_EPOCH);
    expect(formatMoonEpoch(DEFAULT_MOON_EPOCH)).toBe('18 DEC 2026 · 00:00 UTC');
    expect(formatMoonOffset(0)).toBe('At reference epoch');
    expect(formatMoonOffset(180)).toBe('+3.0 h from reference');
  });

  it('reproduces the reference geocentric EQJ/ECL vectors and preserves direction through display compression', () => {
    const state = moonStateAt();
    expect(state.status).toBe('DERIVED');
    state.eqjAu.forEach((value, index) => expect(value).toBeCloseTo(MOON_EXPEDITION.referenceDerivation.eqjAu[index], 11));
    state.eclipticAu.forEach((value, index) => expect(value).toBeCloseTo(MOON_EXPEDITION.referenceDerivation.eclipticAu[index], 11));
    expect(state.geocentricDistanceKm).toBeCloseTo(MOON_EXPEDITION.referenceDerivation.geocentricDistanceKm, 8);
    const scale = MOON_DISPLAY_RADIUS / Math.hypot(...state.eclipticAu);
    expect(state.displayPosition).toEqual({ x: state.eclipticAu[0] * scale, y: state.eclipticAu[2] * scale, z: -state.eclipticAu[1] * scale });
    expect(Math.hypot(...Object.values(state.displayPosition))).toBeCloseTo(MOON_DISPLAY_RADIUS, 12);
    expect(moonStateAt(shiftMoonEpoch(DEFAULT_MOON_EPOCH)).eqjAu).not.toEqual(state.eqjAu);
  });

  it('provides a finite unique 25-sample derived trace at the reference and both bounds', () => {
    for (const epoch of [DEFAULT_MOON_EPOCH, MOON_MIN_EPOCH, MOON_MAX_EPOCH]) {
      const trace = moonTraceAt(epoch);
      expect(trace).toHaveLength(25);
      expect(trace.every((point) => Object.values(point).every(Number.isFinite))).toBe(true);
      expect(new Set(trace.map((point) => JSON.stringify(point))).size).toBe(25);
      trace.forEach((point) => expect(Math.hypot(...Object.values(point))).toBeCloseTo(MOON_DISPLAY_RADIUS, 12));
    }
  });
});
