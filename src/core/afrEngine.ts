/**
 * Pure AFR calculation engine — no I/O, no Electron, no Node-only APIs.
 * Safe to use from any layer that has access to an AfrData object.
 */
import type { AfrData, AfrTerm, AfrCompounding, AfrTermRates } from '../data/afr/types';

export type { AfrTerm, AfrCompounding };

// ---- rate selection -----------------------------------------------------

/**
 * Return the AFR rate (as a percentage, e.g. 3.95) for a given term
 * and compounding frequency.
 *
 * @param data         The current AfrData snapshot.
 * @param term         Term bucket: 'short' | 'mid' | 'long'.
 * @param compounding  Compounding frequency.
 * @param multiplier   Optional scalar (e.g. 1.2 for §7520).
 */
export function getAFR(
  data: AfrData,
  term: AfrTerm,
  compounding: AfrCompounding,
  multiplier = 1,
): number {
  const termData = termRates(data, term);
  return (termData[compounding] ?? termData.annual) * multiplier;
}

/**
 * Classify a duration in years into the correct AFR term bucket.
 *   ≤ 3 years  → short-term
 *   3–9 years  → mid-term
 *   > 9 years  → long-term
 */
export function termBucket(years: number): AfrTerm {
  if (years <= 3) return 'short';
  if (years <= 9) return 'mid';
  return 'long';
}

/**
 * §7520 rate = 120% of the mid-term AFR (annual), per IRC §7520(a)(2).
 * Returns a percentage (e.g. 4.82).
 */
export function getSection7520Rate(data: AfrData): number {
  return data.mid_term.annual * 1.2;
}

// ---- summary ------------------------------------------------------------

export interface AfrRateSummary {
  shortTerm: AfrTermRates;
  midTerm:   AfrTermRates;
  longTerm:  AfrTermRates;
  /** §7520 rate = 120% of annual mid-term AFR (as a percentage). */
  section7520: number;
  month:      string;
  source:     string;
  updatedAt:  string;
}

/** Build a flat summary object for convenient consumption by the renderer. */
export function buildAfrSummary(data: AfrData): AfrRateSummary {
  return {
    shortTerm:   { ...data.short_term },
    midTerm:     { ...data.mid_term },
    longTerm:    { ...data.long_term },
    section7520: getSection7520Rate(data),
    month:       data.month,
    source:      data.source,
    updatedAt:   data.updatedAt,
  };
}

// ---- internals ----------------------------------------------------------

function termRates(data: AfrData, term: AfrTerm): AfrTermRates {
  switch (term) {
    case 'short': return data.short_term;
    case 'mid':   return data.mid_term;
    case 'long':  return data.long_term;
  }
}
