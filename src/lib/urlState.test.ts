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
});
