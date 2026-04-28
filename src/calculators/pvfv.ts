import { defineCalculator, num } from './_helpers';
import { fv, pv, pvAnnuity, fvAnnuity, pmt, effectiveRate, continuousEAR } from '../core/financial';

const CAT = 'pvfv';

export const pvfvCalculators = [
  defineCalculator({
    id: 'pvfv.fv',
    name: 'Future Value (Lump Sum)',
    category: CAT,
    description: 'FV = PV × (1 + r)^n.',
    inputs: [
      { name: 'pv', label: 'Present value', type: 'currency', default: 10000 },
      { name: 'rate', label: 'Rate (%)', type: 'percent', default: 6,
        afrLinked: { term: 'long', compounding: 'annual' } },
      { name: 'years', label: 'Years', type: 'number', default: 20 },
    ],
    run: (i) => ({ summary: { 'Future Value': fv(num(i.pv), num(i.rate) / 100, num(i.years)) } }),
  }),
  defineCalculator({
    id: 'pvfv.pv',
    name: 'Present Value (Lump Sum)',
    category: CAT,
    description: 'PV = FV / (1 + r)^n.',
    inputs: [
      { name: 'fv', label: 'Future value', type: 'currency', default: 100000 },
      { name: 'rate', label: 'Rate (%)', type: 'percent', default: 6,
        afrLinked: { term: 'long', compounding: 'annual' } },
      { name: 'years', label: 'Years', type: 'number', default: 20 },
    ],
    run: (i) => ({ summary: { 'Present Value': pv(num(i.fv), num(i.rate) / 100, num(i.years)) } }),
  }),
  defineCalculator({
    id: 'pvfv.pvAnnuity',
    name: 'Present Value of Annuity',
    category: CAT,
    description: 'PV of equal periodic payments.',
    inputs: [
      { name: 'pmt', label: 'Payment', type: 'currency', default: 12000 },
      { name: 'rate', label: 'Rate per period (%)', type: 'percent', default: 5,
        afrLinked: { term: 'mid', compounding: 'monthly' } },
      { name: 'periods', label: 'Periods', type: 'number', default: 20 },
      { name: 'due', label: 'Annuity due? (1=yes)', type: 'integer', default: 0 },
    ],
    run: (i) => ({
      summary: { 'PV of Annuity': pvAnnuity(num(i.pmt), num(i.rate) / 100, num(i.periods), num(i.due) === 1) },
    }),
  }),
  defineCalculator({
    id: 'pvfv.fvAnnuity',
    name: 'Future Value of Annuity',
    category: CAT,
    description: 'FV of equal periodic payments.',
    inputs: [
      { name: 'pmt', label: 'Payment', type: 'currency', default: 12000 },
      { name: 'rate', label: 'Rate per period (%)', type: 'percent', default: 5,
        afrLinked: { term: 'mid', compounding: 'monthly' } },
      { name: 'periods', label: 'Periods', type: 'number', default: 20 },
      { name: 'due', label: 'Annuity due? (1=yes)', type: 'integer', default: 0 },
    ],
    run: (i) => ({
      summary: { 'FV of Annuity': fvAnnuity(num(i.pmt), num(i.rate) / 100, num(i.periods), num(i.due) === 1) },
    }),
  }),
  defineCalculator({
    id: 'pvfv.solveRate',
    name: 'Solve for Rate (Excel RATE)',
    category: CAT,
    description: 'Solve for the per-period rate that makes the PV/FV equation balance.',
    inputs: [
      { name: 'periods', label: 'Periods', type: 'number', default: 30 },
      { name: 'pmt', label: 'Payment', type: 'currency', default: -2000 },
      { name: 'pv', label: 'PV', type: 'currency', default: 50000 },
      { name: 'fv', label: 'FV', type: 'currency', default: 0 },
    ],
    run: (i) => {
      // Newton-Raphson on f(r) = pv*(1+r)^n + pmt*((1+r)^n - 1)/r + fv
      const n = num(i.periods);
      const p = num(i.pmt);
      const pvI = num(i.pv);
      const fvI = num(i.fv);
      const f = (r: number) => {
        if (Math.abs(r) < 1e-12) return pvI + p * n + fvI;
        const a = Math.pow(1 + r, n);
        return pvI * a + p * ((a - 1) / r) + fvI;
      };
      let r = 0.05;
      for (let k = 0; k < 100; k++) {
        const dr = 1e-6;
        const slope = (f(r + dr) - f(r - dr)) / (2 * dr);
        if (Math.abs(slope) < 1e-12) break;
        const next = r - f(r) / slope;
        if (!Number.isFinite(next)) break;
        if (Math.abs(next - r) < 1e-10) {
          r = next;
          break;
        }
        r = next;
      }
      return { summary: { 'Rate per Period': r, 'Annual (×12)': r * 12 } };
    },
  }),
  defineCalculator({
    id: 'pvfv.compounding',
    name: 'Compounding Comparison',
    category: CAT,
    description: 'Effective rate at various compounding frequencies.',
    inputs: [
      { name: 'nominal', label: 'Nominal rate (%)', type: 'percent', default: 8,
        afrLinked: { term: 'mid', compounding: 'annual' } },
    ],
    run: (i) => {
      const n = num(i.nominal) / 100;
      return {
        summary: {
          'Annual': effectiveRate(n, 1),
          'Semi-annual': effectiveRate(n, 2),
          'Quarterly': effectiveRate(n, 4),
          'Monthly': effectiveRate(n, 12),
          'Daily (365)': effectiveRate(n, 365),
          'Continuous': continuousEAR(n),
        },
      };
    },
  }),
];
