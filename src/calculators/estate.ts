import { defineCalculator, num } from './_helpers';
import { ESTATE_2024 } from '../data/taxBrackets2024';

const CAT = 'estate';

export const estateCalculators = [
  defineCalculator({
    id: 'est.federalTax',
    name: 'Federal Estate Tax Estimate',
    category: CAT,
    description: 'Quick estimate of federal estate tax based on the 2024 unified credit and 40% top rate.',
    inputs: [
      { name: 'grossEstate', label: 'Gross estate', type: 'currency', default: 20_000_000 },
      { name: 'deductions', label: 'Deductions (debts, charity, marital)', type: 'currency', default: 0 },
      { name: 'priorTaxableGifts', label: 'Prior taxable gifts', type: 'currency', default: 0 },
      { name: 'exemption', label: 'Federal exemption (override)', type: 'currency', default: ESTATE_2024.exemption },
      { name: 'topRate', label: 'Top rate (%)', type: 'percent', default: ESTATE_2024.topRate * 100 },
    ],
    run: (i) => {
      const taxable = Math.max(num(i.grossEstate) - num(i.deductions), 0);
      const cumulative = taxable + num(i.priorTaxableGifts);
      const overExemption = Math.max(cumulative - num(i.exemption), 0);
      const tax = overExemption * (num(i.topRate) / 100);
      return {
        summary: {
          'Taxable Estate': taxable,
          'Cumulative Transfers': cumulative,
          'Over Exemption': overExemption,
          'Estimated Federal Tax': tax,
          'Net to Heirs': taxable - tax,
        },
        notes: [
          'Highly simplified: assumes top marginal rate applies on entire excess.',
          'Excludes state estate/inheritance tax, GST, and §2010(c) DSUE portability adjustments.',
        ],
      };
    },
  }),

  defineCalculator({
    id: 'est.grossEstate',
    name: 'Gross Estate Worksheet',
    category: CAT,
    description: 'Build up a gross estate from major asset categories.',
    inputs: [
      { name: 'realEstate', label: 'Real estate', type: 'currency', default: 1_500_000 },
      { name: 'investments', label: 'Investments (taxable)', type: 'currency', default: 4_000_000 },
      { name: 'retirement', label: 'Retirement accounts', type: 'currency', default: 2_000_000 },
      { name: 'business', label: 'Business interests', type: 'currency', default: 5_000_000 },
      { name: 'lifeIns', label: 'Life insurance (in estate)', type: 'currency', default: 1_000_000 },
      { name: 'personal', label: 'Personal property', type: 'currency', default: 500_000 },
    ],
    run: (i) => {
      const total =
        num(i.realEstate) + num(i.investments) + num(i.retirement) +
        num(i.business) + num(i.lifeIns) + num(i.personal);
      return { summary: { 'Gross Estate': total } };
    },
  }),

  defineCalculator({
    id: 'est.giftAnnualExclusion',
    name: 'Annual Gift Exclusion Capacity',
    category: CAT,
    description: 'Number of beneficiaries × annual exclusion (×2 if split-gift).',
    inputs: [
      { name: 'beneficiaries', label: 'Beneficiaries', type: 'integer', default: 4 },
      { name: 'splitGift', label: 'Married & split gifts? (1=yes)', type: 'integer', default: 1 },
      { name: 'annualLimit', label: 'Annual exclusion', type: 'currency', default: ESTATE_2024.annualGiftExclusion },
    ],
    run: (i) => {
      const mul = num(i.splitGift) === 1 ? 2 : 1;
      const total = num(i.beneficiaries) * mul * num(i.annualLimit);
      return { summary: { 'Total Excluded Gifts (annual)': total } };
    },
  }),
];
