import type { ExperienceName, FilterName, JourneyState, ShareTemplate, ViewName } from '../types';
import { DEFAULT_SOLAR_EPOCH, normalizeSolarEpoch } from './solarTime';
import { normalizeIssEpoch } from './iss';
import { normalizeMoonEpoch } from './moon';
import { normalizeGaiaYearOffset } from './gaia';

const VIEWS: ViewName[] = ['earth', 'solar', 'neighbourhood', 'atlas', 'system', 'planet', 'lookback'];
const FILTERS: FilterName[] = ['all', 'rocky', 'giants', 'temperate', 'transiting', 'nearby'];
const EXPERIENCES: ExperienceName[] = ['wonder', 'observatory'];
const SHARE_TEMPLATES: ShareTemplate[] = ['portrait', 'field-note', 'orbital-study'];

export const DEFAULT_JOURNEY: JourneyState = {
  view: 'earth',
  solarEpoch: DEFAULT_SOLAR_EPOCH,
  issEpoch: null,
  moonEpoch: null,
  gaiaYearOffset: 0,
  planetName: null,
  origin: 'neighbourhood',
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
  const requestedView = viewParam && VIEWS.includes(viewParam) ? viewParam : 'earth';
  const view: ViewName = planetName
    ? requestedView === 'planet' || requestedView === 'lookback' ? requestedView : 'system'
    : requestedView === 'system' || requestedView === 'planet' || requestedView === 'lookback' ? 'earth' : requestedView;
  const legacyEvidence = params.get('evidence') === '1';
  const legacyStudio = modeParam === 'studio';
  const experience: ExperienceName = modeParam === 'observatory' || legacyEvidence ? 'observatory' : 'wonder';
  const shareParam = params.get('share') as ShareTemplate | null;
  const requestedShare = shareParam && SHARE_TEMPLATES.includes(shareParam) ? shareParam : legacyStudio ? 'portrait' : null;
  const shareTemplate = planetName && (view === 'planet' || view === 'system') ? requestedShare : null;
  const issEpoch = view === 'earth' && params.has('iss') ? normalizeIssEpoch(params.get('iss')) : null;
  return {
    view,
    solarEpoch: view === 'solar' ? normalizeSolarEpoch(params.get('epoch')) : DEFAULT_SOLAR_EPOCH,
    issEpoch,
    moonEpoch: view === 'earth' && issEpoch === null && params.has('moon') ? normalizeMoonEpoch(params.get('moon')) : null,
    gaiaYearOffset: view === 'neighbourhood' ? normalizeGaiaYearOffset(params.get('gaiaTime')) : 0,
    planetName: planetName && (view === 'system' || view === 'planet' || view === 'lookback') ? planetName : null,
    origin: params.get('from') === 'atlas' ? 'atlas' : 'neighbourhood',
    filter: filterParam && FILTERS.includes(filterParam) ? filterParam : 'all',
    query: params.get('q')?.slice(0, 120) ?? '',
    experience: planetName ? experience : 'wonder',
    evidenceOpen: Boolean(view === 'planet' && !shareTemplate && (legacyEvidence || experience === 'observatory')),
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
  if (state.view !== 'earth') params.set('view', state.view);
  if (state.view === 'solar' && state.solarEpoch !== DEFAULT_SOLAR_EPOCH) params.set('epoch', normalizeSolarEpoch(state.solarEpoch));
  if (state.view === 'earth' && state.issEpoch !== null) params.set('iss', normalizeIssEpoch(state.issEpoch));
  if (state.view === 'earth' && state.issEpoch === null && state.moonEpoch !== null) params.set('moon', normalizeMoonEpoch(state.moonEpoch));
  if (state.view === 'neighbourhood' && state.gaiaYearOffset !== 0) params.set('gaiaTime', String(normalizeGaiaYearOffset(String(state.gaiaYearOffset))));
  if (state.planetName && state.origin === 'atlas') params.set('from', 'atlas');
  if (state.filter !== 'all') params.set('filter', state.filter);
  if (state.query) params.set('q', state.query);
  if (state.planetName && state.experience !== 'wonder' && EXPERIENCES.includes(state.experience)) params.set('mode', state.experience);
  if (state.evidenceOpen && !state.shareTemplate && state.view === 'planet' && state.experience !== 'observatory') params.set('evidence', '1');
  if (state.view === 'planet') {
    params.set('az', state.camera.azimuth.toFixed(3));
    params.set('el', state.camera.elevation.toFixed(3));
  }
  if (state.planetName && (state.view === 'planet' || state.view === 'system') && state.shareTemplate && SHARE_TEMPLATES.includes(state.shareTemplate)) params.set('share', state.shareTemplate);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function updateBrowserUrl(state: JourneyState, mode: 'push' | 'replace' = 'replace'): void {
  const url = `${window.location.pathname}${journeySearch(state)}${window.location.hash}`;
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](state, '', url);
}
