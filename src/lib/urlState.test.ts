import { describe, expect, it } from 'vitest';
import { DEFAULT_JOURNEY, journeySearch, parseJourney } from './urlState';

 describe('shareable URL state', () => {
  it('round-trips a selected world, filters, Observatory, and camera', () => {
    const state = {
      ...DEFAULT_JOURNEY,
      view: 'planet' as const,
      planetName: '55 Cancri e',
      filter: 'rocky' as const,
      query: '55 Cnc',
      experience: 'observatory' as const,
      evidenceOpen: true,
      camera: { azimuth: 1.25, elevation: -0.2 },
    };
    const parsed = parseJourney(journeySearch(state));
    expect(parsed).toEqual(state);
    expect(journeySearch(state)).toContain('planet=55+Cancri+e');
    expect(journeySearch(state)).toContain('mode=observatory');
  });

  it('normalizes malformed input and clamps camera without recreating designer controls', () => {
    const parsed = parseJourney('?view=unknown&filter=wrong&planet=Test+b&az=99&el=-99&mode=unknown&exp=99&comp=wrong&crop=wrong&share=wrong');
    expect(parsed.view).toBe('system');
    expect(parsed.filter).toBe('all');
    expect(parsed.camera.azimuth).toBe(Math.PI * 2);
    expect(parsed.camera.elevation).toBe(-1.2);
    expect(parsed.experience).toBe('wonder');
    expect(parsed.shareTemplate).toBeNull();
    expect(journeySearch(parsed)).not.toMatch(/exp=|comp=|crop=|studio/);
  });

  it('round-trips each finished Share template with the exact world and camera', () => {
    for (const shareTemplate of ['portrait', 'field-note', 'orbital-study'] as const) {
      const state = { ...DEFAULT_JOURNEY, view: 'planet' as const, planetName: 'K2-18 b', shareTemplate, camera: { azimuth: 0.4, elevation: -0.1 } };
      expect(parseJourney(journeySearch(state))).toEqual(state);
      expect(journeySearch(state)).toContain(`share=${shareTemplate}`);
    }
  });

  it('migrates legacy standalone Studio links to Portrait without dead designer state', () => {
    const parsed = parseJourney('?planet=K2-18+b&view=planet&mode=studio&az=0.4&el=-0.1&exp=0.85&comp=left&crop=square');
    expect(parsed).toMatchObject({ experience: 'wonder', shareTemplate: 'portrait', evidenceOpen: false });
    expect(journeySearch(parsed)).toBe('?planet=K2-18+b&view=planet&az=0.400&el=-0.100&share=portrait');
  });

  it('supports legacy evidence URLs without exposing evidence without a planet', () => {
    expect(parseJourney('?planet=Test+b&view=planet&evidence=1').experience).toBe('observatory');
    expect(parseJourney('?evidence=1').evidenceOpen).toBe(false);
    expect(journeySearch({ ...DEFAULT_JOURNEY, evidenceOpen: true })).toBe('');
  });

  it('keeps Share contextual when opened over Observatory', () => {
    const parsed = parseJourney('?planet=Test+b&view=planet&mode=observatory&share=field-note&az=0&el=0.08');
    expect(parsed.experience).toBe('observatory');
    expect(parsed.evidenceOpen).toBe(false);
    expect(parsed.shareTemplate).toBe('field-note');
  });

  it('opens at Earth and exposes Explore without turning it into the default destination', () => {
    expect(parseJourney('')).toEqual(DEFAULT_JOURNEY);
    expect(parseJourney('?view=atlas')).toMatchObject({ view: 'atlas', planetName: null });
    expect(journeySearch(parseJourney('?view=atlas'))).toBe('?view=atlas');
    expect(parseJourney('?view=lookback')).toMatchObject({ view: 'earth', planetName: null });
  });

  it('round-trips golden-path stops, look-back selection, and the route origin', () => {
    for (const view of ['solar', 'neighbourhood'] as const) {
      expect(parseJourney(journeySearch({ ...DEFAULT_JOURNEY, view }))).toEqual({ ...DEFAULT_JOURNEY, view });
    }
    const lookback = { ...DEFAULT_JOURNEY, view: 'lookback' as const, planetName: 'TRAPPIST-1 e' };
    expect(parseJourney(journeySearch(lookback))).toEqual(lookback);
    expect(journeySearch(lookback)).toContain('view=lookback');
    const fromAtlas = { ...lookback, view: 'system' as const, origin: 'atlas' as const };
    expect(parseJourney(journeySearch(fromAtlas))).toEqual(fromAtlas);
    expect(journeySearch(fromAtlas)).toContain('from=atlas');
  });

  it('round-trips only a valid explicit Solar System epoch', () => {
    const selected = { ...DEFAULT_JOURNEY, view: 'solar' as const, solarEpoch: '2027-01-02T03:04:05.006Z' };
    expect(journeySearch(selected)).toBe('?view=solar&epoch=2027-01-02T03%3A04%3A05.006Z');
    expect(parseJourney(journeySearch(selected))).toEqual(selected);
    expect(parseJourney('?view=solar&epoch=1999-01-01T00%3A00%3A00.000Z').solarEpoch).toBe(DEFAULT_JOURNEY.solarEpoch);
    expect(parseJourney('?view=solar&epoch=invalid').solarEpoch).toBe(DEFAULT_JOURNEY.solarEpoch);
    expect(journeySearch({ ...selected, view: 'earth' })).toBe('');
  });

  it('round-trips an open ISS expedition only on Earth and fails invalid time closed to its source epoch', () => {
    const selected = { ...DEFAULT_JOURNEY, issEpoch: '2026-11-27T09:39:25.185Z' };
    expect(journeySearch(selected)).toBe('?iss=2026-11-27T09%3A39%3A25.185Z');
    expect(parseJourney(journeySearch(selected))).toEqual(selected);
    expect(parseJourney('?iss=invalid')).toEqual({ ...DEFAULT_JOURNEY, issEpoch: '2026-11-27T09:29:25.185Z' });
    expect(parseJourney('?iss=2026-11-28T09%3A39%3A25.185Z').issEpoch).toBe('2026-11-27T09:29:25.185Z');
    expect(parseJourney('?view=solar&iss=2026-11-27T09%3A39%3A25.185Z').issEpoch).toBeNull();
    expect(journeySearch({ ...selected, view: 'solar' })).toBe('?view=solar');
  });

  it('round-trips Moon time only on Earth and keeps one Earth expedition active', () => {
    const selected = { ...DEFAULT_JOURNEY, moonEpoch: '2026-12-18T03:00:00.000Z' };
    expect(journeySearch(selected)).toBe('?moon=2026-12-18T03%3A00%3A00.000Z');
    expect(parseJourney(journeySearch(selected))).toEqual(selected);
    expect(parseJourney('?moon=invalid')).toEqual({ ...DEFAULT_JOURNEY, moonEpoch: '2026-12-18T00:00:00.000Z' });
    expect(parseJourney('?moon=2026-12-20T00%3A00%3A00.000Z').moonEpoch).toBe('2026-12-18T00:00:00.000Z');
    expect(parseJourney('?view=solar&moon=2026-12-18T03%3A00%3A00.000Z').moonEpoch).toBeNull();
    expect(journeySearch({ ...selected, view: 'solar' })).toBe('?view=solar');
    expect(parseJourney('?iss=2026-11-27T09%3A39%3A25.185Z&moon=2026-12-18T03%3A00%3A00.000Z')).toMatchObject({ issEpoch: '2026-11-27T09:39:25.185Z', moonEpoch: null });
    expect(journeySearch({ ...selected, issEpoch: '2026-11-27T09:39:25.185Z' })).toBe('?iss=2026-11-27T09%3A39%3A25.185Z');
  });
});
