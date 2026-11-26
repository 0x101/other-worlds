import { mkdir, writeFile } from 'node:fs/promises';

export const SOURCE_URL = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';
export const FIELDS = [
  'pl_name', 'hostname', 'sy_pnum', 'sy_snum', 'cb_flag',
  'pl_rade', 'pl_bmasse', 'pl_bmassprov', 'pl_dens',
  'pl_orbper', 'pl_orbsmax', 'pl_orbeccen', 'pl_eqt', 'pl_insol',
  'st_teff', 'st_rad', 'st_mass', 'st_spectype', 'st_lum',
  'disc_year', 'discoverymethod', 'disc_facility', 'disc_refname',
  'ra', 'dec', 'sy_dist', 'pl_controv_flag',
  'tran_flag', 'rv_flag', 'ttv_flag', 'pul_flag', 'ptv_flag',
  'ast_flag', 'obm_flag', 'micro_flag', 'etv_flag', 'ima_flag', 'dkin_flag',
];
export const QUERY = `select ${FIELDS.join(',')} from pscomppars`;

const url = new URL(SOURCE_URL);
url.searchParams.set('query', QUERY);
url.searchParams.set('format', 'json');

const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
if (!response.ok) throw new Error(`NASA TAP returned ${response.status}: ${await response.text()}`);
const rows = await response.json();
if (!Array.isArray(rows) || rows.length < 1000) throw new Error('Unexpectedly small catalogue; refusing to save.');
if (new Set(rows.map((row) => row.pl_name)).size !== rows.length) throw new Error('Duplicate planet identifiers in snapshot.');

const missing = Object.fromEntries(FIELDS.map((field) => [field, rows.filter((row) => row[field] === null || row[field] === '').length]));
const metadata = {
  title: 'NASA Exoplanet Archive — Planetary Systems Composite Parameters (pscomppars)',
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
  missingValuePolicy: 'NASA null values remain null in the raw snapshot and are displayed as Unknown. No missing measurement is replaced with an estimate.',
  compositeCaveat: 'pscomppars provides one row per planet and combines comparatively complete values that may come from different references. It is not necessarily a self-consistent or homogeneous published solution for each row.',
  attribution: 'Data courtesy of the NASA Exoplanet Archive, operated by the California Institute of Technology under contract with NASA.',
  documentation: [
    'https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html',
    'https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html',
  ],
};

await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/data/pscomppars.json', import.meta.url), `${JSON.stringify(rows)}\n`);
await writeFile(new URL('../public/data/provenance.json', import.meta.url), `${JSON.stringify(metadata, null, 2)}\n`);
await writeFile(new URL('../data-query.sql', import.meta.url), `${QUERY};\n`);
console.log(JSON.stringify({ rows: metadata.rowCount, systems: metadata.uniqueSystemCount, fetchedAt: metadata.fetchedAt }, null, 2));
