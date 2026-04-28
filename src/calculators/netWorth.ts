import { defineCalculator, num } from './_helpers';

const CAT = 'networth';

export const netWorthCalculators = [
  defineCalculator({
    id: 'nw.statement',
    name: 'Net Worth Statement',
    category: CAT,
    description: 'Quickly compute net worth from major asset and liability categories.',
    inputs: [
      { name: 'cash', label: 'Cash & equivalents', type: 'currency', default: 25000 },
      { name: 'taxable', label: 'Taxable investments', type: 'currency', default: 200000 },
      { name: 'retirement', label: 'Retirement accounts', type: 'currency', default: 350000 },
      { name: 'realEstate', label: 'Real estate', type: 'currency', default: 600000 },
      { name: 'other', label: 'Other assets', type: 'currency', default: 25000 },
      { name: 'mortgages', label: 'Mortgages', type: 'currency', default: 350000 },
      { name: 'consumerDebt', label: 'Consumer debt', type: 'currency', default: 8000 },
      { name: 'studentLoans', label: 'Student loans', type: 'currency', default: 0 },
      { name: 'otherDebt', label: 'Other debt', type: 'currency', default: 0 },
    ],
    run: (i) => {
      const assets = num(i.cash) + num(i.taxable) + num(i.retirement) + num(i.realEstate) + num(i.other);
      const liab = num(i.mortgages) + num(i.consumerDebt) + num(i.studentLoans) + num(i.otherDebt);
      const liquid = num(i.cash) + num(i.taxable);
      return {
        summary: {
          'Total Assets': assets,
          'Total Liabilities': liab,
          'Net Worth': assets - liab,
          'Liquidity Ratio (liquid/liab)': liab > 0 ? liquid / liab : Infinity,
        },
      };
    },
  }),
];
