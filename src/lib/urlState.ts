import type { ExperienceName, FilterName, JourneyState, ViewName } from '../types';

const VIEWS: ViewName[] = ['atlas', 'system', 'planet'];
const FILTERS: FilterName[] = ['all', 'rocky', 'giants', 'temperate', 'transiting', 'nearby'];
const EXPERIENCES: ExperienceName[] = ['wonder', 'observatory', 'studio'];
const COMPOSITIONS = ['left', 'center', 'right'] as const;
const CROPS = ['wide', 'square'] as const;

export const DEFAULT_JOURNEY: JourneyState = {
  view: 'atlas',
  planetName: null,
  filter: 'all',
  query: '',
  experience: 'wonder',
  evidenceOpen: false,
  camera: { azimuth: 0, elevation: 0.08 },
  studio: { exposure: 1, composition: 'center', crop: 'wide' },
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
  const modeParam = params.get('mode') as ExperienceName | null;
  const planetName = params.get('planet')?.trim() || null;
  const view = viewParam && VIEWS.includes(viewParam) ? viewParam : 'atlas';
  const legacyEvidence = params.get('evidence') === '1';
  const experience = modeParam && EXPERIENCES.includes(modeParam) ? modeParam : legacyEvidence ? 'observatory' : 'wonder';
  const composition = params.get('comp');
  const crop = params.get('crop');
  return {
    view: planetName && view !== 'atlas' ? view : planetName ? 'system' : 'atlas',
    planetName,
    filter: filterParam && FILTERS.includes(filterParam) ? filterParam : 'all',
    query: params.get('q')?.slice(0, 120) ?? '',
    experience: planetName ? experience : 'wonder',
    evidenceOpen: Boolean(planetName && (legacyEvidence || experience === 'observatory')),
    camera: {
      azimuth: Math.max(-Math.PI * 2, Math.min(Math.PI * 2, finiteParam(params, 'az', 0))),
      elevation: Math.max(-1.2, Math.min(1.2, finiteParam(params, 'el', 0.08))),
    },
    studio: {
      exposure: Math.max(0.7, Math.min(1.4, finiteParam(params, 'exp', 1))),
      composition: COMPOSITIONS.includes(composition as typeof COMPOSITIONS[number]) ? composition as typeof COMPOSITIONS[number] : 'center',
      crop: CROPS.includes(crop as typeof CROPS[number]) ? crop as typeof CROPS[number] : 'wide',
    },
  };
}

export function journeySearch(state: JourneyState): string {
  const params = new URLSearchParams();
  if (state.planetName) params.set('planet', state.planetName);
  if (state.planetName && state.view !== 'atlas') params.set('view', state.view);
  if (state.filter !== 'all') params.set('filter', state.filter);
  if (state.query) params.set('q', state.query);
  if (state.planetName && state.experience !== 'wonder') params.set('mode', state.experience);
  if (state.evidenceOpen && state.planetName && state.experience !== 'observatory') params.set('evidence', '1');
  if (state.view === 'planet') {
    params.set('az', state.camera.azimuth.toFixed(3));
    params.set('el', state.camera.elevation.toFixed(3));
  }
  if (state.planetName && state.experience === 'studio') {
    params.set('exp', state.studio.exposure.toFixed(2));
    params.set('comp', state.studio.composition);
    params.set('crop', state.studio.crop);
  }
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function updateBrowserUrl(state: JourneyState, mode: 'push' | 'replace' = 'replace'): void {
  const url = `${window.location.pathname}${journeySearch(state)}${window.location.hash}`;
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](state, '', url);
}
