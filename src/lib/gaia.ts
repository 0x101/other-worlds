import snapshot from '../data/gaia-neighbourhood.json';

export interface GaiaStar {
  source_id: string;
  ra: number;
  dec: number;
  ref_epoch: number;
  parallax: number;
  parallax_error: number;
  parallax_over_error: number;
  pmra: number;
  pmra_error: number;
  pmdec: number;
  pmdec_error: number;
  phot_g_mean_mag: number;
  bp_rp: number;
  ruwe: number;
  astrometric_params_solved: number;
  visibility_periods_used: number;
  ipd_frac_multi_peak: number;
  astrometric_sigma5d_max: number;
  r_med_geo: number;
  r_lo_geo: number;
  r_hi_geo: number;
}

export interface GaiaNeighbourhood {
  schema: string;
  title: string;
  rowCount: number;
  retrievedAt: string;
  rawSha256: string;
  referenceEpoch: { value: number; label: string; timeScale: string };
  motionModel: {
    status: 'DERIVED';
    method: string;
    minYearOffset: number;
    maxYearOffset: number;
    stepYears: number;
    offsetUnit: string;
    timeScale: string;
    radialVelocityPolicy: string;
    uncertaintyPolicy: string;
    distancePolicy: string;
  };
  frame: string;
  origin: string;
  units: Record<string, string>;
  source: {
    catalogue: string;
    catalogueDocumentation: string;
    astrometryDocumentation: string;
    archivePartner: string;
    endpoint: string;
    distanceTable: string;
    distanceMethod: string;
    distanceReference: string;
    attribution: string;
  };
  selection: {
    limit: number;
    minimumParallaxMas: number;
    minimumParallaxOverError: number;
    maximumRuwe: number;
    minimumVisibilityPeriods: number;
    astrometricParamsSolved: number;
    maximumGMeanMagnitude: number;
    ordering: string;
    completeness: string;
  };
  query: string;
  transformations: string[];
  stars: GaiaStar[];
}

const NUMBER_FIELDS = [
  'ra', 'dec', 'ref_epoch', 'parallax', 'parallax_error', 'parallax_over_error',
  'pmra', 'pmra_error', 'pmdec', 'pmdec_error', 'phot_g_mean_mag', 'bp_rp',
  'ruwe', 'astrometric_params_solved', 'visibility_periods_used',
  'ipd_frac_multi_peak', 'astrometric_sigma5d_max', 'r_med_geo', 'r_lo_geo', 'r_hi_geo',
] as const;

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function parseStar(candidate: unknown, index: number): GaiaStar {
  requireCondition(candidate && typeof candidate === 'object', `Invalid Gaia row ${index}.`);
  const raw = candidate as Record<string, unknown>;
  requireCondition(typeof raw.source_id === 'string' && /^\d{1,20}$/.test(raw.source_id) && BigInt(raw.source_id).toString() === raw.source_id, `Gaia row ${index} has an invalid string source ID.`);
  const star = { source_id: raw.source_id } as GaiaStar;
  for (const field of NUMBER_FIELDS) {
    const value = raw[field];
    requireCondition(typeof value === 'number' && Number.isFinite(value), `${star.source_id}: invalid ${field}.`);
    star[field] = value;
  }
  requireCondition(star.ref_epoch === 2016, `${star.source_id}: expected J2016.0.`);
  requireCondition(star.ra >= 0 && star.ra < 360 && star.dec >= -90 && star.dec <= 90, `${star.source_id}: invalid direction.`);
  requireCondition(star.parallax >= 50 && star.parallax_error > 0 && star.parallax_over_error >= 20, `${star.source_id}: parallax quality gate failed.`);
  requireCondition(star.ruwe <= 1.4 && star.visibility_periods_used >= 10 && star.astrometric_params_solved === 31, `${star.source_id}: astrometric quality gate failed.`);
  requireCondition(star.phot_g_mean_mag <= 12, `${star.source_id}: brightness gate failed.`);
  requireCondition(star.r_lo_geo > 0 && star.r_lo_geo <= star.r_med_geo && star.r_med_geo <= star.r_hi_geo, `${star.source_id}: invalid geometric distance interval.`);
  return star;
}

export function parseGaiaNeighbourhood(input: unknown): GaiaNeighbourhood {
  requireCondition(input && typeof input === 'object', 'Gaia snapshot is not an object.');
  const raw = input as Record<string, unknown>;
  requireCondition(raw.schema === 'other-worlds/gaia-dr3-neighbourhood-v1', 'Unexpected Gaia schema.');
  requireCondition(Array.isArray(raw.stars), 'Gaia snapshot has no stars array.');
  const stars = raw.stars.map(parseStar);
  requireCondition(raw.rowCount === stars.length && stars.length > 0 && stars.length <= 384, 'Gaia row count exceeds its bounded manifest.');
  requireCondition(new Set(stars.map((star) => star.source_id)).size === stars.length, 'Duplicate Gaia source identifiers.');
  for (const field of ['title', 'retrievedAt', 'rawSha256', 'frame', 'origin', 'query']) requireCondition(typeof raw[field] === 'string' && raw[field], `Missing Gaia metadata: ${field}.`);
  for (const field of ['referenceEpoch', 'source', 'selection', 'motionModel']) requireCondition(raw[field] && typeof raw[field] === 'object', `Missing Gaia metadata: ${field}.`);
  requireCondition(raw.units && typeof raw.units === 'object' && Array.isArray(raw.transformations), 'Missing Gaia units or transformations.');
  const epoch = raw.referenceEpoch as Record<string, unknown>;
  requireCondition(epoch.value === 2016 && epoch.label === 'J2016.0' && epoch.timeScale === 'TCB', 'Gaia epoch semantics changed unexpectedly.');
  const motion = raw.motionModel as Record<string, unknown>;
  requireCondition(motion.status === 'DERIVED' && motion.timeScale === 'TCB' && motion.offsetUnit === 'Julian year', 'Gaia motion derivation or time-scale semantics changed.');
  requireCondition(motion.minYearOffset === -10000 && motion.maxYearOffset === 10000 && motion.stepYears === 1000, 'Gaia selected-time bounds changed unexpectedly.');
  for (const field of ['method', 'radialVelocityPolicy', 'uncertaintyPolicy', 'distancePolicy']) requireCondition(typeof motion[field] === 'string' && motion[field], `Missing Gaia motion policy: ${field}.`);
  return { ...raw, stars } as unknown as GaiaNeighbourhood;
}

export const GAIA_NEIGHBOURHOOD = parseGaiaNeighbourhood(snapshot);
export const GAIA_BY_ID = new Map(GAIA_NEIGHBOURHOOD.stars.map((star) => [star.source_id, star]));
export const GAIA_MIN_YEAR_OFFSET = -10000;
export const GAIA_MAX_YEAR_OFFSET = 10000;
export const GAIA_YEAR_STEP = 1000;
const MAS_TO_RAD = Math.PI / (180 * 3600 * 1000);

export function normalizeGaiaYearOffset(value: string | null): number {
  if (value === null || !/^-?(?:0|[1-9]\d*)$/.test(value)) return 0;
  const offset = Number(value);
  return Number.isSafeInteger(offset) && offset >= GAIA_MIN_YEAR_OFFSET && offset <= GAIA_MAX_YEAR_OFFSET ? offset : 0;
}

function requireYearOffset(offset: number): void {
  requireCondition(Number.isSafeInteger(offset) && offset >= GAIA_MIN_YEAR_OFFSET && offset <= GAIA_MAX_YEAR_OFFSET, 'Gaia time offset must be an integer inside the declared Julian-year bounds.');
}

export function shiftGaiaYearOffset(offset: number, deltaYears = GAIA_YEAR_STEP): number {
  requireYearOffset(offset);
  requireCondition(Number.isSafeInteger(deltaYears), 'Gaia time step must be an integer number of Julian years.');
  return Math.max(GAIA_MIN_YEAR_OFFSET, Math.min(GAIA_MAX_YEAR_OFFSET, offset + deltaYears));
}

export function formatGaiaTime(offset: number): string {
  requireYearOffset(offset);
  if (offset === 0) return 'J2016.0 · reference epoch · TCB';
  return `J2016.0 ${offset > 0 ? '+' : '−'} ${Math.abs(offset).toLocaleString('en-US')} Julian years · TCB`;
}

export function gaiaDisplayRadius(distancePc: number): number {
  requireCondition(Number.isFinite(distancePc) && distancePc > 0, 'Gaia display distance must be positive and finite.');
  return 5 + Math.log10(distancePc + 1) * 13;
}

function directionDisplayPosition(ra: number, dec: number, radius: number) {
  return {
    x: radius * Math.cos(dec) * Math.cos(ra),
    y: radius * Math.sin(dec),
    z: radius * Math.cos(dec) * Math.sin(ra),
  };
}

/**
 * Derived constant-Cartesian transverse motion. Gaia pmra is μα* = μα cos(δ),
 * so it multiplies the unit east vector directly; no second cos(δ) is applied.
 * Radial velocity is an explicit zero-valued model assumption, not a measurement.
 */
export function gaiaStateAt(star: GaiaStar, yearOffset: number) {
  requireYearOffset(yearOffset);
  const ra = star.ra * Math.PI / 180;
  const dec = star.dec * Math.PI / 180;
  const sinRa = Math.sin(ra);
  const cosRa = Math.cos(ra);
  const sinDec = Math.sin(dec);
  const cosDec = Math.cos(dec);
  const distance = star.r_med_geo;
  const transverseRa = distance * star.pmra * MAS_TO_RAD * yearOffset;
  const transverseDec = distance * star.pmdec * MAS_TO_RAD * yearOffset;
  const positionPc = {
    x: distance * cosDec * cosRa - transverseRa * sinRa - transverseDec * sinDec * cosRa,
    y: distance * sinDec + transverseDec * cosDec,
    z: distance * cosDec * sinRa + transverseRa * cosRa - transverseDec * sinDec * sinRa,
  };
  const distancePc = Math.hypot(positionPc.x, positionPc.y, positionPc.z);
  requireCondition(distancePc > 0 && Number.isFinite(distancePc), `${star.source_id}: non-finite derived position.`);
  const propagatedRa = Math.atan2(positionPc.z, positionPc.x);
  const propagatedDec = Math.asin(Math.max(-1, Math.min(1, positionPc.y / distancePc)));
  return {
    sourceId: star.source_id,
    yearOffset,
    ra: (propagatedRa * 180 / Math.PI + 360) % 360,
    dec: propagatedDec * 180 / Math.PI,
    positionPc,
    distancePc,
    // The display radius remains the published J2016.0 median; only direction moves.
    displayPosition: directionDisplayPosition(propagatedRa, propagatedDec, gaiaDisplayRadius(distance)),
  };
}

export function gaiaDisplayPosition(star: GaiaStar, yearOffset = 0) {
  return gaiaStateAt(star, yearOffset).displayPosition;
}

const COLOUR_RAMP = [
  [-0.4, '#91b7ff'], [0.4, '#b8d0ff'], [0.9, '#e3e9f2'],
  [1.5, '#fff0d4'], [2.2, '#ffd09a'], [3.2, '#f4a070'], [4.5, '#dc7957'],
] as const;

export function gaiaDisplayColour(bpRp: number): string {
  requireCondition(Number.isFinite(bpRp), 'Gaia BP-RP colour must be finite.');
  if (bpRp <= COLOUR_RAMP[0][0]) return COLOUR_RAMP[0][1];
  for (let index = 1; index < COLOUR_RAMP.length; index += 1) {
    const [rightStop, right] = COLOUR_RAMP[index];
    const [leftStop, left] = COLOUR_RAMP[index - 1];
    if (bpRp > rightStop) continue;
    const amount = (bpRp - leftStop) / (rightStop - leftStop);
    const channel = (offset: number) => Math.round(Number.parseInt(left.slice(offset, offset + 2), 16) * (1 - amount) + Number.parseInt(right.slice(offset, offset + 2), 16) * amount);
    return `#${[1, 3, 5].map((offset) => channel(offset).toString(16).padStart(2, '0')).join('')}`;
  }
  return COLOUR_RAMP[COLOUR_RAMP.length - 1][1];
}
