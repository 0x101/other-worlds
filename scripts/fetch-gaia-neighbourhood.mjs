import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const SOURCE_URL = 'https://gaia.ari.uni-heidelberg.de/tap/sync';
export const FIELDS = [
  'gaia_source_id', 'ra', 'dec', 'ref_epoch', 'parallax', 'parallax_error',
  'parallax_over_error', 'pmra', 'pmra_error', 'pmdec', 'pmdec_error',
  'phot_g_mean_mag', 'bp_rp', 'ruwe', 'astrometric_params_solved',
  'visibility_periods_used', 'ipd_frac_multi_peak', 'astrometric_sigma5d_max',
  'r_med_geo', 'r_lo_geo', 'r_hi_geo',
];
export const NUMBER_FIELDS = FIELDS.filter((field) => field !== 'gaia_source_id');
export const QUERY = `SELECT TOP 384 g.source_id AS gaia_source_id, g.ra, g.dec, g.ref_epoch, g.parallax, g.parallax_error, g.parallax_over_error, g.pmra, g.pmra_error, g.pmdec, g.pmdec_error, g.phot_g_mean_mag, g.bp_rp, g.ruwe, g.astrometric_params_solved, g.visibility_periods_used, g.ipd_frac_multi_peak, g.astrometric_sigma5d_max, d.r_med_geo, d.r_lo_geo, d.r_hi_geo
FROM gaiadr3.gaia_source AS g
JOIN gaiaedr3_complements.distances AS d ON d.source_id = g.source_id
WHERE g.parallax >= 50.0
AND g.parallax_over_error >= 20.0
AND g.ruwe <= 1.4
AND g.visibility_periods_used >= 10
AND g.astrometric_params_solved = 31
AND g.phot_g_mean_mag <= 12.0
AND g.bp_rp IS NOT NULL
AND g.pmra IS NOT NULL
AND g.pmdec IS NOT NULL
AND d.r_med_geo > 0
AND d.r_lo_geo > 0
AND d.r_hi_geo >= d.r_med_geo
AND d.r_med_geo >= d.r_lo_geo
ORDER BY parallax DESC, gaia_source_id ASC`;

const assert = (condition, message) => { if (!condition) throw new Error(message); };

export function parseCsv(text) {
  const records = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"' && value === '') quoted = true;
    else if (character === ',') { row.push(value); value = ''; }
    else if (character === '\n') { row.push(value); records.push(row); row = []; value = ''; }
    else if (character !== '\r') value += character;
  }
  assert(!quoted, 'Unterminated quoted CSV value.');
  if (value || row.length) { row.push(value); records.push(row); }
  const [header, ...rows] = records;
  assert(header && header.join(',') === FIELDS.join(','), 'Unexpected Gaia CSV columns or order.');
  return rows.filter((cells) => cells.some((cell) => cell !== '')).map((cells) => {
    assert(cells.length === header.length, 'Gaia CSV row width mismatch.');
    return Object.fromEntries(header.map((field, index) => [field, cells[index]]));
  });
}

export function validateGaiaStars(stars) {
  assert(stars.length === 384, `Expected the bounded 384-source slice, received ${stars.length}.`);
  assert(new Set(stars.map((star) => star.source_id)).size === stars.length, 'Duplicate Gaia source identifiers.');
  for (const star of stars) {
    assert(/^\d{1,20}$/.test(star.source_id) && BigInt(star.source_id).toString() === star.source_id, `Invalid Gaia source ID: ${star.source_id}`);
    for (const field of NUMBER_FIELDS) assert(typeof star[field] === 'number' && Number.isFinite(star[field]), `${star.source_id}: invalid ${field}.`);
    assert(star.ref_epoch === 2016, `${star.source_id}: unexpected reference epoch.`);
    assert(star.ra >= 0 && star.ra < 360 && star.dec >= -90 && star.dec <= 90, `${star.source_id}: invalid ICRS direction.`);
    assert(star.parallax >= 50 && star.parallax_error > 0 && star.parallax_over_error >= 20, `${star.source_id}: parallax gate failed.`);
    const signalToNoise = star.parallax / star.parallax_error;
    assert(Math.abs(signalToNoise - star.parallax_over_error) <= Math.max(0.001, signalToNoise * 0.00001), `${star.source_id}: parallax S/N disagrees with source fields.`);
    assert(star.ruwe <= 1.4 && star.visibility_periods_used >= 10 && star.astrometric_params_solved === 31, `${star.source_id}: astrometric quality gate failed.`);
    assert(star.phot_g_mean_mag <= 12, `${star.source_id}: brightness gate failed.`);
    assert(star.r_lo_geo > 0 && star.r_lo_geo <= star.r_med_geo && star.r_med_geo <= star.r_hi_geo, `${star.source_id}: invalid geometric distance interval.`);
  }
  for (let index = 1; index < stars.length; index += 1) assert(stars[index].parallax <= stars[index - 1].parallax, 'Gaia slice lost parallax ordering.');
  return stars;
}

export function starsFromCsv(text) {
  const rows = parseCsv(text);
  const stars = rows.map((row) => {
    assert(/^\d{1,20}$/.test(row.gaia_source_id), 'Source IDs must remain exact decimal strings.');
    const star = { source_id: row.gaia_source_id };
    for (const field of NUMBER_FIELDS) {
      assert(row[field] !== '', `Missing ${field} for ${row.gaia_source_id}.`);
      star[field] = Number(row[field]);
    }
    return star;
  });
  return validateGaiaStars(stars);
}

export function buildSnapshot(text, retrievedAt) {
  const stars = starsFromCsv(text);
  return {
    schema: 'other-worlds/gaia-dr3-neighbourhood-v1',
    title: 'Gaia DR3 nearby, bright, quality-filtered neighbourhood',
    rowCount: stars.length,
    retrievedAt,
    rawSha256: createHash('sha256').update(text).digest('hex'),
    referenceEpoch: { value: 2016, label: 'J2016.0', timeScale: 'TCB' },
    motionModel: {
      status: 'DERIVED',
      method: 'Constant Cartesian transverse velocity from local tangent pmra (mu_alpha_star, already including cos(dec)) and pmdec, seeded at J2016.0 with r_med_geo; radial velocity is zero by explicit model assumption.',
      minYearOffset: -10000,
      maxYearOffset: 10000,
      stepYears: 1000,
      offsetUnit: 'Julian year',
      timeScale: 'TCB',
      radialVelocityPolicy: 'Radial velocity is not retained in this bounded slice. The zero-radial-velocity component is a disclosed approximation, never an observed or inferred zero.',
      uncertaintyPolicy: 'Source pmra_error and pmdec_error remain attached at J2016.0. No selected-time covariance or credible region is claimed because full astrometric covariances, distance uncertainty propagation, and radial-velocity uncertainty are not modeled.',
      distancePolicy: 'Published r_med_geo/r_lo_geo/r_hi_geo remain J2016.0 geometric posterior values. The display radius stays fixed at r_med_geo while only derived direction changes; no selected-time distance interval is invented.',
    },
    frame: 'ICRS-aligned Gaia-CRF3; J2016.0 reference directions with optional derived selected-time proper-motion propagation',
    origin: 'Sun; published geometric distances are heliocentric',
    units: {
      ra: 'degree', dec: 'degree', parallax: 'mas', parallax_error: 'mas',
      pmra: 'mas/year', pmra_error: 'mas/year', pmdec: 'mas/year', pmdec_error: 'mas/year',
      phot_g_mean_mag: 'mag', bp_rp: 'mag', astrometric_sigma5d_max: 'mas',
      r_med_geo: 'pc', r_lo_geo: 'pc', r_hi_geo: 'pc',
    },
    source: {
      catalogue: 'Gaia DR3 gaia_source; DR3 retains the EDR3 astrometry and source list',
      catalogueDocumentation: 'https://www.cosmos.esa.int/web/gaia/dr3',
      astrometryDocumentation: 'https://gea.esac.esa.int/archive/documentation/GDR3/Gaia_archive/chap_datamodel/sec_dm_main_source_catalogue/ssec_dm_gaia_source.html',
      archivePartner: 'ARI (Astronomisches Rechen-Institut, Heidelberg), Gaia Archive partner TAP mirror',
      endpoint: SOURCE_URL,
      distanceTable: 'gaiaedr3_complements.distances',
      distanceMethod: 'Bailer-Jones et al. (2021) geometric posterior median with 16th and 84th percentile bounds',
      distanceReference: 'https://doi.org/10.3847/1538-3881/abd806',
      attribution: 'Gaia data: European Space Agency mission Gaia, processed by DPAC. Distances: Bailer-Jones et al. (2021). Accessed through the ARI Gaia Archive partner.',
    },
    selection: {
      limit: 384,
      minimumParallaxMas: 50,
      minimumParallaxOverError: 20,
      maximumRuwe: 1.4,
      minimumVisibilityPeriods: 10,
      astrometricParamsSolved: 31,
      maximumGMeanMagnitude: 12,
      ordering: 'parallax descending, exact Gaia source ID ascending for ties',
      completeness: 'The largest-parallax 384 rows meeting these filters inside the 20 pc parallax gate. Brightness, quality, and row-limit selections prevent a complete-census interpretation.',
    },
    query: QUERY,
    transformations: [
      'Gaia source IDs remain decimal strings and are never converted to JavaScript numbers.',
      'Displayed distance is the published r_med_geo geometric posterior median, not 1000/parallax; r_lo_geo and r_hi_geo remain attached as the J2016.0 16th–84th percentile interval.',
      'Reference unit direction uses ICRS-aligned J2016.0 RA/Dec: x=cos(dec)cos(ra), y=sin(dec), z=cos(dec)sin(ra).',
      'Selected-time directions use r = r_med_geo*u + deltaTCBJulianYears*r_med_geo*(pmra*e_ra + pmdec*e_dec)*pi/(180*3600*1000), then normalize only for direction. pmra is mu_alpha_star and receives no additional cos(dec). Radial velocity is omitted by explicit approximation.',
      'Display radius is fixed at 5 + 13*log10(r_med_geo + 1) scene units for every selected time. This logarithmic transform is visual compression, not a physical coordinate or selected-time distance estimate.',
      'BP-RP colour drives the disclosed display colour ramp; G magnitude is retained for selection and inspection. Point glyphs are not resolved stellar images.',
      'The NASA host overlay remains at preserved archive directions and is not propagated or represented as a Gaia crossmatch.',
      'No parallax zero-point correction, live claim, full selected-time covariance, perspective acceleration, binary/orbital acceleration, or missing-distance fallback is applied.',
    ],
    stars,
  };
}

async function main() {
  const inputIndex = process.argv.indexOf('--input');
  const retrievedIndex = process.argv.indexOf('--retrieved-at');
  const input = inputIndex >= 0 ? process.argv[inputIndex + 1] : null;
  const suppliedRetrieval = retrievedIndex >= 0 ? process.argv[retrievedIndex + 1] : null;
  let text;
  let retrievedAt;
  if (input) {
    text = await readFile(path.resolve(input), 'utf8');
    retrievedAt = suppliedRetrieval;
    assert(retrievedAt && !Number.isNaN(Date.parse(retrievedAt)), '--input requires --retrieved-at with the original response time.');
  } else {
    const response = await fetch(SOURCE_URL, {
      method: 'POST',
      headers: { Accept: 'text/csv', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'csv', QUERY }),
      signal: AbortSignal.timeout(120_000),
    });
    text = await response.text();
    assert(response.ok && response.headers.get('content-type')?.startsWith('text/csv'), `Gaia partner TAP failed (${response.status}): ${text.slice(0, 500)}`);
    const responseDate = response.headers.get('date');
    retrievedAt = responseDate && !Number.isNaN(Date.parse(responseDate)) ? new Date(responseDate).toISOString() : new Date().toISOString();
  }
  const snapshot = buildSnapshot(text, retrievedAt);
  const root = new URL('../', import.meta.url);
  await mkdir(new URL('data/raw/', root), { recursive: true });
  await mkdir(new URL('src/data/', root), { recursive: true });
  await writeFile(new URL('data/raw/gaia-dr3-neighbourhood.csv', root), text);
  await writeFile(new URL('src/data/gaia-neighbourhood.json', root), `${JSON.stringify(snapshot, null, 2)}\n`);
  await writeFile(new URL('gaia-dr3-neighbourhood-query.sql', root), `${QUERY};\n`);
  console.log(JSON.stringify({ rows: snapshot.rowCount, retrievedAt, rawSha256: snapshot.rawSha256 }, null, 2));
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) await main();
