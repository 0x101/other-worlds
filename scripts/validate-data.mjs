import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

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
  referenceWorlds,
  missingValuePolicy: 'All compared nulls remained null. No zero substitution or interpolation was applied.',
};
await mkdir(path.join(root, 'evidence'), { recursive: true });
await writeFile(path.join(root, 'evidence/data-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
