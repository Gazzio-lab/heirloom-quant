/**
 * IRS Applicable Federal Rate (AFR) type definitions.
 * Used by both the main-process data layer and the core engine.
 */

/** Compounding frequency variants published in IRS Revenue Rulings. */
export type AfrCompounding = 'annual' | 'semiannual' | 'quarterly' | 'monthly';

/** Term bucket for IRS Applicable Federal Rates. */
export type AfrTerm = 'short' | 'mid' | 'long';

/**
 * Rates for one term across all compounding frequencies.
 * Values are stored as percentages (e.g. 4.33, not 0.0433).
 */
export interface AfrTermRates {
  annual: number;
  semiannual: number;
  quarterly: number;
  monthly: number;
}

/** Full monthly AFR dataset as published in IRS Revenue Rulings Table 1. */
export interface AfrData {
  /** Format: "YYYY-MM" */
  month: string;
  /** ISO timestamp of when this data was fetched or cached. */
  updatedAt: string;
  /** Human-readable source label, e.g. "IRS Rev. Rul. 2025-9". */
  source: string;
  short_term: AfrTermRates;
  mid_term: AfrTermRates;
  long_term: AfrTermRates;
}

/** Global user preferences for how AFR defaults are applied in the UI. */
export interface AfrSettings {
  /** When false, AFR defaults are suppressed and static field defaults are used instead. */
  useAfrAsDefault: boolean;
  /**
   * 'auto' = respect each field's own afrLinked.term;
   * otherwise force all AFR-linked fields to the specified term.
   */
  termOverride: 'auto' | AfrTerm;
  /** Compounding frequency applied globally to all AFR-linked rate fields. */
  compounding: AfrCompounding;
}

export const DEFAULT_AFR_SETTINGS: AfrSettings = {
  useAfrAsDefault: true,
  termOverride: 'auto',
  compounding: 'monthly',
};

/**
 * Metadata attached to a FieldDef to declare that the field's value
 * should default to an IRS AFR-derived rate.
 */
export interface AfrLinked {
  /** Default term bucket for this specific field. */
  term: AfrTerm;
  /** Default compounding frequency for this field (overridden by global setting). */
  compounding: AfrCompounding;
  /**
   * Optional multiplier applied after the raw AFR lookup.
   * Use 1.2 for §7520 rate fields (= 120% × mid-term AFR).
   */
  multiplier?: number;
}
