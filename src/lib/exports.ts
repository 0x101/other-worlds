import type { PlanetRow, Provenance, TraceabilityRow } from '../types';

export function rawPlanetRecord(planet: PlanetRow, trace?: TraceabilityRow | null): Record<string, string | number | null> {
  return { ...planet, ...(trace?.raw ?? {}) };
}

export function rawExportDocument(planet: PlanetRow, trace: TraceabilityRow | null | undefined, base: Provenance, companion: Provenance): object {
  return {
    table: 'NASA Exoplanet Archive pscomppars',
    compositeCaveat: base.compositeCaveat,
    baseSnapshot: { requestUrl: base.requestUrl, query: base.query, fetchedAt: base.fetchedAt },
    traceabilitySnapshot: { requestUrl: companion.requestUrl, query: companion.query, fetchedAt: companion.fetchedAt },
    attribution: base.attribution,
    row: rawPlanetRecord(planet, trace),
  };
}

export function recordsToCsv(records: Record<string, string | number | null>[]): string {
  if (!records.length) return '';
  const fields = [...new Set(records.flatMap((record) => Object.keys(record)))];
  const escape = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [fields.map(escape).join(','), ...records.map((record) => fields.map((field) => escape(record[field])).join(','))].join('\r\n');
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
