import { mkdir, writeFile } from 'node:fs/promises';

export const SOURCE_URL = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';
export const MEASUREMENTS = [
  ['pl_rade', 'pl_radelim', 'pl_rade_reflink'],
  ['pl_bmasse', 'pl_bmasselim', 'pl_bmasse_reflink'],
  ['pl_dens', 'pl_denslim', null],
  ['pl_orbper', 'pl_orbperlim', 'pl_orbper_reflink'],
  ['pl_orbsmax', 'pl_orbsmaxlim', 'pl_orbsmax_reflink'],
  ['pl_orbeccen', 'pl_orbeccenlim', null],
  ['pl_eqt', 'pl_eqtlim', 'pl_eqt_reflink'],
  ['pl_insol', 'pl_insollim', 'pl_insol_reflink'],
  ['st_teff', 'st_tefflim', 'st_teff_reflink'],
  ['st_rad', 'st_radlim', 'st_rad_reflink'],
  ['st_mass', 'st_masslim', 'st_mass_reflink'],
  ['st_lum', 'st_lumlim', 'st_lum_reflink'],
  ['sy_dist', null, 'sy_dist_reflink'],
];
export const DISCOVERY_FIELDS = ['disc_refname', 'disc_telescope', 'disc_instrument', 'disc_locale'];
export const FIELDS = [
  'pl_name', 'hostname',
  ...MEASUREMENTS.flatMap(([field, limit, reference]) => [field, `${field}err1`, `${field}err2`, limit, reference].filter(Boolean)),
  ...DISCOVERY_FIELDS,
];
export const QUERY = `select ${FIELDS.join(',')} from pscomppars`;

const url = new URL(SOURCE_URL);
url.searchParams.set('query', QUERY);
url.searchParams.set('format', 'json');
const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
if (!response.ok) throw new Error(`NASA TAP returned ${response.status}: ${await response.text()}`);
const rows = await response.json();
if (!Array.isArray(rows) || rows.length < 1000) throw new Error('Unexpectedly small traceability companion; refusing to save.');
if (new Set(rows.map((row) => row.pl_name)).size !== rows.length) throw new Error('Duplicate planet identifiers in traceability companion.');

const missing = Object.fromEntries(FIELDS.map((field) => [field, rows.filter((row) => row[field] === null || row[field] === '').length]));
const metadata = {
  title: 'NASA Exoplanet Archive — pscomppars traceability companion',
  role: 'Companion to the preserved base snapshot. Adds source uncertainties, limit flags, publication links, and discovery instrument metadata without replacing the base file.',
  sourceUrl: SOURCE_URL,
  requestUrl: url.toString(),
  query: QUERY,
  format: 'json',
  fetchedAt: new Date().toISOString(),
  rowCount: rows.length,
  uniquePlanetCount: new Set(rows.map((row) => row.pl_name)).size,
  uniqueSystemCount: new Set(rows.map((row) => row.hostname)).size,
  fields: FIELDS,
  missing,
  missingValuePolicy: 'NASA null values remain null. Absent uncertainty, limit, or reference metadata is displayed as not supplied; it is never inferred.',
  compositeCaveat: 'The companion and base files both come from pscomppars. Per-parameter references may differ within a row, and the combined row is not necessarily a self-consistent published solution.',
  attribution: 'Data courtesy of the NASA Exoplanet Archive, operated by the California Institute of Technology under contract with NASA.',
  documentation: ['https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html'],
};

const referenceFields = new Set(FIELDS.filter((field) => field.endsWith('_reflink') || field === 'disc_refname'));
const references = [...new Set(rows.flatMap((row) => referenceFields.size ? FIELDS.filter((field) => referenceFields.has(field)).map((field) => row[field]).filter((value) => typeof value === 'string') : []))].sort();
const referenceIndexes = new Map(references.map((reference, index) => [reference, index]));
const normalized = {
  schema: 'other-worlds/pscomppars-traceability-v1',
  fields: FIELDS,
  references,
  rows: rows.map((row) => FIELDS.map((field) => referenceFields.has(field) && typeof row[field] === 'string' ? referenceIndexes.get(row[field]) : row[field] ?? null)),
};
metadata.normalized = {
  path: 'public/data/pscomppars-traceability.json',
  rawPath: 'data/raw/pscomppars-traceability.json',
  schema: normalized.schema,
  encoding: 'Columnar rows in fields order. Publication-reference fields contain zero-based indexes into references; null remains null.',
};

await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await mkdir(new URL('../data/raw/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/raw/pscomppars-traceability.json', import.meta.url), `${JSON.stringify(rows)}\n`);
await writeFile(new URL('../public/data/pscomppars-traceability.json', import.meta.url), `${JSON.stringify(normalized)}\n`);
await writeFile(new URL('../public/data/traceability-provenance.json', import.meta.url), `${JSON.stringify(metadata, null, 2)}\n`);
await writeFile(new URL('../traceability-query.sql', import.meta.url), `${QUERY};\n`);
console.log(JSON.stringify({ rows: metadata.rowCount, systems: metadata.uniqueSystemCount, references: references.length, fetchedAt: metadata.fetchedAt }, null, 2));
