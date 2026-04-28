import { defineCalculator, num } from './_helpers';
import { applyBrackets, ficaTax } from '../core/tax';
import {
  FED_BRACKETS_2024, STANDARD_DEDUCTION_2024,
  LTCG_BRACKETS_2024, FILING_STATUSES, FICA_2024,
} from '../data/taxBrackets2024';

const CAT = 'taxes';

const filingStatusOptions = FILING_STATUSES.map(s => ({ value: s.value, label: s.label }));

export const taxesCalculators = [
  defineCalculator({
    id: 'tax.federal',
    name: 'Federal Income Tax (2024)',
    category: CAT,
    description: 'Estimate federal tax using 2024 brackets and the standard deduction.',
    inputs: [
      { name: 'filingStatus', label: 'Filing status', type: 'select', options: filingStatusOptions, default: 'marriedFilingJointly' },
      { name: 'wages', label: 'Wages / salary', type: 'currency', default: 250000 },
      { name: 'otherIncome', label: 'Other ordinary income', type: 'currency', default: 0 },
      { name: 'aboveLineDeductions', label: 'Above-line deductions', type: 'currency', default: 0 },
      { name: 'itemizedDeductions', label: 'Itemized deductions (0 = std)', type: 'currency', default: 0 },
    ],
    run: (i) => {
      const fs = String(i.filingStatus) as keyof typeof FED_BRACKETS_2024;
      const brackets = FED_BRACKETS_2024[fs] ?? FED_BRACKETS_2024.single;
      const std = STANDARD_DEDUCTION_2024[fs as keyof typeof STANDARD_DEDUCTION_2024] ?? 14600;
      const agi = num(i.wages) + num(i.otherIncome) - num(i.aboveLineDeductions);
      const deduction = Math.max(num(i.itemizedDeductions), std);
      const taxable = Math.max(agi - deduction, 0);
      const result = applyBrackets(taxable, brackets);
      return {
        summary: {
          'AGI': agi,
          'Deduction Used': deduction,
          'Taxable Income': taxable,
          'Federal Income Tax': result.tax,
          'Effective Rate': result.effectiveRate,
          'Marginal Rate': result.marginalRate,
        },
        schedule: result.byBracket.map(b => ({
          bracket: `${b.min.toLocaleString()} – ${b.max === Infinity ? '∞' : b.max.toLocaleString()}`,
          rate: b.rate,
          taxedAmount: b.taxedAmount,
          tax: b.taxFromBracket,
        })),
      };
    },
  }),

  defineCalculator({
    id: 'tax.ltcg',
    name: 'LTCG / Qualified Dividends',
    category: CAT,
    description: 'Long-term capital gains tax using the 0/15/20% schedule plus 3.8% NIIT optional.',
    inputs: [
      { name: 'filingStatus', label: 'Filing status', type: 'select', options: filingStatusOptions, default: 'marriedFilingJointly' },
      { name: 'ordinaryIncome', label: 'Ordinary taxable income', type: 'currency', default: 200000 },
      { name: 'ltcg', label: 'LTCG / Qualified divs', type: 'currency', default: 100000 },
      { name: 'niit', label: 'Apply 3.8% NIIT? (1=yes)', type: 'integer', default: 1 },
    ],
    run: (i) => {
      const fs = String(i.filingStatus) as keyof typeof LTCG_BRACKETS_2024;
      const tiers = LTCG_BRACKETS_2024[fs];
      const ord = num(i.ordinaryIncome);
      let remaining = num(i.ltcg);
      let cursor = ord;
      let tax = 0;
      for (const tier of tiers) {
        if (remaining <= 0) break;
        const room = tier.to - cursor;
        if (room <= 0) continue;
        const slice = Math.min(remaining, room);
        tax += slice * tier.rate;
        cursor += slice;
        remaining -= slice;
      }
      const niit = num(i.niit) === 1 ? num(i.ltcg) * 0.038 : 0;
      return {
        summary: {
          'LTCG Tax': tax,
          'NIIT': niit,
          'Total Tax on LTCG': tax + niit,
        },
      };
    },
  }),

  defineCalculator({
    id: 'tax.fica',
    name: 'FICA & Medicare',
    category: CAT,
    description: 'Employee SS + Medicare withholding (incl. 0.9% additional Medicare).',
    inputs: [
      { name: 'wages', label: 'Wages', type: 'currency', default: 250000 },
      { name: 'addlThreshold', label: 'Additional Medicare threshold', type: 'currency', default: FICA_2024.additionalMedicareThreshold },
    ],
    run: (i) => {
      const w = num(i.wages);
      const baseFICA = ficaTax(w, FICA_2024.ssWageBase, FICA_2024.ssRateEmployee, FICA_2024.medicareRate);
      const addl = Math.max(0, w - num(i.addlThreshold)) * FICA_2024.additionalMedicareRate;
      return {
        summary: {
          'SS + Medicare': baseFICA,
          'Additional Medicare (0.9%)': addl,
          'Total FICA': baseFICA + addl,
        },
      };
    },
  }),

  defineCalculator({
    id: 'tax.afterTax',
    name: 'After-Tax Yield Conversion',
    category: CAT,
    description: 'Convert pre-tax to after-tax yield (and vice versa) given a marginal rate.',
    inputs: [
      { name: 'yieldPct', label: 'Pre-tax yield (%)', type: 'percent', default: 5 },
      { name: 'marginal', label: 'Marginal tax rate (%)', type: 'percent', default: 32 },
    ],
    run: (i) => {
      const y = num(i.yieldPct) / 100;
      const t = num(i.marginal) / 100;
      return {
        summary: {
          'After-Tax Yield': y * (1 - t),
          'Tax-Equivalent Yield (muni)': y / (1 - t),
        },
      };
    },
  }),
];
