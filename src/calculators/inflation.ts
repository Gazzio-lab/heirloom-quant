import { defineCalculator, num } from './_helpers';
import { fv, pv, realRate } from '../core/financial';

const CAT = 'inflation';

export const inflationCalculators = [
  defineCalculator({
    id: 'infl.futureCost',
    name: 'Future Cost of Today’s Dollars',
    category: CAT,
    description: 'Project today’s expense forward at an inflation rate.',
    inputs: [
      { name: 'amount', label: 'Today’s amount', type: 'currency', default: 100000, required: true },
      { name: 'inflation', label: 'Annual inflation (%)', type: 'percent', default: 3.0 },
      { name: 'years', label: 'Years', type: 'number', default: 20 },
    ],
    run: (i) => ({
      summary: {
        'Future Cost': fv(num(i.amount), num(i.inflation) / 100, num(i.years)),
        'Today’s Amount': num(i.amount),
      },
    }),
  }),

  defineCalculator({
    id: 'infl.purchasingPower',
    name: 'Erosion of Purchasing Power',
    category: CAT,
    description: 'How much $X today will be worth in N years at I% inflation.',
    inputs: [
      { name: 'amount', label: 'Amount today', type: 'currency', default: 100000, required: true },
      { name: 'inflation', label: 'Annual inflation (%)', type: 'percent', default: 3.0 },
      { name: 'years', label: 'Years', type: 'number', default: 20 },
    ],
    run: (i) => ({
      summary: {
        'Real Value in N Years': pv(num(i.amount), num(i.inflation) / 100, num(i.years)),
        'Loss of Purchasing Power': num(i.amount) - pv(num(i.amount), num(i.inflation) / 100, num(i.years)),
      },
    }),
  }),

  defineCalculator({
    id: 'infl.realReturn',
    name: 'Real (Inflation-Adjusted) Return',
    category: CAT,
    description: 'Fisher equation: real = (1+nom)/(1+infl) − 1.',
    inputs: [
      { name: 'nominal', label: 'Nominal return (%)', type: 'percent', default: 7 },
      { name: 'inflation', label: 'Inflation (%)', type: 'percent', default: 3 },
    ],
    run: (i) => ({
      summary: {
        'Real Return': realRate(num(i.nominal) / 100, num(i.inflation) / 100),
      },
    }),
  }),
];
