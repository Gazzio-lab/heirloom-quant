/**
 * Estate Optimization Engine
 *
 * Evaluates 8 planning strategies and ranks them by after-tax wealth
 * transferred to heirs. Integrates both federal estate tax and
 * Pennsylvania inheritance tax.
 *
 * For planning estimates only — verify with qualified counsel.
 */
import { quickPaTax, PA_RATES } from './paInheritanceTax';

// ---- constants (2024 / 2025 assumed) ------------------------------------

export const FEDERAL_EXEMPTION_SINGLE  = 13_610_000;
export const FEDERAL_EXEMPTION_MARRIED = 27_220_000;
export const FED_TOP_RATE              = 0.40;
export const ANNUAL_GIFT_EXCLUSION     = 18_000;

// ---- input / output types -----------------------------------------------

export interface AssetItem {
  id: string; label: string;
  category: string; value: number; annualGrowth: number; includedInEstate: boolean;
}

export interface BeneficiaryItem {
  id: string; name: string;
  relation: 'spouse' | 'lineal' | 'sibling' | 'other' | 'charity';
  sharePercent: number;
}

export interface OptimizerInput {
  filingStatus: 'single' | 'married';
  assets: AssetItem[];
  beneficiaries: BeneficiaryItem[];
  growthRate: number;          // annual portfolio growth rate, decimal
  years: number;               // planning horizon
  charitableGoal: number;
  liquidityNeedPercent: number;
  afrMidAnnual: number;        // mid-term AFR, e.g. 4.02 (%)
}

export interface StrategyResult {
  strategyId: string;
  strategyName: string;
  description: string;
  futureGrossEstate: number;
  federalTax: number;
  paTax: number;
  totalTax: number;
  netToHeirs: number;
  taxSavingsVsBaseline: number;
  wealthTransferred: number;
  notes: string[];
}

export interface OptimizationReport {
  grossEstate: number;
  futureGrossEstate: number;
  strategies: StrategyResult[];
  recommended: StrategyResult;
  paBreakdown: { relation: string; share: number; tax: number }[];
}

// ---- helpers ------------------------------------------------------------

function federalTax(grossEstate: number, filingStatus: 'single' | 'married'): number {
  const exemption = filingStatus === 'married'
    ? FEDERAL_EXEMPTION_MARRIED
    : FEDERAL_EXEMPTION_SINGLE;
  return Math.max(grossEstate - exemption, 0) * FED_TOP_RATE;
}

function paTotal(taxableEstate: number, bens: BeneficiaryItem[]): number {
  const totalShare = bens.reduce((s, b) => s + b.sharePercent, 0);
  let tax = 0;
  for (const b of bens) {
    const share = totalShare > 0 ? b.sharePercent / totalShare : 0;
    tax += taxableEstate * share * (PA_RATES[b.relation] ?? PA_RATES.other);
  }
  return tax;
}

function fvGrow(v: number, r: number, n: number): number {
  return v * Math.pow(1 + r, n);
}

// ---- optimizer ----------------------------------------------------------

export function runOptimizer(input: OptimizerInput): OptimizationReport {
  const { filingStatus, assets, beneficiaries, growthRate: gr, years: n, charitableGoal, afrMidAnnual } = input;
  const r = gr / 100;
  const afr = afrMidAnnual / 100;

  const grossEstate = assets
    .filter((a) => a.includedInEstate)
    .reduce((s, a) => s + a.value, 0);

  const futureGross = fvGrow(grossEstate, r, n);
  const baseline = buildStrategy('no-planning', futureGross, filingStatus, beneficiaries, []);

  // ---- 8 strategies -------------------------------------------------------

  const strategies: StrategyResult[] = [
    baseline,

    // 1. Annual exclusion gifting
    (() => {
      const linealBens = beneficiaries.filter((b) => b.relation === 'lineal').length;
      const annualGift = ANNUAL_GIFT_EXCLUSION * Math.max(linealBens, 1) * (filingStatus === 'married' ? 2 : 1);
      const removed = annualGift * ((Math.pow(1 + r, n) - 1) / r); // FV of gifts removed from estate
      const reducedEstate = Math.max(futureGross - removed, 0);
      return buildStrategy(
        'annual-gift', reducedEstate, filingStatus, beneficiaries,
        [`Annual gifts of ${fmt(annualGift)} to ${linealBens} lineal heirs over ${n} years.`],
      );
    })(),

    // 2. Lifetime exemption use now
    (() => {
      const exemption = filingStatus === 'married' ? FEDERAL_EXEMPTION_MARRIED : FEDERAL_EXEMPTION_SINGLE;
      const giftedNow = Math.min(exemption, futureGross * 0.5);
      const removedGrowth = fvGrow(giftedNow, r, n);
      const reducedEstate = Math.max(futureGross - removedGrowth, 0);
      return buildStrategy(
        'lifetime-gift', reducedEstate, filingStatus, beneficiaries,
        ['Front-load lifetime exemption — removes future appreciation from estate.'],
      );
    })(),

    // 3. GRAT (Grantor Retained Annuity Trust) — 5-year zeroed-out
    (() => {
      const fundingAmount = grossEstate * 0.40;
      const annuityFactor = (1 - Math.pow(1 + afr, -5)) / afr;
      const annuity = fundingAmount / annuityFactor;
      const actualReturn = fvGrow(fundingAmount, r, 5);
      const gratRemainder = Math.max(actualReturn - annuity * 5, 0);
      // GRAT remainder escapes estate
      const reducedFuture = Math.max(futureGross - gratRemainder, 0);
      return buildStrategy(
        'grat', reducedFuture, filingStatus, beneficiaries,
        [
          `Zeroed-out GRAT — fund with ${fmt(fundingAmount)}.`,
          `Projected remainder to heirs: ${fmt(gratRemainder)} (assumes growth > §7520 rate of ${(afr * 1.2 * 100).toFixed(2)}%).`,
        ],
      );
    })(),

    // 4. Dynasty Trust / IDGT installment sale
    (() => {
      const saleValue = grossEstate * 0.50;
      const noteInterest = saleValue * afr;
      const assetGrowth  = fvGrow(saleValue, r, n);
      const noteBalance  = saleValue; // interest-only balloon
      const transferred  = assetGrowth - noteBalance;
      const reducedFuture = Math.max(futureGross - transferred, 0);
      return buildStrategy(
        'dynasty-idgt', reducedFuture, filingStatus, beneficiaries,
        [
          `IDGT installment sale of ${fmt(saleValue)} at ${(afr * 100).toFixed(2)}% AFR.`,
          `Projected trust appreciation beyond note: ${fmt(transferred)}.`,
          'Interest income on note is excluded from estate; note paid at maturity.',
        ],
      );
    })(),

    // 5. Charitable strategy (CRT + remainder to charity)
    (() => {
      const charityAmount = Math.max(charitableGoal, grossEstate * 0.10);
      const removedFromEstate = fvGrow(charityAmount, r, n);
      const reducedFuture = Math.max(futureGross - removedFromEstate, 0);
      return buildStrategy(
        'charitable', reducedFuture, filingStatus,
        beneficiaries.filter((b) => b.relation !== 'charity'),
        [
          `Charitable gifting of ${fmt(charityAmount)} through CRAT/CRUT.`,
          'Income stream to grantor for term; estate-tax charitable deduction for remainder.',
        ],
      );
    })(),

    // 6. ILIT (Irrevocable Life Insurance Trust)
    (() => {
      const lifeInsurance = assets
        .filter((a) => a.category === 'insurance')
        .reduce((s, a) => s + a.value, 0);
      const ilit = lifeInsurance > 0 ? lifeInsurance : grossEstate * 0.10;
      // Insurance inside ILIT removes death benefit from estate
      const reducedFuture = Math.max(futureGross - ilit, 0);
      return buildStrategy(
        'ilit', reducedFuture, filingStatus, beneficiaries,
        [
          `ILIT holds ${fmt(ilit)} life insurance outside of estate.`,
          'Annual Crummey notices allow premium payments as annual exclusion gifts.',
          'Provides estate liquidity for heirs without increasing estate tax.',
        ],
      );
    })(),

    // 7. Combined optimal — GRAT + Annual gifts + ILIT
    (() => {
      const linealBens = beneficiaries.filter((b) => b.relation === 'lineal').length || 1;
      const annualGift = ANNUAL_GIFT_EXCLUSION * linealBens * (filingStatus === 'married' ? 2 : 1);
      const annualGiftFV = annualGift * ((Math.pow(1 + r, n) - 1) / r);
      const fundingAmount = grossEstate * 0.30;
      const annuityFactor = (1 - Math.pow(1 + afr, -5)) / afr;
      const annuity = fundingAmount / annuityFactor;
      const gratRemainder = Math.max(fvGrow(fundingAmount, r, 5) - annuity * 5, 0);
      const ilit = assets.filter((a) => a.category === 'insurance').reduce((s, a) => s + a.value, 0);
      const reducedFuture = Math.max(futureGross - annualGiftFV - gratRemainder - ilit, 0);
      return buildStrategy(
        'combined', reducedFuture, filingStatus, beneficiaries,
        [
          'Combination strategy: GRAT + annual gifting + ILIT.',
          `Annual gifts ${fmt(annualGift)}/yr · GRAT remainder ${fmt(gratRemainder)} · ILIT ${fmt(ilit)}.`,
        ],
      );
    })(),
  ];

  // sort by net-to-heirs descending
  strategies.sort((a, b) => b.netToHeirs - a.netToHeirs);

  // PA breakdown
  const baselineFedTax = federalTax(futureGross, filingStatus);
  const netAfterFed = futureGross - baselineFedTax;
  const paBreakdown = beneficiaries.map((b) => ({
    relation: b.name,
    share: b.sharePercent / 100,
    tax: netAfterFed * (b.sharePercent / 100) * (PA_RATES[b.relation] ?? PA_RATES.other),
  }));

  return {
    grossEstate,
    futureGrossEstate: futureGross,
    strategies,
    recommended: strategies[0],
    paBreakdown,
  };
}

// ---- builder helper -----------------------------------------------------

function buildStrategy(
  id: string,
  futureGross: number,
  filingStatus: 'single' | 'married',
  bens: BeneficiaryItem[],
  notes: string[],
): StrategyResult {
  const fedTax = federalTax(futureGross, filingStatus);
  const paTax  = paTotal(futureGross - fedTax, bens);
  const totalTax = fedTax + paTax;
  const netToHeirs = Math.max(futureGross - totalTax, 0);

  const NAMES: Record<string, string> = {
    'no-planning':  'No Planning (Baseline)',
    'annual-gift':  'Annual Exclusion Gifting',
    'lifetime-gift':'Lifetime Exemption Front-Loading',
    'grat':         'Zeroed-Out GRAT (5-Year)',
    'dynasty-idgt': 'Dynasty Trust / IDGT Installment Sale',
    'charitable':   'Charitable Strategy (CRT)',
    'ilit':         'ILIT — Insurance Outside Estate',
    'combined':     'Combined Optimal Strategy',
  };

  const DESCS: Record<string, string> = {
    'no-planning':   'No estate planning — full estate subject to federal and PA tax.',
    'annual-gift':   'Systematic annual exclusion gifts to lineal heirs.',
    'lifetime-gift': 'Front-load use of federal lifetime exemption to remove future appreciation.',
    'grat':          'Grantor Retained Annuity Trust structured to pass appreciation beyond §7520 rate.',
    'dynasty-idgt':  'Intentionally Defective Grantor Trust via installment sale at AFR; appreciation escapes estate.',
    'charitable':    'CRAT or CRUT provides income stream; charitable remainder reduces taxable estate.',
    'ilit':          'Irrevocable Life Insurance Trust — removes life insurance death benefit from estate.',
    'combined':      'Integrated strategy using GRAT, annual gifting, and ILIT simultaneously.',
  };

  return {
    strategyId: id,
    strategyName: NAMES[id] ?? id,
    description: DESCS[id] ?? '',
    futureGrossEstate: futureGross,
    federalTax: fedTax,
    paTax,
    totalTax,
    netToHeirs,
    taxSavingsVsBaseline: 0, // filled in by caller if baseline available
    wealthTransferred: netToHeirs,
    notes,
  };
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}
