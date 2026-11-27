import { GeoMoon, KM_PER_AU, Rotation_EQJ_ECL, RotateVector } from 'astronomy-engine';
import manifest from '../data/moon-expedition.json';

const MINUTE_MS = 60_000;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export interface MoonManifest {
  schema: string;
  status: 'DERIVED';
  object: { name: 'Moon'; origin: 'Earth centre' };
  source: {
    name: string;
    version: string;
    license: string;
    url: string;
    documentationUrl: string;
    method: string;
    algorithm: string;
    generatedAt: string;
    generationTimestampBasis: string;
    timeSemantics: string;
  };
  position: { units: 'au'; frame: 'EQJ/J2000'; origin: 'Earth centre'; lightTimeCorrection: false; aberrationCorrection: false; uncertainty: null };
  selection: { defaultEpoch: string; minEpoch: string; maxEpoch: string; stepMinutes: number; quantization: string; boundNote: string };
  referenceDerivation: { epoch: string; eqjAu: [number, number, number]; eclipticAu: [number, number, number]; geocentricDistanceKm: number };
  display: { direction: string; mapping: string; radialScale: string; bodyMarker: string; earthTextureRegistration: string };
  trace: { halfSpanMinutes: number; sampleStepMinutes: number; note: string };
}

export interface MoonState {
  epoch: string;
  status: 'DERIVED';
  eqjAu: [number, number, number];
  eclipticAu: [number, number, number];
  geocentricDistanceKm: number;
  offsetMinutes: number;
  displayPosition: { x: number; y: number; z: number };
}

export const MOON_EXPEDITION = manifest as MoonManifest;
export const DEFAULT_MOON_EPOCH = MOON_EXPEDITION.selection.defaultEpoch;
export const MOON_MIN_EPOCH = MOON_EXPEDITION.selection.minEpoch;
export const MOON_MAX_EPOCH = MOON_EXPEDITION.selection.maxEpoch;
export const MOON_STEP_MINUTES = MOON_EXPEDITION.selection.stepMinutes;
export const MOON_DISPLAY_RADIUS = 3.45;

const MIN_MS = Date.parse(MOON_MIN_EPOCH);
const MAX_MS = Date.parse(MOON_MAX_EPOCH);
const REFERENCE_MS = Date.parse(DEFAULT_MOON_EPOCH);
const rotation = Rotation_EQJ_ECL();

/** Strict selected-time input: no visitor-clock fallback and no out-of-window derivation. */
export function moonEpochMs(epoch: string): number {
  if (!ISO_UTC.test(epoch)) throw new Error('Moon epoch must be an ISO UTC timestamp with milliseconds.');
  const value = Date.parse(epoch);
  if (!Number.isFinite(value) || new Date(value).toISOString() !== epoch) throw new Error('Moon epoch is not a real UTC instant.');
  if (value < MIN_MS || value > MAX_MS) throw new Error('Moon epoch is outside the declared ±24 h interaction window.');
  return value;
}

export function normalizeMoonEpoch(value: string | null | undefined): string {
  if (!value) return DEFAULT_MOON_EPOCH;
  try {
    return new Date(moonEpochMs(value)).toISOString();
  } catch {
    return DEFAULT_MOON_EPOCH;
  }
}

export function shiftMoonEpoch(epoch: string, minutes = MOON_STEP_MINUTES): string {
  if (!Number.isFinite(minutes)) throw new Error('Moon epoch shift must be finite.');
  const shifted = moonEpochMs(epoch) + Math.round(minutes * MINUTE_MS);
  return new Date(Math.max(MIN_MS, Math.min(MAX_MS, shifted))).toISOString();
}

/** Geometric geocentric EQJ/J2000 au is retained; only the separate ECL direction enters the display. */
export function moonStateAt(epoch = DEFAULT_MOON_EPOCH): MoonState {
  const selectedMs = moonEpochMs(epoch);
  const eqj = GeoMoon(new Date(selectedMs));
  const ecliptic = RotateVector(rotation, eqj);
  const eqjAu: [number, number, number] = [eqj.x, eqj.y, eqj.z];
  const eclipticAu: [number, number, number] = [ecliptic.x, ecliptic.y, ecliptic.z];
  const length = ecliptic.Length();
  if (!Number.isFinite(length) || length <= 0) throw new Error(`GeoMoon could not derive the Moon at ${epoch}.`);
  const scale = MOON_DISPLAY_RADIUS / length;
  return {
    epoch,
    status: 'DERIVED',
    eqjAu,
    eclipticAu,
    geocentricDistanceKm: eqj.Length() * KM_PER_AU,
    offsetMinutes: (selectedMs - REFERENCE_MS) / MINUTE_MS,
    displayPosition: { x: ecliptic.x * scale, y: ecliptic.z * scale, z: -ecliptic.y * scale },
  };
}

/** A bounded local trace; at selection limits its centre shifts rather than deriving outside the contract. */
export function moonTraceAt(epoch = DEFAULT_MOON_EPOCH) {
  const selectedMs = moonEpochMs(epoch);
  const halfSpanMs = MOON_EXPEDITION.trace.halfSpanMinutes * MINUTE_MS;
  const centerMs = Math.max(MIN_MS + halfSpanMs, Math.min(MAX_MS - halfSpanMs, selectedMs));
  const count = Math.floor(MOON_EXPEDITION.trace.halfSpanMinutes / MOON_EXPEDITION.trace.sampleStepMinutes) * 2 + 1;
  return Array.from({ length: count }, (_, index) => {
    const sampleEpoch = new Date(centerMs + (index - (count - 1) / 2) * MOON_EXPEDITION.trace.sampleStepMinutes * MINUTE_MS).toISOString();
    return moonStateAt(sampleEpoch).displayPosition;
  });
}

export function formatMoonEpoch(epoch: string): string {
  const date = new Date(moonEpochMs(epoch));
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const milliseconds = date.getUTCMilliseconds();
  const preciseTime = date.getUTCSeconds() || milliseconds ? `:${seconds}${milliseconds ? `.${String(milliseconds).padStart(3, '0')}` : ''}` : '';
  return `${day} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} · ${hours}:${minutes}${preciseTime} UTC`;
}

export function formatMoonOffset(offsetMinutes: number): string {
  if (Math.abs(offsetMinutes) < 0.0005) return 'At reference epoch';
  const absolute = Math.abs(offsetMinutes);
  const value = absolute >= 60 ? `${(absolute / 60).toFixed(1)} h` : `${absolute.toFixed(1)} min`;
  return `${offsetMinutes > 0 ? '+' : '−'}${value} from reference`;
}
