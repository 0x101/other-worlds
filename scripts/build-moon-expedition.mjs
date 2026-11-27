import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GeoMoon, KM_PER_AU, Rotation_EQJ_ECL, RotateVector } from 'astronomy-engine';

const root = process.cwd();
const outputPath = 'src/data/moon-expedition.json';
const defaultEpoch = '2026-12-18T00:00:00.000Z';
const generatedAt = '2026-11-27T22:29:52.000Z';
const windowMs = 24 * 60 * 60 * 1000;
const referenceMs = Date.parse(defaultEpoch);
const round = (value) => Number(value.toFixed(12));
const vector = (value) => [value.x, value.y, value.z].map(round);
const eqj = GeoMoon(new Date(referenceMs));
const ecliptic = RotateVector(Rotation_EQJ_ECL(), eqj);
if (![eqj.x, eqj.y, eqj.z, ecliptic.x, ecliptic.y, ecliptic.z].every(Number.isFinite)) throw new Error('Moon reference derivation failed.');

const manifest = {
  schema: 'other-worlds/moon-expedition-v1',
  status: 'DERIVED',
  object: { name: 'Moon', origin: 'Earth centre' },
  source: {
    name: 'Astronomy Engine',
    version: '2.1.19',
    license: 'MIT',
    url: 'https://github.com/cosinekitty/astronomy/tree/master/source/js',
    documentationUrl: 'https://github.com/cosinekitty/astronomy#geomoon',
    method: 'GeoMoon(date) for the geometric geocentric Moon centre; RotateVector(Rotation_EQJ_ECL()) for the separate display frame.',
    algorithm: "Nautical Almanac Office's Improved Lunar Ephemeris of 1954, derived from E. W. Brown's lunar theories, as documented by the pinned library.",
    generatedAt,
    generationTimestampBasis: 'Local deterministic manifest generation time; no remote catalogue retrieval occurs.',
    timeSemantics: 'Input selections are UTC milliseconds. The library approximates UT1 and UTC as equivalent and derives TT internally.',
  },
  position: {
    units: 'au',
    frame: 'EQJ/J2000',
    origin: 'Earth centre',
    lightTimeCorrection: false,
    aberrationCorrection: false,
    uncertainty: null,
  },
  selection: {
    defaultEpoch,
    minEpoch: new Date(referenceMs - windowMs).toISOString(),
    maxEpoch: new Date(referenceMs + windowMs).toISOString(),
    stepMinutes: 180,
    quantization: 'Strict ISO UTC timestamps with millisecond resolution; no visitor-clock fallback.',
    boundNote: 'The ±24 h window is an interaction bound, not an accuracy guarantee.',
  },
  referenceDerivation: {
    epoch: defaultEpoch,
    eqjAu: vector(eqj),
    eclipticAu: vector(ecliptic),
    geocentricDistanceKm: round(eqj.Length() * KM_PER_AU),
  },
  display: {
    direction: 'EQJ/J2000 source retained; ECL/J2000 direction preserved through a fixed display mapping.',
    mapping: 'scene (x,y,z) = normalized ECL/J2000 (x,z,-y)',
    radialScale: 'Fixed 3.45 scene units around an Earth globe of radius 2 before common screen-fit scaling; geocentric kilometres remain in the data readout.',
    bodyMarker: 'An enlarged schematic marker, not an observed surface portrait. Scene lighting is compositional and is not a calculated lunar phase.',
    earthTextureRegistration: 'The composite Earth texture is not time-registered; no ground track, visibility, or pointing claim is made.',
  },
  trace: {
    halfSpanMinutes: 720,
    sampleStepMinutes: 60,
    note: 'A 25-sample local GeoMoon trace centred as near as the selection bounds allow; not an observed path.',
  },
};

await writeFile(path.join(root, outputPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${outputPath}; reference ${defaultEpoch}; ${manifest.referenceDerivation.geocentricDistanceKm} km.`);
