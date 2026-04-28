/**
 * Pure financial primitives. NO UI, NO OS, NO I/O.
 * Every function here is a pure function suitable for unit testing.
 */

const EPSILON = 1e-9;

/** Convert nominal annual rate compounded m times to per-period rate. */
export function periodicRate(annualRate: number, periodsPerYear: number): number {
  return annualRate / periodsPerYear;
}

/** Effective annual rate from nominal rate compounded m times per year. */
export function effectiveRate(nominalAnnual: number, periodsPerYear: number): number {
  return Math.pow(1 + nominalAnnual / periodsPerYear, periodsPerYear) - 1;
}

/** Effective annual rate with continuous compounding. */
export function continuousEAR(nominalAnnual: number): number {
  return Math.exp(nominalAnnual) - 1;
}

/**
 * Future value of a single lump sum.
 *   FV = PV * (1 + r)^n
 */
export function fv(pv: number, ratePerPeriod: number, periods: number): number {
  return pv * Math.pow(1 + ratePerPeriod, periods);
}

/**
 * Present value of a single lump sum.
 *   PV = FV / (1 + r)^n
 */
export function pv(fvAmount: number, ratePerPeriod: number, periods: number): number {
  return fvAmount / Math.pow(1 + ratePerPeriod, periods);
}

/**
 * Future value of an annuity (series of equal payments).
 *   FV = PMT * ((1+r)^n - 1) / r            (ordinary)
 *   FV_due = FV * (1+r)                     (annuity due)
 */
export function fvAnnuity(pmt: number, ratePerPeriod: number, periods: number, due = false): number {
  if (Math.abs(ratePerPeriod) < EPSILON) {
    return pmt * periods * (due ? 1 : 1);
  }
  const base = (pmt * (Math.pow(1 + ratePerPeriod, periods) - 1)) / ratePerPeriod;
  return due ? base * (1 + ratePerPeriod) : base;
}

/**
 * Present value of an annuity.
 *   PV = PMT * (1 - (1+r)^-n) / r           (ordinary)
 *   PV_due = PV * (1+r)                     (annuity due)
 */
export function pvAnnuity(pmt: number, ratePerPeriod: number, periods: number, due = false): number {
  if (Math.abs(ratePerPeriod) < EPSILON) {
    return pmt * periods;
  }
  const base = (pmt * (1 - Math.pow(1 + ratePerPeriod, -periods))) / ratePerPeriod;
  return due ? base * (1 + ratePerPeriod) : base;
}

/**
 * Solve for the level periodic payment given PV, FV, rate, and n.
 * Mirrors Excel's PMT function.
 */
export function pmt(
  ratePerPeriod: number,
  periods: number,
  presentValue: number,
  futureValue = 0,
  due = false
): number {
  if (Math.abs(ratePerPeriod) < EPSILON) {
    return -(presentValue + futureValue) / periods;
  }
  const pvif = Math.pow(1 + ratePerPeriod, periods);
  const payment = -(presentValue * pvif + futureValue) / ((pvif - 1) / ratePerPeriod);
  return due ? payment / (1 + ratePerPeriod) : payment;
}

/**
 * Net Present Value: discounts each cashflow at ratePerPeriod.
 * cashflows[0] is at t=0 (NOT discounted), cashflows[i] at t=i.
 */
export function npv(ratePerPeriod: number, cashflows: number[]): number {
  let total = 0;
  for (let t = 0; t < cashflows.length; t++) {
    total += cashflows[t] / Math.pow(1 + ratePerPeriod, t);
  }
  return total;
}

/**
 * Internal Rate of Return using Newton-Raphson with bisection fallback.
 * Returns the per-period rate that drives NPV(rate, cashflows) = 0.
 */
export function irr(cashflows: number[], guess = 0.1): number {
  if (cashflows.length < 2) {
    throw new Error('IRR requires at least two cashflows.');
  }
  const hasPositive = cashflows.some(c => c > 0);
  const hasNegative = cashflows.some(c => c < 0);
  if (!hasPositive || !hasNegative) {
    throw new Error('IRR requires both positive and negative cashflows.');
  }

  // Newton-Raphson
  let rate = guess;
  for (let i = 0; i < 100; i++) {
    const f = npv(rate, cashflows);
    // derivative of NPV w.r.t r
    let df = 0;
    for (let t = 1; t < cashflows.length; t++) {
      df += (-t * cashflows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(df) < EPSILON) break;
    const next = rate - f / df;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-10) return next;
    rate = next;
  }

  // Bisection fallback
  let lo = -0.999;
  let hi = 10;
  let fLo = npv(lo, cashflows);
  let fHi = npv(hi, cashflows);
  if (fLo * fHi > 0) {
    return rate; // best effort
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, cashflows);
    if (Math.abs(fMid) < 1e-10) return mid;
    if (fMid * fLo < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * Modified Internal Rate of Return.
 * @param financeRate - rate at which negative cashflows are financed.
 * @param reinvestRate - rate at which positive cashflows are reinvested.
 */
export function mirr(cashflows: number[], financeRate: number, reinvestRate: number): number {
  const n = cashflows.length - 1;
  let pvNeg = 0;
  let fvPos = 0;
  for (let t = 0; t < cashflows.length; t++) {
    if (cashflows[t] < 0) pvNeg += cashflows[t] / Math.pow(1 + financeRate, t);
    if (cashflows[t] > 0) fvPos += cashflows[t] * Math.pow(1 + reinvestRate, n - t);
  }
  return Math.pow(fvPos / -pvNeg, 1 / n) - 1;
}

/** CAGR (compound annual growth rate). */
export function cagr(beginValue: number, endValue: number, years: number): number {
  if (beginValue <= 0 || years <= 0) return NaN;
  return Math.pow(endValue / beginValue, 1 / years) - 1;
}

/** Rule-of-72 doubling time approximation (years). */
export function ruleOf72(annualRate: number): number {
  if (annualRate <= 0) return Infinity;
  return 72 / (annualRate * 100);
}

/** Real (inflation-adjusted) rate: Fisher equation. */
export function realRate(nominal: number, inflation: number): number {
  return (1 + nominal) / (1 + inflation) - 1;
}
