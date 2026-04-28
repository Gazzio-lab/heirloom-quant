import { defineCalculator, num } from './_helpers';
import { pvAnnuity } from '../core/financial';

const CAT = 'insurance';

export const insuranceCalculators = [
  defineCalculator({
    id: 'ins.lifeNeeds',
    name: 'Life Insurance Needs (Income Replacement)',
    category: CAT,
    description: 'PV of survivor income needs minus existing assets — gives a target death benefit.',
    inputs: [
      { name: 'income', label: 'Annual income to replace', type: 'currency', default: 100000 },
      { name: 'years', label: 'Years to replace', type: 'number', default: 20 },
      { name: 'rate', label: 'Discount rate (%)', type: 'percent', default: 5,
        afrLinked: { term: 'long', compounding: 'annual' } },
      { name: 'finalExpenses', label: 'Final expenses & debts', type: 'currency', default: 50000 },
      { name: 'existingAssets', label: 'Existing assets', type: 'currency', default: 200000 },
    ],
    run: (i) => {
      const need = pvAnnuity(num(i.income), num(i.rate) / 100, num(i.years));
      const total = need + num(i.finalExpenses) - num(i.existingAssets);
      return {
        summary: {
          'PV of Income Replacement': need,
          'Final Expenses': num(i.finalExpenses),
          'Existing Assets': num(i.existingAssets),
          'Recommended Coverage': Math.max(total, 0),
        },
      };
    },
  }),

  defineCalculator({
    id: 'ins.humanCapital',
    name: 'Human Life Value',
    category: CAT,
    description: 'Discounted value of remaining lifetime earnings.',
    inputs: [
      { name: 'income', label: 'Current income', type: 'currency', default: 120000 },
      { name: 'growth', label: 'Earnings growth (%)', type: 'percent', default: 3 },
      { name: 'discount', label: 'Discount rate (%)', type: 'percent', default: 5,
        afrLinked: { term: 'long', compounding: 'annual' } },
      { name: 'yearsToRetire', label: 'Years to retirement', type: 'number', default: 30 },
    ],
    run: (i) => {
      const r = num(i.discount) / 100;
      const g = num(i.growth) / 100;
      const yrs = num(i.yearsToRetire);
      // Growing annuity formula
      const c = num(i.income);
      const value =
        Math.abs(r - g) < 1e-9
          ? c * yrs
          : (c / (r - g)) * (1 - Math.pow((1 + g) / (1 + r), yrs));
      return { summary: { 'Human Life Value': value } };
    },
  }),

  defineCalculator({
    id: 'ins.disability',
    name: 'Disability Income Need',
    category: CAT,
    description: 'Difference between essential expenses and projected disability benefits.',
    inputs: [
      { name: 'expenses', label: 'Monthly essential expenses', type: 'currency', default: 7500 },
      { name: 'ssdi', label: 'Estimated SSDI / monthly benefit', type: 'currency', default: 2500 },
      { name: 'employerLTD', label: 'Employer LTD monthly benefit', type: 'currency', default: 2000 },
    ],
    run: (i) => {
      const gap = num(i.expenses) - num(i.ssdi) - num(i.employerLTD);
      return {
        summary: {
          'Monthly Coverage Gap': Math.max(gap, 0),
          'Annual Gap': Math.max(gap * 12, 0),
        },
      };
    },
  }),
];
