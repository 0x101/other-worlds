import type { ExperienceName, FilterName, JourneyState, ShareTemplate, ViewName } from '../types';

const VIEWS: ViewName[] = ['atlas', 'system', 'planet'];
const FILTERS: FilterName[] = ['all', 'rocky', 'giants', 'temperate', 'transiting', 'nearby'];
const EXPERIENCES: ExperienceName[] = ['wonder', 'observatory'];
const SHARE_TEMPLATES: ShareTemplate[] = ['portrait', 'field-note', 'orbital-study'];

export const DEFAULT_JOURNEY: JourneyState = {
  view: 'atlas',
  planetName: null,
  filter: 'all',
  query: '',
  experience: 'wonder',
  evidenceOpen: false,
  camera: { azimuth: 0, elevation: 0.08 },
  shareTemplate: null,
};

function finiteParam(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function parseJourney(search: string): JourneyState {
  const params = new URLSearchParams(search);
  const viewParam = params.get('view') as ViewName | null;
  const filterParam = params.get('filter') as FilterName | null;
  const modeParam = params.get('mode');
  const planetName = params.get('planet')?.trim() || null;
  const view = viewParam && VIEWS.includes(viewParam) ? viewParam : 'atlas';
  const legacyEvidence = params.get('evidence') === '1';
  const legacyStudio = modeParam === 'studio';
  const experience: ExperienceName = modeParam === 'observatory' || legacyEvidence ? 'observatory' : 'wonder';
  const shareParam = params.get('share') as ShareTemplate | null;
  const requestedShare = shareParam && SHARE_TEMPLATES.includes(shareParam) ? shareParam : legacyStudio ? 'portrait' : null;
  const shareTemplate = planetName ? requestedShare : null;
  return {
    view: planetName && view !== 'atlas' ? view : planetName ? 'system' : 'atlas',
    planetName,
    filter: filterParam && FILTERS.includes(filterParam) ? filterParam : 'all',
    query: params.get('q')?.slice(0, 120) ?? '',
    experience: planetName ? experience : 'wonder',
    evidenceOpen: Boolean(planetName && !shareTemplate && (legacyEvidence || experience === 'observatory')),
    camera: {
      azimuth: Math.max(-Math.PI * 2, Math.min(Math.PI * 2, finiteParam(params, 'az', 0))),
      elevation: Math.max(-1.2, Math.min(1.2, finiteParam(params, 'el', 0.08))),
    },
    shareTemplate,
  };
}

export function journeySearch(state: JourneyState): string {
  const params = new URLSearchParams();
  if (state.planetName) params.set('planet', state.planetName);
  if (state.planetName && state.view !== 'atlas') params.set('view', state.view);
  if (state.filter !== 'all') params.set('filter', state.filter);
  if (state.query) params.set('q', state.query);
  if (state.planetName && state.experience !== 'wonder' && EXPERIENCES.includes(state.experience)) params.set('mode', state.experience);
  if (state.evidenceOpen && !state.shareTemplate && state.planetName && state.experience !== 'observatory') params.set('evidence', '1');
  if (state.view === 'planet') {
    params.set('az', state.camera.azimuth.toFixed(3));
    params.set('el', state.camera.elevation.toFixed(3));
  }
  if (state.planetName && state.shareTemplate && SHARE_TEMPLATES.includes(state.shareTemplate)) params.set('share', state.shareTemplate);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function updateBrowserUrl(state: JourneyState, mode: 'push' | 'replace' = 'replace'): void {
  const url = `${window.location.pathname}${journeySearch(state)}${window.location.hash}`;
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](state, '', url);
}
