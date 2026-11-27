import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { json2satrec, propagate } from 'satellite.js';

const root = process.cwd();
const rawPath = 'data/raw/iss-omm.json';
const outputPath = 'src/data/iss-expedition.json';
const retrievedAt = '2026-11-27T19:21:43.000Z';
const rawText = await readFile(path.join(root, rawPath), 'utf8');
const raw = JSON.parse(rawText);
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(Array.isArray(raw) && raw.length === 1, 'ISS source must contain exactly one OMM record.');
const elements = raw[0];
assert(elements.OBJECT_NAME === 'ISS (ZARYA)' && elements.OBJECT_ID === '1998-067A', 'Unexpected ISS identity.');
assert(elements.NORAD_CAT_ID === 25544 && elements.EPHEMERIS_TYPE === 0, 'Unexpected catalogue ID or ephemeris type.');
const sourceEpochMs = Date.parse(`${elements.EPOCH}Z`);
assert(Number.isFinite(sourceEpochMs), 'OMM epoch is not a finite UTC instant.');
const defaultEpoch = new Date(sourceEpochMs).toISOString();
const result = propagate(json2satrec(elements), new Date(defaultEpoch));
assert(result && [result.position.x, result.position.y, result.position.z].every(Number.isFinite), 'ISS reference propagation failed.');
const round = (value) => Number(value.toFixed(12));
const temeKm = [result.position.x, result.position.y, result.position.z].map(round);
const windowMs = 12 * 60 * 60 * 1000;

const manifest = {
  schema: 'other-worlds/iss-expedition-v1',
  status: 'DERIVED',
  snapshotStatus: 'HISTORICAL',
  object: {
    name: elements.OBJECT_NAME,
    internationalDesignator: elements.OBJECT_ID,
    noradCatalogueId: String(elements.NORAD_CAT_ID),
  },
  source: {
    publisher: 'CelesTrak',
    requestUrl: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=json-pretty',
    documentationUrl: 'https://celestrak.org/NORAD/documentation/gp-data-formats.php',
    format: 'OMM JSON-PRETTY',
    retrievedAt,
    retrievalTimestampBasis: 'Local preservation time; upstream response headers were not retained.',
    rawPath,
    rawSha256: createHash('sha256').update(rawText).digest('hex'),
    sourceEpoch: `${elements.EPOCH}Z`,
    timeSystem: 'UTC',
    referenceFrame: 'TEME',
    meanElementTheory: 'SGP4',
    semanticsNote: 'CelesTrak omits redundant mandatory OMM fields from JSON; Earth centre, TEME, UTC, and SGP4 semantics follow its GP format documentation.',
  },
  propagator: {
    name: 'satellite.js',
    version: '7.2.0',
    license: 'MIT',
    url: 'https://github.com/shashwatak/satellite-js',
  },
  elements,
  position: {
    units: 'km',
    frame: 'TEME',
    origin: 'Earth centre',
    lightTimeCorrection: false,
    uncertainty: null,
  },
  selection: {
    defaultEpoch,
    minEpoch: new Date(sourceEpochMs - windowMs).toISOString(),
    maxEpoch: new Date(sourceEpochMs + windowMs).toISOString(),
    stepMinutes: 10,
    quantization: 'JavaScript UTC milliseconds; the exact microsecond source epoch is retained separately.',
    boundNote: 'The ±12 h window is an interaction bound, not an accuracy guarantee.',
  },
  referencePropagation: {
    epoch: defaultEpoch,
    temeKm,
    geocentricDistanceKm: round(Math.hypot(...temeKm)),
  },
  display: {
    direction: 'TEME direction preserved',
    mapping: 'scene (x,y,z) = normalized TEME (x,z,-y)',
    radialScale: 'Fixed 2.65 scene units around an Earth globe of radius 2; geocentric kilometres remain in the data readout.',
    earthTextureRegistration: 'The composite Earth texture is not time-registered; no ground track, visibility, or pointing claim is made.',
  },
  staleness: {
    historical: true,
    ageAtRetrievalSeconds: round((Date.parse(retrievedAt) - sourceEpochMs) / 1000),
    liveRefresh: false,
    note: 'This is a preserved historical element set. No current position, runtime refresh, or numeric SGP4 error estimate is supplied.',
  },
  trace: {
    halfSpanMinutes: 46,
    sampleStepMinutes: 2,
    note: 'A 47-sample local SGP4 trace centred as near as the selection bounds allow; not an observed path.',
  },
};

await writeFile(path.join(root, outputPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${outputPath} from ${rawPath}; reference ${defaultEpoch}; SHA-256 ${manifest.source.rawSha256}.`);
