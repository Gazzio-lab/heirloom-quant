import { defineCalculator, num } from './_helpers';
import { npv } from '../core/financial';

const CAT = 'valuation';

export const valuationCalculators = [
  defineCalculator({
    id: 'val.dcf',
    name: 'Discounted Cash Flow (DCF)',
    category: CAT,
    description: 'Two-stage DCF: explicit FCFs plus a Gordon-growth terminal value.',
    inputs: [
      { name: 'fcfs', label: 'Projected FCFs (comma-separated)', type: 'text', default: '1000000, 1100000, 1200000, 1300000, 1450000' },
      { name: 'wacc', label: 'WACC (%)', type: 'percent', default: 10 },
      { name: 'terminalGrowth', label: 'Terminal growth (%)', type: 'percent', default: 2.5 },
      { name: 'netDebt', label: 'Net debt', type: 'currency', default: 0 },
      { name: 'shares', label: 'Shares outstanding', type: 'number', default: 0 },
    ],
    run: (i) => {
      const fcfs = String(i.fcfs ?? '').split(',').map(s => num(s.trim()));
      const w = num(i.wacc) / 100;
      const g = num(i.terminalGrowth) / 100;
      const last = fcfs[fcfs.length - 1] ?? 0;
      const tv = w > g ? (last * (1 + g)) / (w - g) : NaN;
      // discount FCFs (years 1..N) plus terminal at year N
      const cf = [0, ...fcfs];
      const pvOps = npv(w, cf);
      const pvTV = Number.isFinite(tv) ? tv / Math.pow(1 + w, fcfs.length) : NaN;
      const ev = pvOps + (Number.isFinite(pvTV) ? pvTV : 0);
      const equity = ev - num(i.netDebt);
      const perShare = num(i.shares) > 0 ? equity / num(i.shares) : NaN;
      return {
        summary: {
          'PV of Explicit FCFs': pvOps,
          'PV of Terminal Value': pvTV,
          'Enterprise Value': ev,
          'Equity Value': equity,
          'Per Share': perShare,
        },
      };
    },
  }),

  defineCalculator({
    id: 'val.gordonGrowth',
    name: 'Gordon Growth (Single-Stage DDM)',
    category: CAT,
    description: 'Value = Dividend1 / (r − g).',
    inputs: [
      { name: 'div', label: 'Next dividend (D1)', type: 'currency', default: 4 },
      { name: 'r', label: 'Required return (%)', type: 'percent', default: 9 },
      { name: 'g', label: 'Growth rate (%)', type: 'percent', default: 4 },
    ],
    run: (i) => {
      const r = num(i.r) / 100;
      const g = num(i.g) / 100;
      const value = r > g ? num(i.div) / (r - g) : NaN;
      return { summary: { 'Intrinsic Value': value } };
    },
  }),

  defineCalculator({
    id: 'val.multiples',
    name: 'Comparable-Company Valuation',
    category: CAT,
    description: 'Apply an EV/EBITDA multiple to compute enterprise & equity value.',
    inputs: [
      { name: 'ebitda', label: 'EBITDA', type: 'currency', default: 5_000_000 },
      { name: 'multiple', label: 'EV / EBITDA multiple', type: 'number', default: 8 },
      { name: 'netDebt', label: 'Net debt', type: 'currency', default: 1_000_000 },
    ],
    run: (i) => {
      const ev = num(i.ebitda) * num(i.multiple);
      return {
        summary: {
          'Enterprise Value': ev,
          'Equity Value': ev - num(i.netDebt),
        },
      };
    },
  }),
];
