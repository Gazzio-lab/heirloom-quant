import type { TaxBracket } from '../core/tax';

/**
 * 2024 IRS Federal Income Tax Brackets (ordinary income).
 * Source: Rev. Proc. 2023-34. Update annually.
 */
export const FED_BRACKETS_2024: Record<string, TaxBracket[]> = {
  single: [
    { min: 0,        max: 11_600,    rate: 0.10 },
    { min: 11_600,   max: 47_150,    rate: 0.12 },
    { min: 47_150,   max: 100_525,   rate: 0.22 },
    { min: 100_525,  max: 191_950,   rate: 0.24 },
    { min: 191_950,  max: 243_725,   rate: 0.32 },
    { min: 243_725,  max: 609_350,   rate: 0.35 },
    { min: 609_350,  max: Infinity,  rate: 0.37 },
  ],
  marriedFilingJointly: [
    { min: 0,        max: 23_200,    rate: 0.10 },
    { min: 23_200,   max: 94_300,    rate: 0.12 },
    { min: 94_300,   max: 201_050,   rate: 0.22 },
    { min: 201_050,  max: 383_900,   rate: 0.24 },
    { min: 383_900,  max: 487_450,   rate: 0.32 },
    { min: 487_450,  max: 731_200,   rate: 0.35 },
    { min: 731_200,  max: Infinity,  rate: 0.37 },
  ],
  marriedFilingSeparately: [
    { min: 0,        max: 11_600,    rate: 0.10 },
    { min: 11_600,   max: 47_150,    rate: 0.12 },
    { min: 47_150,   max: 100_525,   rate: 0.22 },
    { min: 100_525,  max: 191_950,   rate: 0.24 },
    { min: 191_950,  max: 243_725,   rate: 0.32 },
    { min: 243_725,  max: 365_600,   rate: 0.35 },
    { min: 365_600,  max: Infinity,  rate: 0.37 },
  ],
  headOfHousehold: [
    { min: 0,        max: 16_550,    rate: 0.10 },
    { min: 16_550,   max: 63_100,    rate: 0.12 },
    { min: 63_100,   max: 100_500,   rate: 0.22 },
    { min: 100_500,  max: 191_950,   rate: 0.24 },
    { min: 191_950,  max: 243_700,   rate: 0.32 },
    { min: 243_700,  max: 609_350,   rate: 0.35 },
    { min: 609_350,  max: Infinity,  rate: 0.37 },
  ],
};

export const STANDARD_DEDUCTION_2024 = {
  single: 14_600,
  marriedFilingJointly: 29_200,
  marriedFilingSeparately: 14_600,
  headOfHousehold: 21_900,
};

/** 2024 LTCG / Qualified-dividends thresholds. */
export const LTCG_BRACKETS_2024 = {
  single:                 [{ to: 47_025, rate: 0 }, { to: 518_900, rate: 0.15 }, { to: Infinity, rate: 0.20 }],
  marriedFilingJointly:   [{ to: 94_050, rate: 0 }, { to: 583_750, rate: 0.15 }, { to: Infinity, rate: 0.20 }],
  marriedFilingSeparately:[{ to: 47_025, rate: 0 }, { to: 291_850, rate: 0.15 }, { to: Infinity, rate: 0.20 }],
  headOfHousehold:        [{ to: 63_000, rate: 0 }, { to: 551_350, rate: 0.15 }, { to: Infinity, rate: 0.20 }],
};

/** Social Security & Medicare 2024. */
export const FICA_2024 = {
  ssWageBase: 168_600,
  ssRateEmployee: 0.062,
  medicareRate: 0.0145,
  additionalMedicareThreshold: 200_000, // single (250k MFJ)
  additionalMedicareRate: 0.009,
};

/** Estate / gift exemptions and rates. */
export const ESTATE_2024 = {
  /** Federal applicable exclusion. */
  exemption: 13_610_000,
  /** Annual gift exclusion. */
  annualGiftExclusion: 18_000,
  /** Top federal estate tax rate above the exemption. */
  topRate: 0.40,
};

/** Section 199A QBI deduction thresholds (2024). */
export const QBI_THRESHOLDS_2024 = {
  single: { phaseInStart: 191_950, phaseInEnd: 241_950 },
  marriedFilingJointly: { phaseInStart: 383_900, phaseInEnd: 483_900 },
};

export const FILING_STATUSES = [
  { value: 'single', label: 'Single' },
  { value: 'marriedFilingJointly', label: 'Married Filing Jointly' },
  { value: 'marriedFilingSeparately', label: 'Married Filing Separately' },
  { value: 'headOfHousehold', label: 'Head of Household' },
] as const;

export type FilingStatus = typeof FILING_STATUSES[number]['value'];
