import { defineCalculator, num } from './_helpers';
import { pmt } from '../core/financial';

const CAT = 'techniques';

export const techniquesCalculators = [
  defineCalculator({
    id: 'tec.tools',
    name: 'Tools of Estate Planning – Wealth Transfer Comparison',
    category: CAT,
    description: 'Compare net wealth transferred to heirs across outright gift, GRAT, IDGT sale, and "do nothing".',
    inputs: [
      { name: 'principal', label: 'Asset value', type: 'currency', default: 5_000_000 },
      { name: 'years', label: 'Hold period (years)', type: 'number', default: 15 },
      { name: 'expectedReturn', label: 'Expected return (%)', type: 'percent', default: 8 },
      { name: 'estateTaxRate', label: 'Estate tax rate (%)', type: 'percent', default: 40 },
      { name: 'noteRate', label: 'IDGT note rate (%)', type: 'percent', default: 4.4,
        afrLinked: { term: 'mid', compounding: 'annual' } },
    ],
    run: (i) => {
      const p = num(i.principal);
      const yrs = num(i.years);
      const er = num(i.expectedReturn) / 100;
      const t = num(i.estateTaxRate) / 100;
      const fv = p * Math.pow(1 + er, yrs);
      const doNothing = fv * (1 - t);
      const outrightGift = fv; // assume gift used exemption, no tax
      // GRAT: assume zeroed-out 5-yr; remainder approximated as alpha*(er-§7520)
      const grat = fv * 0.7; // simplified illustrative
      // IDGT: principal sold for note at noteRate, asset grows at er, note paid back
      const idgt = fv - p * Math.pow(1 + num(i.noteRate) / 100, yrs);
      return {
        summary: {
          'Do Nothing (after estate tax)': doNothing,
          'Outright Gift': outrightGift,
          'Zeroed-Out GRAT (illustrative)': Math.max(grat, 0),
          'IDGT Sale': Math.max(idgt, 0),
        },
        notes: ['Illustrative comparison; actual results depend on §7520 rate, term, and exemption usage.'],
      };
    },
  }),

  defineCalculator({
    id: 'tec.scin',
    name: 'SCIN (Self-Cancelling Installment Note)',
    category: CAT,
    description: 'Compute a SCIN payment with a mortality risk premium.',
    inputs: [
      { name: 'principal', label: 'Sale price', type: 'currency', default: 5_000_000 },
      { name: 'rate', label: 'Base rate (%)', type: 'percent', default: 4.4,
        afrLinked: { term: 'mid', compounding: 'annual' } },
      { name: 'mortalityRisk', label: 'Mortality risk premium (%)', type: 'percent', default: 1.5 },
      { name: 'years', label: 'Term (years)', type: 'number', default: 9 },
    ],
    run: (i) => {
      const r = (num(i.rate) + num(i.mortalityRisk)) / 100;
      const yrs = num(i.years);
      const annual = -pmt(r, yrs, num(i.principal));
      return {
        summary: {
          'Adjusted SCIN Rate': r,
          'Annual Payment': annual,
          'Total Payments': annual * yrs,
        },
      };
    },
  }),

  defineCalculator({
    id: 'tec.flpDiscount',
    name: 'FLP / LLC Valuation Discount',
    category: CAT,
    description: 'Apply lack-of-control & lack-of-marketability discounts to a transferred interest.',
    inputs: [
      { name: 'value', label: 'Pro-rata value', type: 'currency', default: 1_000_000 },
      { name: 'locDiscount', label: 'Lack of control (%)', type: 'percent', default: 15 },
      { name: 'lomDiscount', label: 'Lack of marketability (%)', type: 'percent', default: 25 },
    ],
    run: (i) => {
      const combined = 1 - (1 - num(i.locDiscount) / 100) * (1 - num(i.lomDiscount) / 100);
      const discounted = num(i.value) * (1 - combined);
      return {
        summary: {
          'Combined Discount': combined,
          'Discounted Value': discounted,
        },
      };
    },
  }),
];
