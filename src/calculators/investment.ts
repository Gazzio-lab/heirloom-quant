import { defineCalculator, num } from './_helpers';
import { irr, npv, cagr, mirr, fv, fvAnnuity, ruleOf72 } from '../core/financial';

const CAT = 'investment';

export const investmentCalculators = [
  defineCalculator({
    id: 'inv.irr',
    name: 'Internal Rate of Return (IRR)',
    category: CAT,
    description: 'Computes the IRR of a series of cashflows. Enter cashflows separated by commas, with the t=0 cashflow first.',
    inputs: [
      { name: 'cashflows', label: 'Cashflows (comma-separated)', type: 'text', default: '-100000, 25000, 30000, 40000, 50000', required: true },
      { name: 'guess', label: 'Initial guess (%)', type: 'percent', default: 10 },
    ],
    run: (i) => {
      const cf = String(i.cashflows ?? '').split(',').map(s => num(s.trim()));
      const guess = num(i.guess, 10) / 100;
      const r = irr(cf, guess);
      return {
        summary: {
          'IRR': r,
          'Number of Periods': cf.length - 1,
          'Total Inflow': cf.filter(c => c > 0).reduce((a, b) => a + b, 0),
          'Total Outflow': cf.filter(c => c < 0).reduce((a, b) => a + b, 0),
        },
        notes: ['IRR assumes equal-length periods between cashflows.'],
      };
    },
  }),

  defineCalculator({
    id: 'inv.npv',
    name: 'Net Present Value (NPV)',
    category: CAT,
    description: 'Discounts a series of cashflows at a given rate.',
    inputs: [
      { name: 'rate', label: 'Discount rate (%)', type: 'percent', default: 8, required: true,
        afrLinked: { term: 'mid', compounding: 'annual' } },
      { name: 'cashflows', label: 'Cashflows (comma-separated)', type: 'text', default: '-100000, 25000, 30000, 40000, 50000', required: true },
    ],
    run: (i) => {
      const r = num(i.rate) / 100;
      const cf = String(i.cashflows ?? '').split(',').map(s => num(s.trim()));
      return {
        summary: {
          'NPV': npv(r, cf),
          'Discount Rate': r,
          'Periods': cf.length - 1,
        },
      };
    },
  }),

  defineCalculator({
    id: 'inv.mirr',
    name: 'Modified IRR (MIRR)',
    category: CAT,
    description: 'IRR adjusted for differing reinvestment vs. financing rates.',
    inputs: [
      { name: 'cashflows', label: 'Cashflows (comma-separated)', type: 'text', default: '-120000, 39000, 30000, 21000, 37000, 46000', required: true },
      { name: 'financeRate', label: 'Finance rate (%)', type: 'percent', default: 6,
        afrLinked: { term: 'short', compounding: 'annual' } },
      { name: 'reinvestRate', label: 'Reinvest rate (%)', type: 'percent', default: 8,
        afrLinked: { term: 'long', compounding: 'annual' } },
    ],
    run: (i) => {
      const cf = String(i.cashflows ?? '').split(',').map(s => num(s.trim()));
      const r = mirr(cf, num(i.financeRate) / 100, num(i.reinvestRate) / 100);
      return { summary: { 'MIRR': r } };
    },
  }),

  defineCalculator({
    id: 'inv.cagr',
    name: 'Compound Annual Growth Rate',
    category: CAT,
    description: 'CAGR between a beginning and ending value over N years.',
    inputs: [
      { name: 'beginValue', label: 'Beginning value', type: 'currency', default: 100000, required: true },
      { name: 'endValue', label: 'Ending value', type: 'currency', default: 250000, required: true },
      { name: 'years', label: 'Years', type: 'number', default: 10, required: true },
    ],
    run: (i) => ({
      summary: {
        'CAGR': cagr(num(i.beginValue), num(i.endValue), num(i.years)),
        'Years to Double (Rule of 72)': ruleOf72(cagr(num(i.beginValue), num(i.endValue), num(i.years))),
      },
    }),
  }),

  defineCalculator({
    id: 'inv.growth',
    name: 'Investment Growth Projection',
    category: CAT,
    description: 'Project an account balance with regular contributions over time.',
    inputs: [
      { name: 'initial', label: 'Initial deposit', type: 'currency', default: 10000 },
      { name: 'contribution', label: 'Annual contribution', type: 'currency', default: 6000 },
      { name: 'rate', label: 'Expected return (%)', type: 'percent', default: 7 },
      { name: 'years', label: 'Years', type: 'number', default: 25 },
    ],
    run: (i) => {
      const r = num(i.rate) / 100;
      const yrs = num(i.years);
      const initial = num(i.initial);
      const contribution = num(i.contribution);
      const schedule: Array<Record<string, number>> = [];
      let bal = initial;
      for (let y = 1; y <= yrs; y++) {
        bal = bal * (1 + r) + contribution;
        schedule.push({ year: y, balance: bal, contributed: initial + contribution * y });
      }
      const lump = fv(initial, r, yrs);
      const fromContrib = fvAnnuity(contribution, r, yrs);
      return {
        summary: {
          'Future Value': lump + fromContrib,
          'From Initial': lump,
          'From Contributions': fromContrib,
          'Total Contributed': initial + contribution * yrs,
        },
        schedule,
      };
    },
  }),

  defineCalculator({
    id: 'inv.holdingReturn',
    name: 'Holding Period Return',
    category: CAT,
    description: 'Total return from purchase price to sale price including dividends.',
    inputs: [
      { name: 'buy', label: 'Purchase price', type: 'currency', default: 100 },
      { name: 'sell', label: 'Sale price', type: 'currency', default: 120 },
      { name: 'income', label: 'Cash income received', type: 'currency', default: 4 },
    ],
    run: (i) => {
      const buy = num(i.buy);
      const sell = num(i.sell);
      const income = num(i.income);
      const r = buy > 0 ? (sell - buy + income) / buy : NaN;
      return { summary: { 'HPR': r, 'Capital Gain': sell - buy, 'Income': income } };
    },
  }),
];
