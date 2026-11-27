// The pinned root entry also exports optional WASM workers whose IIFE/top-level-await shape Vite cannot bundle.
// Use the same package's pure-TypeScript ESM calculation modules; no propagation code is reimplemented here.
import { json2satrec } from '../../node_modules/satellite.js/dist/io.js';
import { propagate } from '../../node_modules/satellite.js/dist/propagation/propagate.js';
import type { OMMJsonObject } from '../../node_modules/satellite.js/dist/common-types.js';
import manifest from '../data/iss-expedition.json';

const MINUTE_MS = 60_000;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export interface IssManifest {
  schema: string;
  status: 'DERIVED';
  snapshotStatus: 'HISTORICAL';
  object: { name: string; internationalDesignator: string; noradCatalogueId: string };
  source: {
    publisher: string;
    requestUrl: string;
    documentationUrl: string;
    format: string;
    retrievedAt: string;
    retrievalTimestampBasis: string;
    rawPath: string;
    rawSha256: string;
    sourceEpoch: string;
    timeSystem: 'UTC';
    referenceFrame: 'TEME';
    meanElementTheory: 'SGP4';
    semanticsNote: string;
  };
  propagator: { name: string; version: string; license: string; url: string };
  elements: OMMJsonObject;
  position: { units: 'km'; frame: 'TEME'; origin: string; lightTimeCorrection: false; uncertainty: null };
  selection: { defaultEpoch: string; minEpoch: string; maxEpoch: string; stepMinutes: number; quantization: string; boundNote: string };
  referencePropagation: { epoch: string; temeKm: [number, number, number]; geocentricDistanceKm: number };
  display: { direction: string; mapping: string; radialScale: string; earthTextureRegistration: string };
  staleness: { historical: true; ageAtRetrievalSeconds: number; liveRefresh: false; note: string };
  trace: { halfSpanMinutes: number; sampleStepMinutes: number; note: string };
}

export interface IssState {
  epoch: string;
  status: 'DERIVED';
  temeKm: [number, number, number];
  geocentricDistanceKm: number;
  offsetMinutes: number;
  displayPosition: { x: number; y: number; z: number };
}

export const ISS_EXPEDITION = manifest as IssManifest;
export const DEFAULT_ISS_EPOCH = ISS_EXPEDITION.selection.defaultEpoch;
export const ISS_MIN_EPOCH = ISS_EXPEDITION.selection.minEpoch;
export const ISS_MAX_EPOCH = ISS_EXPEDITION.selection.maxEpoch;
export const ISS_STEP_MINUTES = ISS_EXPEDITION.selection.stepMinutes;
export const ISS_DISPLAY_RADIUS = 2.65;

const MIN_MS = Date.parse(ISS_MIN_EPOCH);
const MAX_MS = Date.parse(ISS_MAX_EPOCH);
const SOURCE_MS = Date.parse(ISS_EXPEDITION.source.sourceEpoch);
const satrec = json2satrec(ISS_EXPEDITION.elements);

/** Strict selected-time input: no visitor-clock fallback and no out-of-window propagation. */
export function issEpochMs(epoch: string): number {
  if (!ISO_UTC.test(epoch)) throw new Error('ISS epoch must be an ISO UTC timestamp with milliseconds.');
  const value = Date.parse(epoch);
  if (!Number.isFinite(value) || new Date(value).toISOString() !== epoch) throw new Error('ISS epoch is not a real UTC instant.');
  if (value < MIN_MS || value > MAX_MS) throw new Error('ISS epoch is outside the declared ±12 h interaction window.');
  return value;
}

export function normalizeIssEpoch(value: string | null | undefined): string {
  if (!value) return DEFAULT_ISS_EPOCH;
  try {
    return new Date(issEpochMs(value)).toISOString();
  } catch {
    return DEFAULT_ISS_EPOCH;
  }
}

export function shiftIssEpoch(epoch: string, minutes = ISS_STEP_MINUTES): string {
  if (!Number.isFinite(minutes)) throw new Error('ISS epoch shift must be finite.');
  const shifted = issEpochMs(epoch) + Math.round(minutes * MINUTE_MS);
  return new Date(Math.max(MIN_MS, Math.min(MAX_MS, shifted))).toISOString();
}

export function issDisplayPosition(temeKm: readonly [number, number, number]) {
  const length = Math.hypot(...temeKm);
  if (!Number.isFinite(length) || length <= 0) throw new Error('ISS TEME position must be finite and nonzero.');
  const scale = ISS_DISPLAY_RADIUS / length;
  return { x: temeKm[0] * scale, y: temeKm[2] * scale, z: -temeKm[1] * scale };
}

/** SGP4 output is Earth-centred TEME kilometres; radial display separation is separately compressed. */
export function issStateAt(epoch = DEFAULT_ISS_EPOCH): IssState {
  const selectedMs = issEpochMs(epoch);
  const result = propagate(satrec, new Date(selectedMs));
  if (!result || ![result.position.x, result.position.y, result.position.z].every(Number.isFinite)) {
    throw new Error(`SGP4 could not propagate ISS at ${epoch}.`);
  }
  const temeKm: [number, number, number] = [result.position.x, result.position.y, result.position.z];
  return {
    epoch,
    status: 'DERIVED',
    temeKm,
    geocentricDistanceKm: Math.hypot(...temeKm),
    offsetMinutes: (selectedMs - SOURCE_MS) / MINUTE_MS,
    displayPosition: issDisplayPosition(temeKm),
  };
}

/** A bounded local trace; at selection limits its centre shifts rather than propagating out of contract. */
export function issTraceAt(epoch = DEFAULT_ISS_EPOCH) {
  const selectedMs = issEpochMs(epoch);
  const halfSpanMs = ISS_EXPEDITION.trace.halfSpanMinutes * MINUTE_MS;
  const centerMs = Math.max(MIN_MS + halfSpanMs, Math.min(MAX_MS - halfSpanMs, selectedMs));
  const count = Math.floor(ISS_EXPEDITION.trace.halfSpanMinutes / ISS_EXPEDITION.trace.sampleStepMinutes) * 2 + 1;
  return Array.from({ length: count }, (_, index) => {
    const sampleEpoch = new Date(centerMs + (index - (count - 1) / 2) * ISS_EXPEDITION.trace.sampleStepMinutes * MINUTE_MS).toISOString();
    return issStateAt(sampleEpoch).displayPosition;
  });
}

export function formatIssEpoch(epoch: string): string {
  const date = new Date(issEpochMs(epoch));
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const milliseconds = date.getUTCMilliseconds();
  const preciseTime = date.getUTCSeconds() || milliseconds ? `:${seconds}${milliseconds ? `.${String(milliseconds).padStart(3, '0')}` : ''}` : '';
  return `${day} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} · ${hours}:${minutes}${preciseTime} UTC`;
}

export function formatIssOffset(offsetMinutes: number): string {
  if (Math.abs(offsetMinutes) < 0.0005) return 'At OMM source epoch';
  const absolute = Math.abs(offsetMinutes);
  const value = absolute >= 60 ? `${(absolute / 60).toFixed(1)} h` : `${absolute.toFixed(1)} min`;
  return `${offsetMinutes > 0 ? '+' : '−'}${value} from OMM epoch`;
}

export function issSourceAgeLabel(): string {
  const minutes = Math.round(ISS_EXPEDITION.staleness.ageAtRetrievalSeconds / 60);
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min old when preserved`;
}
