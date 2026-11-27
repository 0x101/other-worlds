import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { Body, GeoMoon, HelioVector, KM_PER_AU, Rotation_EQJ_ECL, RotateVector } from 'astronomy-engine';
import { json2satrec, propagate } from 'satellite.js';
import { buildSnapshot } from './fetch-gaia-neighbourhood.mjs';

const root = process.cwd();
const read = async (relative) => readFile(path.join(root, relative), 'utf8');
const json = async (relative) => JSON.parse(await read(relative));
const sha256 = (content) => createHash('sha256').update(content).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const fields = ['pl_rade', 'pl_bmasse', 'pl_dens', 'pl_orbper', 'pl_orbsmax', 'pl_orbeccen', 'pl_eqt', 'pl_insol', 'st_teff', 'st_rad', 'st_mass', 'st_lum', 'sy_dist'];
const referenceWorlds = ['TRAPPIST-1 e', 'HD 189733 b', 'K2-18 b', 'Kepler-16 b', 'KIC 10001893 b'];

const baseText = await read('public/data/pscomppars.json');
const base = JSON.parse(baseText);
const baseProvenance = await json('public/data/provenance.json');
const traceText = await read('data/raw/pscomppars-traceability.json');
const traceRaw = JSON.parse(traceText);
const normalizedText = await read('public/data/pscomppars-traceability.json');
const normalized = JSON.parse(normalizedText);
const traceProvenance = await json('public/data/traceability-provenance.json');
const gaiaText = await read('data/raw/gaia-dr3-neighbourhood.csv');
const gaia = await json('src/data/gaia-neighbourhood.json');
const expectedGaia = buildSnapshot(gaiaText, gaia.retrievedAt);
assert(JSON.stringify(gaia) === JSON.stringify(expectedGaia), 'Gaia runtime snapshot does not exactly match its raw CSV, query, and transformations.');
assert(gaia.rawSha256 === sha256(gaiaText), 'Gaia raw snapshot hash mismatch.');
assert(await read('gaia-dr3-neighbourhood-query.sql') === `${gaia.query};\n`, 'Gaia query file differs from the manifest.');

const solar = await json('src/data/solar-system.json');
const solarBodies = [
  [Body.Mercury, 'Mercury'], [Body.Venus, 'Venus'], [Body.Earth, 'Earth'], [Body.Mars, 'Mars'],
  [Body.Jupiter, 'Jupiter'], [Body.Saturn, 'Saturn'], [Body.Uranus, 'Uranus'], [Body.Neptune, 'Neptune'],
];
const solarVector = (value) => [value.x, value.y, value.z].map((component) => Number(component.toFixed(12)));
const solarRotation = Rotation_EQJ_ECL();
assert(solar.epoch === '2026-11-26T00:00:00.000Z' && solar.source.version === '2.1.19', 'Solar reference epoch or generator version changed.');
assert(solar.units === 'au' && solar.frame.includes('EQJ') && solar.transformation.includes('Rotation_EQJ_ECL'), 'Solar source/display frame contract changed.');
assert(solar.bodies.length === solarBodies.length, 'Solar System must retain exactly eight planet centres.');
let comparedSolarBodies = 0;
for (const [body, name] of solarBodies) {
  const expectedEqj = HelioVector(body, new Date(solar.epoch));
  const expectedEcl = RotateVector(solarRotation, expectedEqj);
  const actual = solar.bodies[comparedSolarBodies];
  assert(actual.name === name, `Solar body order mismatch at ${name}.`);
  assert(actual.heliocentricAu === Number(expectedEqj.Length().toFixed(12)), `Solar heliocentric distance mismatch for ${name}.`);
  assert(JSON.stringify(actual.eqjAu) === JSON.stringify(solarVector(expectedEqj)), `Solar EQJ vector mismatch for ${name}.`);
  assert(JSON.stringify(actual.eclipticAu) === JSON.stringify(solarVector(expectedEcl)), `Solar ECL vector mismatch for ${name}.`);
  comparedSolarBodies += 1;
}
const selectedEpochProbe = HelioVector(Body.Mercury, new Date('2027-01-02T00:00:00.000Z'));
assert([selectedEpochProbe.x, selectedEpochProbe.y, selectedEpochProbe.z].every(Number.isFinite), 'Selected-epoch ephemeris probe is not finite.');
assert(JSON.stringify(solarVector(selectedEpochProbe)) !== JSON.stringify(solar.bodies[0].eqjAu), 'Selected-epoch probe did not change Mercury geometry.');

const issText = await read('data/raw/iss-omm.json');
const issRaw = JSON.parse(issText);
const iss = await json('src/data/iss-expedition.json');
assert(Array.isArray(issRaw) && issRaw.length === 1 && JSON.stringify(iss.elements) === JSON.stringify(issRaw[0]), 'ISS manifest does not exactly retain its single raw OMM record.');
assert(iss.object.noradCatalogueId === '25544' && iss.object.internationalDesignator === '1998-067A', 'ISS identity changed.');
assert(iss.source.rawSha256 === sha256(issText) && iss.source.sourceEpoch === `${issRaw[0].EPOCH}Z`, 'ISS raw hash or exact source epoch changed.');
assert(iss.source.referenceFrame === 'TEME' && iss.source.timeSystem === 'UTC' && iss.source.meanElementTheory === 'SGP4', 'ISS source semantics changed.');
assert(iss.position.units === 'km' && iss.position.frame === 'TEME' && iss.position.lightTimeCorrection === false && iss.position.uncertainty === null, 'ISS output contract changed.');
assert(iss.snapshotStatus === 'HISTORICAL' && iss.staleness.historical === true && iss.staleness.liveRefresh === false, 'ISS staleness/live-refresh contract changed.');
assert(iss.propagator.version === '7.2.0', 'ISS propagator version changed.');
const issSourceMs = Date.parse(iss.source.sourceEpoch);
const issWindowMs = 12 * 60 * 60 * 1000;
assert(iss.selection.defaultEpoch === new Date(issSourceMs).toISOString(), 'ISS default is not the millisecond-quantized source epoch.');
assert(iss.selection.minEpoch === new Date(issSourceMs - issWindowMs).toISOString() && iss.selection.maxEpoch === new Date(issSourceMs + issWindowMs).toISOString(), 'ISS selection bounds changed.');
const issSatrec = json2satrec(iss.elements);
const issReference = propagate(issSatrec, new Date(iss.selection.defaultEpoch));
assert(issReference && [issReference.position.x, issReference.position.y, issReference.position.z].every(Number.isFinite), 'ISS reference propagation failed.');
const issReferenceVector = solarVector(issReference.position);
assert(JSON.stringify(iss.referencePropagation.temeKm) === JSON.stringify(issReferenceVector), 'ISS reference TEME vector mismatch.');
assert(iss.referencePropagation.geocentricDistanceKm === Number(Math.hypot(...issReferenceVector).toFixed(12)), 'ISS reference geocentric distance mismatch.');
const issSelectedProbeEpoch = new Date(issSourceMs + 10 * 60 * 1000).toISOString();
const issSelectedProbe = propagate(issSatrec, new Date(issSelectedProbeEpoch));
assert(issSelectedProbe && [issSelectedProbe.position.x, issSelectedProbe.position.y, issSelectedProbe.position.z].every(Number.isFinite), 'ISS selected-time probe failed.');
assert(JSON.stringify(solarVector(issSelectedProbe.position)) !== JSON.stringify(issReferenceVector), 'ISS selected-time probe did not change TEME geometry.');

const moon = await json('src/data/moon-expedition.json');
assert(moon.schema === 'other-worlds/moon-expedition-v1' && moon.status === 'DERIVED' && moon.object.name === 'Moon', 'Moon identity or derivation status changed.');
assert(moon.source.name === 'Astronomy Engine' && moon.source.version === '2.1.19' && moon.source.method.includes('GeoMoon'), 'Moon generator or method changed.');
assert(moon.position.units === 'au' && moon.position.frame === 'EQJ/J2000' && moon.position.origin === 'Earth centre', 'Moon source units, frame, or origin changed.');
assert(moon.position.lightTimeCorrection === false && moon.position.aberrationCorrection === false && moon.position.uncertainty === null, 'Moon correction/uncertainty contract changed.');
assert(moon.source.timeSemantics.includes('UT1 and UTC') && moon.source.timeSemantics.includes('TT internally'), 'Moon time-scale limitations changed.');
const moonReferenceMs = Date.parse(moon.selection.defaultEpoch);
const moonWindowMs = 24 * 60 * 60 * 1000;
assert(moon.selection.defaultEpoch === '2026-12-18T00:00:00.000Z' && moon.referenceDerivation.epoch === moon.selection.defaultEpoch, 'Moon reference epoch changed.');
assert(moon.selection.minEpoch === new Date(moonReferenceMs - moonWindowMs).toISOString() && moon.selection.maxEpoch === new Date(moonReferenceMs + moonWindowMs).toISOString(), 'Moon selection bounds changed.');
assert(moon.selection.stepMinutes === 180 && moon.trace.halfSpanMinutes === 720 && moon.trace.sampleStepMinutes === 60, 'Moon explicit-step or trace contract changed.');
assert(moon.display.mapping.includes('(x,z,-y)') && moon.display.radialScale.includes('3.45') && moon.display.bodyMarker.includes('not an observed surface portrait'), 'Moon display or schematic-marker disclosure changed.');
const moonReference = GeoMoon(new Date(moon.selection.defaultEpoch));
const moonReferenceEcl = RotateVector(solarRotation, moonReference);
assert(JSON.stringify(moon.referenceDerivation.eqjAu) === JSON.stringify(solarVector(moonReference)), 'Moon reference EQJ vector mismatch.');
assert(JSON.stringify(moon.referenceDerivation.eclipticAu) === JSON.stringify(solarVector(moonReferenceEcl)), 'Moon reference ECL vector mismatch.');
assert(moon.referenceDerivation.geocentricDistanceKm === Number((moonReference.Length() * KM_PER_AU).toFixed(12)), 'Moon reference distance mismatch.');
const moonSelectedProbeEpoch = new Date(moonReferenceMs + 180 * 60 * 1000).toISOString();
const moonSelectedProbe = GeoMoon(new Date(moonSelectedProbeEpoch));
assert([moonSelectedProbe.x, moonSelectedProbe.y, moonSelectedProbe.z].every(Number.isFinite), 'Moon selected-time probe failed.');
assert(JSON.stringify(solarVector(moonSelectedProbe)) !== JSON.stringify(solarVector(moonReference)), 'Moon selected-time probe did not change EQJ geometry.');

assert(sha256(baseText) === '6bcd8b57617226da328e85bee5c2955755ee054ed4d775dd43f03855cb2cb362', 'The preserved base snapshot hash changed.');
assert(base.length === 6473 && base.length === baseProvenance.rowCount, 'Base row count does not match the verified snapshot.');
assert(new Set(base.map((row) => row.pl_name)).size === base.length, 'Base planet identifiers are not unique.');
assert(new Set(base.map((row) => row.hostname)).size === 4865, 'Base system count changed.');
assert(traceRaw.length === base.length && normalized.rows.length === base.length, 'Companion row counts differ.');
assert(normalized.schema === 'other-worlds/pscomppars-traceability-v1', 'Unexpected normalized schema.');
assert(normalized.fields.join(',') === traceProvenance.fields.join(','), 'Normalized fields differ from provenance.');

const baseByName = new Map(base.map((row) => [row.pl_name, row]));
const rawByName = new Map(traceRaw.map((row) => [row.pl_name, row]));
let comparedValues = 0;
let comparedNormalizedCells = 0;
for (let rowIndex = 0; rowIndex < traceRaw.length; rowIndex += 1) {
  const raw = traceRaw[rowIndex];
  const source = baseByName.get(raw.pl_name);
  assert(source && source.hostname === raw.hostname, `Identity mismatch for ${raw.pl_name}.`);
  for (const field of fields) {
    assert(source[field] === raw[field], `Source value mismatch for ${raw.pl_name}: ${field}.`);
    comparedValues += 1;
  }
  const encoded = normalized.rows[rowIndex];
  assert(encoded.length === normalized.fields.length, `Normalized row width mismatch at ${rowIndex}.`);
  normalized.fields.forEach((field, columnIndex) => {
    const expected = raw[field] ?? null;
    const actual = (field.endsWith('_reflink') || field === 'disc_refname') && typeof encoded[columnIndex] === 'number'
      ? normalized.references[encoded[columnIndex]] : encoded[columnIndex];
    assert(actual === expected, `Normalized value mismatch for ${raw.pl_name}: ${field}.`);
    comparedNormalizedCells += 1;
  });
}
for (const name of referenceWorlds) assert(baseByName.has(name) && rawByName.has(name), `Reference world missing: ${name}.`);

const report = {
  validatedAt: new Date().toISOString(),
  passed: true,
  base: { rows: base.length, planets: baseByName.size, systems: new Set(base.map((row) => row.hostname)).size, sha256: sha256(baseText), preserved: true },
  traceability: { rawRows: traceRaw.length, normalizedRows: normalized.rows.length, references: normalized.references.length, rawSha256: sha256(traceText), normalizedSha256: sha256(normalizedText), comparedValues, comparedNormalizedCells },
  solar: {
    referenceEpoch: solar.epoch,
    selectedEpochWindowUtc: ['2000-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z'],
    bodies: comparedSolarBodies,
    generator: `Astronomy Engine ${solar.source.version}`,
    units: solar.units,
    sourceFrame: 'EQJ/J2000',
    displayFrame: 'ECL/J2000',
    exactGeneratorMatch: true,
    selectedEpochProbe: '2027-01-02T00:00:00.000Z',
    lightTimeCorrection: false,
    aberrationCorrection: false,
  },
  iss: {
    object: 'ISS (ZARYA)',
    noradCatalogueId: '25544',
    rawSha256: iss.source.rawSha256,
    sourceEpoch: iss.source.sourceEpoch,
    retrievedAt: iss.source.retrievedAt,
    selectedEpochWindowUtc: [iss.selection.minEpoch, iss.selection.maxEpoch],
    propagator: `satellite.js ${iss.propagator.version}`,
    units: iss.position.units,
    frame: iss.position.frame,
    exactRawOmmMatch: true,
    exactReferenceMatch: true,
    selectedEpochProbe: issSelectedProbeEpoch,
    historical: true,
    liveRefresh: false,
    lightTimeCorrection: false,
    uncertainty: null,
  },
  moon: {
    object: 'Moon',
    referenceEpoch: moon.selection.defaultEpoch,
    generatedAt: moon.source.generatedAt,
    selectedEpochWindowUtc: [moon.selection.minEpoch, moon.selection.maxEpoch],
    generator: `Astronomy Engine ${moon.source.version}`,
    units: moon.position.units,
    sourceFrame: moon.position.frame,
    displayFrame: 'ECL/J2000',
    exactReferenceMatch: true,
    selectedEpochProbe: moonSelectedProbeEpoch,
    geocentricDistanceKm: moon.referenceDerivation.geocentricDistanceKm,
    lightTimeCorrection: false,
    aberrationCorrection: false,
    uncertainty: null,
    surfaceClaim: false,
    phaseClaim: false,
  },
  gaia: {
    rows: gaia.rowCount,
    uniqueSourceIds: new Set(gaia.stars.map((star) => star.source_id)).size,
    rawSha256: gaia.rawSha256,
    referenceEpoch: gaia.referenceEpoch,
    minimumParallaxMas: Math.min(...gaia.stars.map((star) => star.parallax)),
    minimumParallaxOverError: Math.min(...gaia.stars.map((star) => star.parallax_over_error)),
    distanceRangePc: [Math.min(...gaia.stars.map((star) => star.r_med_geo)), Math.max(...gaia.stars.map((star) => star.r_med_geo))],
    exactRawRuntimeMatch: true,
  },
  referenceWorlds,
  missingValuePolicy: 'All compared nulls remained null. No zero substitution or interpolation was applied.',
};
await mkdir(path.join(root, 'evidence'), { recursive: true });
await writeFile(path.join(root, 'evidence/data-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
