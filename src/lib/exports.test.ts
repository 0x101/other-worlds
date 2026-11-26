import { expect, it } from 'vitest';
import { rawPlanetRecord, recordsToCsv } from './exports';
import { makePlanet } from '../test/fixtures';
import { parseTraceability } from './traceability';

it('raw exports retain nulls, references, and exact source values', () => {
  const planet = makePlanet({ pl_name: 'Alpha, b', pl_rade: 0.9200001, pl_bmasse: null });
  const trace = parseTraceability([{ pl_name: planet.pl_name, hostname: planet.hostname, pl_rade: 0.9200001, pl_radeerr1: 0.01, pl_radeerr2: -0.02, pl_radelim: 0, pl_rade_reflink: '<a href=https://example.com>A & B</a>', pl_bmasse: null }]).byName.get(planet.pl_name);
  const record = rawPlanetRecord(planet, trace);
  expect(record.pl_rade).toBe(0.9200001);
  expect(record.pl_bmasse).toBeNull();
  const csv = recordsToCsv([record]);
  expect(csv).toContain('"Alpha, b"');
  expect(csv).toContain('0.9200001');
  expect(csv).toContain('<a href=https://example.com>A & B</a>');
});

it('CSV escapes quotes and newlines without replacing null with zero', () => {
  const csv = recordsToCsv([{ name: 'A "quoted"\nworld', value: null }]);
  expect(csv).toBe('name,value\r\n"A ""quoted""\nworld",');
});
