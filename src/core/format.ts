/**
 * Display helpers for the core layer. These are pure functions and
 * therefore safe for both Node (tests, main process) and the renderer.
 */

export function formatCurrency(n: number, currency = 'USD', locale = 'en-US'): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPercent(n: number, digits = 2, locale = 'en-US'): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatNumber(n: number, digits = 2, locale = 'en-US'): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function round(n: number, digits = 2): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
