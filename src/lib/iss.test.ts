import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ISS_EPOCH,
  ISS_DISPLAY_RADIUS,
  ISS_EXPEDITION,
  ISS_MAX_EPOCH,
  ISS_MIN_EPOCH,
  formatIssEpoch,
  formatIssOffset,
  issEpochMs,
  issSourceAgeLabel,
  issStateAt,
  issTraceAt,
  normalizeIssEpoch,
  shiftIssEpoch,
} from './iss';

 describe('archived ISS scientific contract', () => {
  it('retains one exact OMM identity, source epoch, retrieval record, units, frame, and historical status', () => {
    expect(ISS_EXPEDITION.schema).toBe('other-worlds/iss-expedition-v1');
    expect(ISS_EXPEDITION.object).toEqual({ name: 'ISS (ZARYA)', internationalDesignator: '1998-067A', noradCatalogueId: '25544' });
    expect(ISS_EXPEDITION.source.sourceEpoch).toBe('2026-11-27T09:29:25.185696Z');
    expect(ISS_EXPEDITION.source.retrievedAt).toBe('2026-11-27T19:21:43.000Z');
    expect(ISS_EXPEDITION.source.rawSha256).toBe('c624f089e59c598a1355cf34f3f6e5030262ee7f6c9d770186dfea6788bf46be');
    expect(ISS_EXPEDITION.position).toMatchObject({ units: 'km', frame: 'TEME', lightTimeCorrection: false, uncertainty: null });
    expect(ISS_EXPEDITION.staleness).toMatchObject({ historical: true, liveRefresh: false });
    expect(issSourceAgeLabel()).toBe('9 h 52 min old when preserved');
    expect(ISS_EXPEDITION.propagator).toMatchObject({ name: 'satellite.js', version: '7.2.0' });
  });

  it('uses the source instant quantized to milliseconds and rejects normalized or out-of-window URL input', () => {
    expect(DEFAULT_ISS_EPOCH).toBe('2026-11-27T09:29:25.185Z');
    expect(Math.abs(issEpochMs(DEFAULT_ISS_EPOCH) - Date.parse(ISS_EXPEDITION.source.sourceEpoch))).toBeLessThan(1);
    expect(normalizeIssEpoch('invalid')).toBe(DEFAULT_ISS_EPOCH);
    expect(normalizeIssEpoch('2026-11-27T09:39:25.185Z')).toBe('2026-11-27T09:39:25.185Z');
    expect(() => issEpochMs('2026-11-27T09:29:25.185696Z')).toThrow(/ISO UTC/);
    expect(normalizeIssEpoch('2026-11-28T09:29:25.185Z')).toBe(DEFAULT_ISS_EPOCH);
    expect(formatIssEpoch(DEFAULT_ISS_EPOCH)).toBe('27 NOV 2026 · 09:29:25.185 UTC');
  });

  it('clamps deterministic ten-minute steps without silently extending the product window', () => {
    expect(shiftIssEpoch(DEFAULT_ISS_EPOCH)).toBe('2026-11-27T09:39:25.185Z');
    expect(shiftIssEpoch(DEFAULT_ISS_EPOCH, -10)).toBe('2026-11-27T09:19:25.185Z');
    expect(shiftIssEpoch(ISS_MAX_EPOCH)).toBe(ISS_MAX_EPOCH);
    expect(shiftIssEpoch(ISS_MIN_EPOCH, -10)).toBe(ISS_MIN_EPOCH);
    expect(formatIssOffset(0)).toBe('At OMM source epoch');
    expect(formatIssOffset(10)).toBe('+10.0 min from OMM epoch');
    expect(formatIssOffset(-180)).toBe('−3.0 h from OMM epoch');
  });

  it('reproduces the pinned reference TEME state and changes only through explicit selected time', () => {
    const reference = issStateAt();
    expect(reference.status).toBe('DERIVED');
    reference.temeKm.forEach((value, index) => expect(value).toBeCloseTo(ISS_EXPEDITION.referencePropagation.temeKm[index], 9));
    expect(reference.geocentricDistanceKm).toBeCloseTo(ISS_EXPEDITION.referencePropagation.geocentricDistanceKm, 9);
    expect(Math.hypot(...Object.values(reference.displayPosition))).toBeCloseTo(ISS_DISPLAY_RADIUS, 12);
    expect(reference.displayPosition).toEqual({ x: reference.temeKm[0] * ISS_DISPLAY_RADIUS / reference.geocentricDistanceKm, y: reference.temeKm[2] * ISS_DISPLAY_RADIUS / reference.geocentricDistanceKm, z: -reference.temeKm[1] * ISS_DISPLAY_RADIUS / reference.geocentricDistanceKm });
    expect(issStateAt()).toEqual(reference);
    expect(issStateAt(shiftIssEpoch(DEFAULT_ISS_EPOCH)).temeKm).not.toEqual(reference.temeKm);
  });

  it('provides a finite 47-sample derived trace at the reference and both selection bounds', () => {
    for (const epoch of [DEFAULT_ISS_EPOCH, ISS_MIN_EPOCH, ISS_MAX_EPOCH]) {
      const trace = issTraceAt(epoch);
      expect(trace).toHaveLength(47);
      expect(trace.every((point) => Object.values(point).every(Number.isFinite))).toBe(true);
      expect(new Set(trace.map((point) => JSON.stringify(point))).size).toBe(47);
      trace.forEach((point) => expect(Math.hypot(...Object.values(point))).toBeCloseTo(ISS_DISPLAY_RADIUS, 12));
    }
  });
});
