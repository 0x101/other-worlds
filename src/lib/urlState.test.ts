import { describe, expect, it } from 'vitest';
import { DEFAULT_JOURNEY, journeySearch, parseJourney } from './urlState';

describe('shareable URL state', () => {
  it('round-trips a selected world, filters, evidence, and camera', () => {
    const state = {
      ...DEFAULT_JOURNEY,
      view: 'planet' as const,
      planetName: '55 Cancri e',
      filter: 'rocky' as const,
      query: '55 Cnc',
      evidenceOpen: true,
      camera: { azimuth: 1.25, elevation: -0.2 },
    };
    const parsed = parseJourney(journeySearch(state));
    expect(parsed).toEqual({ ...state, camera: { azimuth: 1.25, elevation: -0.2 } });
    expect(journeySearch(state)).toContain('planet=55+Cancri+e');
  });

  it('normalizes malformed input and clamps camera angles', () => {
    const parsed = parseJourney('?view=unknown&filter=wrong&planet=Test+b&az=99&el=-99&evidence=1');
    expect(parsed.view).toBe('system');
    expect(parsed.filter).toBe('all');
    expect(parsed.camera.azimuth).toBe(Math.PI * 2);
    expect(parsed.camera.elevation).toBe(-1.2);
  });

  it('does not expose evidence state without a selected planet', () => {
    expect(parseJourney('?evidence=1').evidenceOpen).toBe(false);
    expect(journeySearch({ ...DEFAULT_JOURNEY, evidenceOpen: true })).toBe('');
  });
});
