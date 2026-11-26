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

  it('normalizes malformed input and clamps camera and artistic exposure', () => {
    const parsed = parseJourney('?view=unknown&filter=wrong&planet=Test+b&az=99&el=-99&mode=studio&exp=99&comp=wrong&crop=wrong');
    expect(parsed.view).toBe('system');
    expect(parsed.filter).toBe('all');
    expect(parsed.camera.azimuth).toBe(Math.PI * 2);
    expect(parsed.camera.elevation).toBe(-1.2);
    expect(parsed.studio).toEqual({ exposure: 1.4, composition: 'center', crop: 'wide' });
  });

  it('round-trips exact reproducible Studio controls', () => {
    const state = { ...DEFAULT_JOURNEY, view: 'planet' as const, planetName: 'K2-18 b', experience: 'studio' as const, studio: { exposure: 0.85, composition: 'left' as const, crop: 'square' as const } };
    expect(parseJourney(journeySearch(state))).toEqual(state);
  });

  it('supports legacy evidence URLs without exposing evidence without a planet', () => {
    expect(parseJourney('?planet=Test+b&view=planet&evidence=1').experience).toBe('observatory');
    expect(parseJourney('?evidence=1').evidenceOpen).toBe(false);
    expect(journeySearch({ ...DEFAULT_JOURNEY, evidenceOpen: true })).toBe('');
  });
});
