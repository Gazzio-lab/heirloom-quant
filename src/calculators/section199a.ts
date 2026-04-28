import { defineCalculator, num } from './_helpers';
import { QBI_THRESHOLDS_2024 } from '../data/taxBrackets2024';

const CAT = 'section199a';

export const section199ACalculators = [
  defineCalculator({
    id: 'qbi.deduction',
    name: 'QBI Deduction (Section 199A)',
    category: CAT,
    description:
      'Compute tentative QBI deduction including SSTB phase-in, W-2 wage cap, and overall taxable-income limit.',
    inputs: [
      { name: 'filingStatus', label: 'Filing status', type: 'select', default: 'marriedFilingJointly', options: [
        { value: 'single', label: 'Single' },
        { value: 'marriedFilingJointly', label: 'Married Filing Jointly' },
      ] },
      { name: 'qbi', label: 'Qualified Business Income', type: 'currency', default: 300000 },
      { name: 'wages', label: 'W-2 wages of business', type: 'currency', default: 80000 },
      { name: 'ubia', label: 'UBIA of qualified property', type: 'currency', default: 200000 },
      { name: 'taxableIncome', label: 'Pre-deduction taxable income', type: 'currency', default: 450000 },
      { name: 'isSSTB', label: 'SSTB? (1=yes)', type: 'integer', default: 0 },
    ],
    run: (i) => {
      const fs = String(i.filingStatus) as 'single' | 'marriedFilingJointly';
      const t = QBI_THRESHOLDS_2024[fs];
      const ti = num(i.taxableIncome);
      const qbi = num(i.qbi);
      const wages = num(i.wages);
      const ubia = num(i.ubia);
      const isSSTB = num(i.isSSTB) === 1;

      const phaseRange = t.phaseInEnd - t.phaseInStart;
      let ratio = 0;
      if (ti <= t.phaseInStart) ratio = 0;
      else if (ti >= t.phaseInEnd) ratio = 1;
      else ratio = (ti - t.phaseInStart) / phaseRange;

      // SSTB above phase-in -> 0
      if (isSSTB && ti >= t.phaseInEnd) {
        const summary: Record<string, number | string> = {
          'QBI Deduction': 0,
          'Reason': 'SSTB fully phased out',
        };
        return { summary };
      }

      // Tentative deduction = 20% of QBI
      const baseDeduction = 0.20 * (isSSTB ? qbi * (1 - ratio) : qbi);

      // W-2 / UBIA limit: greater of 50% wages, or 25% wages + 2.5% UBIA
      const wagesLimit = Math.max(0.50 * wages, 0.25 * wages + 0.025 * ubia);

      // Limitation phase-in: below threshold = no limit; above = full; in between = blend
      let deductionAfterLimit: number;
      if (ti <= t.phaseInStart) {
        deductionAfterLimit = baseDeduction;
      } else if (ti >= t.phaseInEnd) {
        deductionAfterLimit = Math.min(baseDeduction, wagesLimit);
      } else {
        // partial: reduce baseDeduction by ratio*(baseDeduction - wagesLimit) if base > limit
        const excess = Math.max(0, baseDeduction - wagesLimit);
        deductionAfterLimit = baseDeduction - excess * ratio;
      }

      // Overall taxable-income limit: 20% of (taxable income − net capital gains)
      const overallCap = 0.20 * ti;
      const final = Math.max(0, Math.min(deductionAfterLimit, overallCap));

      return {
        summary: {
          'Tentative 20% QBI': baseDeduction,
          'W-2/UBIA Limit': wagesLimit,
          'Overall TI Limit (20%×TI)': overallCap,
          'Final §199A Deduction': final,
          'Phase-in Ratio': ratio,
        },
      };
    },
  }),
];
