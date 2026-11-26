import { mkdir, writeFile } from 'node:fs/promises';
import { Body, HelioVector, Rotation_EQJ_ECL, RotateVector } from 'astronomy-engine';

const epoch = '2026-11-26T00:00:00.000Z';
const date = new Date(epoch);
const rotation = Rotation_EQJ_ECL();
const names = [
  [Body.Mercury, 'Mercury'],
  [Body.Venus, 'Venus'],
  [Body.Earth, 'Earth'],
  [Body.Mars, 'Mars'],
  [Body.Jupiter, 'Jupiter'],
  [Body.Saturn, 'Saturn'],
  [Body.Uranus, 'Uranus'],
  [Body.Neptune, 'Neptune'],
];

const bodies = names.map(([body, name]) => {
  const eqj = HelioVector(body, date);
  const ecliptic = RotateVector(rotation, eqj);
  const vector = (value) => [value.x, value.y, value.z].map((component) => Number(component.toFixed(12)));
  return {
    name,
    heliocentricAu: Number(eqj.Length().toFixed(12)),
    eqjAu: vector(eqj),
    eclipticAu: vector(ecliptic),
  };
});

const snapshot = {
  schema: 'other-worlds/solar-system-snapshot-v1',
  epoch,
  origin: 'Sun centre',
  frame: 'EQJ — J2000 mean equator',
  units: 'au',
  status: 'DERIVED',
  source: {
    name: 'Astronomy Engine',
    version: '2.1.19',
    license: 'MIT',
    url: 'https://github.com/cosinekitty/astronomy/tree/master/source/js',
    method: 'HelioVector for each planet centre; geometric heliocentric position without light-time or aberration correction.',
  },
  transformation: 'RotateVector(Rotation_EQJ_ECL()) supplies display-only ECL/J2000 coordinates. The original EQJ/J2000 vectors are retained.',
  generatedAt: new Date().toISOString(),
  bodies,
};

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../src/data/solar-system.json', import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${bodies.length} heliocentric positions for ${epoch}.`);
