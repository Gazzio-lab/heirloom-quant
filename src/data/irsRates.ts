/**
 * IRC §7520 rates (used for valuing GRATs, CRTs, CLTs, etc.).
 * The published rate changes monthly; users can override at runtime.
 * The default below is a reasonable mid-2024 figure.
 */
export const SECTION_7520_RATE_DEFAULT = 0.054;

/** AFR (Applicable Federal Rates) - representative 2024 mid-term rate. */
export const AFR_2024 = {
  shortTerm: 0.046,   // <= 3 years
  midTerm: 0.044,     // 3-9 years
  longTerm: 0.045,    // > 9 years
};

/** 2024 retirement plan contribution / catch-up limits. */
export const RETIREMENT_LIMITS_2024 = {
  k401: 23_000,
  k401CatchUp: 7_500,
  ira: 7_000,
  iraCatchUp: 1_000,
  rothIncomePhaseoutSingle: { start: 146_000, end: 161_000 },
  rothIncomePhaseoutMFJ: { start: 230_000, end: 240_000 },
  sepPercent: 0.25,
  sepCap: 69_000,
  simpleEmployee: 16_000,
};

/**
 * Simplified IRS Single Life Expectancy table (Reg §1.401(a)(9)-9, 2022 update).
 * Values are remaining life expectancy in years for a given age.
 * For brevity we include selected ages and linearly interpolate for others.
 */
export const LIFE_EXPECTANCY: Record<number, number> = {
  0: 84.6, 5: 79.8, 10: 74.8, 15: 69.9, 20: 65.0,
  25: 60.2, 30: 55.3, 35: 50.5, 40: 45.7, 45: 41.0,
  50: 36.2, 55: 31.6, 60: 27.1, 65: 22.9, 70: 18.8,
  75: 14.8, 80: 11.2, 85: 8.1, 90: 5.7, 95: 4.0,
  100: 2.9,
};

export function lifeExpectancy(age: number): number {
  if (age <= 0) return LIFE_EXPECTANCY[0];
  if (age >= 100) return LIFE_EXPECTANCY[100];
  const lo = Math.floor(age / 5) * 5;
  const hi = lo + 5;
  const a = LIFE_EXPECTANCY[lo] ?? 0;
  const b = LIFE_EXPECTANCY[hi] ?? a;
  const frac = (age - lo) / 5;
  return a + (b - a) * frac;
}

/** 2024 RMD Uniform Lifetime Table - selected ages (Reg §1.401(a)(9)-9). */
export const UNIFORM_RMD_DIVISOR: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7,
  77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4,
  82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2,
  87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5,
  92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4,
  97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4,
};
