import { describe, expect, it } from 'vitest';
import { parseTraceability, parseReference, validateTraceability, formatMeasurement } from './traceability';
import { parseCatalogue } from './catalogue';

const reference = '<a refstr=AGOL_ET_AL__2021 href=https://ui.adsabs.harvard.edu/abs/2021PSJ.....2....1A/abstract target=ref>Agol et al. 2021</a>';
const baseRow = { pl_name: 'Alpha b', hostname: 'Alpha', pl_rade: 0.92, pl_bmasse: null };
const traceRow = {
  pl_name: 'Alpha b', hostname: 'Alpha', pl_rade: 0.92, pl_radeerr1: 0.013, pl_radeerr2: -0.012,
  pl_radelim: 0, pl_rade_reflink: reference, pl_bmasse: null, pl_bmasseerr1: null, pl_bmasseerr2: null,
  pl_bmasselim: null, pl_bmasse_reflink: null, disc_refname: reference,
};

describe('traceability companion', () => {
  it('parses publication links as data, never markup', () => {
    expect(parseReference(reference)).toMatchObject({ label: 'Agol et al. 2021', url: 'https://ui.adsabs.harvard.edu/abs/2021PSJ.....2....1A/abstract' });
    expect(parseReference('<a href=javascript:alert(1)>Unsafe</a>')?.url).toBeNull();
  });

  it('preserves asymmetric uncertainties and missing mass metadata', () => {
    const trace = parseTraceability([traceRow]);
    const radius = trace.byName.get('Alpha b')?.measurements.pl_rade;
    expect(radius).toMatchObject({ value: 0.92, positiveError: 0.013, negativeError: -0.012, limit: 0 });
    expect(radius?.reference?.label).toBe('Agol et al. 2021');
    expect(formatMeasurement(radius, 'R⊕')).toBe('0.92 (+0.013 / -0.012) R⊕');
    expect(formatMeasurement(trace.byName.get('Alpha b')?.measurements.pl_bmasse)).toBe('Unknown');
  });

  it('unpacks the compact columnar snapshot and shared references', () => {
    const fields = Object.keys(traceRow);
    const normalized = {
      schema: 'other-worlds/pscomppars-traceability-v1', fields, references: [reference],
      rows: [fields.map((field) => field.endsWith('_reflink') || field === 'disc_refname' ? 0 : traceRow[field as keyof typeof traceRow])],
    };
    const trace = parseTraceability(normalized);
    expect(trace.byName.get('Alpha b')?.measurements.pl_rade.reference?.label).toBe('Agol et al. 2021');
    expect(trace.byName.get('Alpha b')?.measurements.pl_rade.value).toBe(0.92);
    expect(() => parseTraceability({ ...normalized, rows: [[0]] })).toThrow('width');
  });

  it('requires one-to-one identity and identical source values', () => {
    const catalogue = parseCatalogue([baseRow]);
    const trace = parseTraceability([traceRow]);
    expect(() => validateTraceability(catalogue, trace)).not.toThrow();
    expect(() => validateTraceability(catalogue, parseTraceability([{ ...traceRow, pl_rade: 1 }]))).toThrow('value mismatch');
    expect(() => validateTraceability(catalogue, parseTraceability([{ ...traceRow, pl_name: 'Other b' }]))).toThrow('identity mismatch');
  });

  it('rejects non-finite source values', () => {
    expect(() => parseTraceability([{ ...traceRow, pl_radeerr1: Number.NaN }])).toThrow('pl_radeerr1');
  });
});
