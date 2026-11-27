export const DEFAULT_SOLAR_EPOCH = '2026-11-26T00:00:00.000Z';
export const SOLAR_MIN_EPOCH = '2000-01-01T00:00:00.000Z';
export const SOLAR_MAX_EPOCH = '2100-01-01T00:00:00.000Z';
export const SOLAR_PLAYBACK_STEP_DAYS = 0.25;
export const SOLAR_PLAYBACK_INTERVAL_MS = 250;

const DAY_MS = 86_400_000;
const MIN_MS = Date.parse(SOLAR_MIN_EPOCH);
const MAX_MS = Date.parse(SOLAR_MAX_EPOCH);
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Return an exact UTC millisecond value, rejecting normalized dates and undeclared ranges. */
export function solarEpochMs(epoch: string): number {
  if (!ISO_UTC.test(epoch)) throw new Error('Solar epoch must be an ISO UTC timestamp with milliseconds.');
  const value = Date.parse(epoch);
  if (!Number.isFinite(value) || new Date(value).toISOString() !== epoch) throw new Error('Solar epoch is not a real UTC instant.');
  if (value < MIN_MS || value > MAX_MS) throw new Error('Solar epoch is outside the declared 2000–2100 UTC window.');
  return value;
}

/** URL input fails closed to the preserved reference epoch rather than the visitor clock. */
export function normalizeSolarEpoch(value: string | null | undefined): string {
  if (!value) return DEFAULT_SOLAR_EPOCH;
  try {
    return new Date(solarEpochMs(value)).toISOString();
  } catch {
    return DEFAULT_SOLAR_EPOCH;
  }
}

export function shiftSolarEpoch(epoch: string, days: number): string {
  if (!Number.isFinite(days)) throw new Error('Solar epoch shift must be finite.');
  const shifted = solarEpochMs(epoch) + Math.round(days * DAY_MS);
  return new Date(Math.max(MIN_MS, Math.min(MAX_MS, shifted))).toISOString();
}

export function solarEpochFromDate(date: string): string {
  return new Date(solarEpochMs(`${date}T00:00:00.000Z`)).toISOString();
}

export function formatSolarEpoch(epoch: string): string {
  const date = new Date(solarEpochMs(epoch));
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const milliseconds = date.getUTCMilliseconds();
  const preciseTime = date.getUTCSeconds() || milliseconds ? `:${seconds}${milliseconds ? `.${String(milliseconds).padStart(3, '0')}` : ''}` : '';
  return `${day} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} · ${hours}:${minutes}${preciseTime} UTC`;
}
