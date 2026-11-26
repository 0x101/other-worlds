import type { Catalogue, SourceMeasurement, SourceReference, TraceabilityCatalogue, TraceabilityRow, TraceableField } from '../types';

export const TRACEABLE_FIELDS = [
  'pl_rade', 'pl_bmasse', 'pl_dens', 'pl_orbper', 'pl_orbsmax', 'pl_orbeccen',
  'pl_eqt', 'pl_insol', 'st_teff', 'st_rad', 'st_mass', 'st_lum', 'sy_dist',
] as const;

const LIMIT_FIELDS: Partial<Record<TraceableField, string>> = {
  pl_rade: 'pl_radelim', pl_bmasse: 'pl_bmasselim', pl_dens: 'pl_denslim',
  pl_orbper: 'pl_orbperlim', pl_orbsmax: 'pl_orbsmaxlim', pl_orbeccen: 'pl_orbeccenlim',
  pl_eqt: 'pl_eqtlim', pl_insol: 'pl_insollim', st_teff: 'st_tefflim',
  st_rad: 'st_radlim', st_mass: 'st_masslim', st_lum: 'st_lumlim',
};
const REFERENCE_FIELDS: Partial<Record<TraceableField, string>> = {
  pl_rade: 'pl_rade_reflink', pl_bmasse: 'pl_bmasse_reflink', pl_orbper: 'pl_orbper_reflink',
  pl_orbsmax: 'pl_orbsmax_reflink', pl_eqt: 'pl_eqt_reflink', pl_insol: 'pl_insol_reflink',
  st_teff: 'st_teff_reflink', st_rad: 'st_rad_reflink', st_mass: 'st_mass_reflink',
  st_lum: 'st_lum_reflink', sy_dist: 'sy_dist_reflink',
};
const DISCOVERY_FIELDS = ['disc_refname', 'disc_telescope', 'disc_instrument', 'disc_locale'] as const;

function nullableNumber(value: unknown, field: string, index: number): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Traceability row ${index} has an invalid ${field} value.`);
  return value;
}

function nullableString(value: unknown, field: string, index: number): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error(`Traceability row ${index} has an invalid ${field} value.`);
  return value;
}

export function parseReference(raw: string | null): SourceReference | null {
  if (!raw) return null;
  const href = raw.match(/href=(?:["']([^"']+)["']|([^\s>]+))/i);
  const target = href?.[1] ?? href?.[2] ?? null;
  let url: string | null = null;
  if (target) {
    try {
      const parsed = new URL(target);
      if (parsed.protocol === 'https:') url = parsed.toString();
    } catch { /* retain the citation label without a link */ }
  }
  const label = raw.replace(/<[^>]*>/g, '').trim() || 'Source publication';
  return { label, url, raw };
}

function unpackRows(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (!input || typeof input !== 'object') throw new Error('Traceability response is neither raw rows nor a normalized snapshot.');
  const snapshot = input as { schema?: unknown; fields?: unknown; references?: unknown; rows?: unknown };
  if (snapshot.schema !== 'other-worlds/pscomppars-traceability-v1' || !Array.isArray(snapshot.fields) || !snapshot.fields.every((field) => typeof field === 'string') || !Array.isArray(snapshot.references) || !snapshot.references.every((reference) => typeof reference === 'string') || !Array.isArray(snapshot.rows)) {
    throw new Error('Traceability snapshot schema is invalid.');
  }
  const fields = snapshot.fields as string[];
  const references = snapshot.references as string[];
  return snapshot.rows.map((row) => {
    if (!Array.isArray(row) || row.length !== fields.length) throw new Error('Traceability row width does not match its schema.');
    return Object.fromEntries(fields.map((field, index) => {
      const value = row[index];
      const isReference = field.endsWith('_reflink') || field === 'disc_refname';
      if (isReference && typeof value === 'number') {
        if (!Number.isInteger(value) || !references[value]) throw new Error(`Traceability reference index is invalid for ${field}.`);
        return [field, references[value]];
      }
      return [field, value];
    }));
  });
}

export function parseTraceability(input: unknown): TraceabilityCatalogue {
  const inputRows = unpackRows(input);
  if (!inputRows.length) throw new Error('Traceability companion is empty.');
  const rows = inputRows.map((candidate, index): TraceabilityRow => {
    if (!candidate || typeof candidate !== 'object') throw new Error(`Invalid traceability row ${index}.`);
    const source = candidate as Record<string, unknown>;
    if (typeof source.pl_name !== 'string' || !source.pl_name || typeof source.hostname !== 'string' || !source.hostname) {
      throw new Error(`Traceability row ${index} has no planet or host identifier.`);
    }
    const raw: TraceabilityRow['raw'] = { pl_name: source.pl_name, hostname: source.hostname };
    const measurements = {} as Record<TraceableField, SourceMeasurement>;
    for (const field of TRACEABLE_FIELDS) {
      const limitField = LIMIT_FIELDS[field];
      const referenceField = REFERENCE_FIELDS[field];
      raw[field] = nullableNumber(source[field], field, index);
      raw[`${field}err1`] = nullableNumber(source[`${field}err1`], `${field}err1`, index);
      raw[`${field}err2`] = nullableNumber(source[`${field}err2`], `${field}err2`, index);
      if (limitField) raw[limitField] = nullableNumber(source[limitField], limitField, index);
      const referenceRaw = referenceField ? nullableString(source[referenceField], referenceField, index) : null;
      if (referenceField) raw[referenceField] = referenceRaw;
      measurements[field] = {
        value: raw[field] as number | null,
        positiveError: raw[`${field}err1`] as number | null,
        negativeError: raw[`${field}err2`] as number | null,
        limit: limitField ? raw[limitField] as number | null : null,
        reference: parseReference(referenceRaw),
      };
    }
    for (const field of DISCOVERY_FIELDS) raw[field] = nullableString(source[field], field, index);
    return {
      pl_name: source.pl_name,
      hostname: source.hostname,
      measurements,
      discoveryReference: parseReference(raw.disc_refname as string | null),
      telescope: raw.disc_telescope as string | null,
      instrument: raw.disc_instrument as string | null,
      locale: raw.disc_locale as string | null,
      raw,
    };
  });
  const byName = new Map<string, TraceabilityRow>();
  for (const row of rows) {
    if (byName.has(row.pl_name)) throw new Error(`Duplicate traceability identifier: ${row.pl_name}.`);
    byName.set(row.pl_name, row);
  }
  return { rows, byName };
}

export function validateTraceability(catalogue: Catalogue, traceability: TraceabilityCatalogue): void {
  if (catalogue.planets.length !== traceability.rows.length) {
    throw new Error(`Traceability integrity mismatch: ${traceability.rows.length} companion rows for ${catalogue.planets.length} catalogue rows.`);
  }
  for (const planet of catalogue.planets) {
    const trace = traceability.byName.get(planet.pl_name);
    if (!trace || trace.hostname !== planet.hostname) throw new Error(`Traceability identity mismatch for ${planet.pl_name}.`);
    for (const field of TRACEABLE_FIELDS) {
      if (planet[field] !== trace.measurements[field].value) throw new Error(`Traceability value mismatch for ${planet.pl_name}: ${field}.`);
    }
  }
}

export function formatSourceNumber(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && magnitude < 0.0001) return value.toExponential(3).replace('e-', ' × 10⁻');
  return value.toLocaleString('en-US', { maximumSignificantDigits: 8 });
}

export function formatMeasurement(measurement: SourceMeasurement | undefined, unit = '', fallback = 'Unknown'): string {
  if (!measurement || measurement.value === null) return fallback;
  const value = formatSourceNumber(measurement.value);
  const uncertainty = measurement.positiveError !== null || measurement.negativeError !== null
    ? ` (${measurement.positiveError !== null ? `+${formatSourceNumber(measurement.positiveError)}` : '+ unknown'} / ${measurement.negativeError !== null ? formatSourceNumber(measurement.negativeError) : '− unknown'})`
    : '';
  return `${value}${uncertainty}${unit ? ` ${unit}` : ''}`;
}
