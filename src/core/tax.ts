/**
 * Generic tax-bracket primitives. Brackets are imported from /data
 * so logic and rates are decoupled.
 */

export interface TaxBracket {
  /** Lower bound (inclusive). */
  min: number;
  /** Upper bound (exclusive). Use Infinity for the top bracket. */
  max: number;
  /** Marginal rate as a decimal, e.g. 0.22 for 22%. */
  rate: number;
}

export interface TaxResult {
  taxableIncome: number;
  tax: number;
  effectiveRate: number;
  marginalRate: number;
  byBracket: Array<{ min: number; max: number; rate: number; taxedAmount: number; taxFromBracket: number }>;
}

/**
 * Apply a progressive bracket schedule to a taxable income amount.
 */
export function applyBrackets(taxableIncome: number, brackets: TaxBracket[]): TaxResult {
  let tax = 0;
  let marginal = 0;
  const detail: TaxResult['byBracket'] = [];

  for (const b of brackets) {
    if (taxableIncome > b.min) {
      const ceiling = Math.min(taxableIncome, b.max);
      const slice = Math.max(0, ceiling - b.min);
      const t = slice * b.rate;
      tax += t;
      marginal = b.rate;
      detail.push({ min: b.min, max: b.max, rate: b.rate, taxedAmount: slice, taxFromBracket: t });
    }
  }

  return {
    taxableIncome,
    tax,
    effectiveRate: taxableIncome > 0 ? tax / taxableIncome : 0,
    marginalRate: marginal,
    byBracket: detail,
  };
}

/** Simple Social Security wage base / FICA approximation. */
export function ficaTax(wages: number, ssWageBase: number, ssRate: number, medicareRate: number): number {
  const ss = Math.min(wages, ssWageBase) * ssRate;
  const medicare = wages * medicareRate;
  return ss + medicare;
}
