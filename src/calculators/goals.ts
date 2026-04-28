import { defineCalculator, num } from './_helpers';
import { fv, fvAnnuity, pmt, pvAnnuity } from '../core/financial';

const CAT = 'goals';

export const goalsCalculators = [
  defineCalculator({
    id: 'goal.targetSavings',
    name: 'Required Savings to Hit a Goal',
    category: CAT,
    description: 'Solve for the periodic savings needed to reach a target amount.',
    inputs: [
      { name: 'goal', label: 'Goal amount', type: 'currency', default: 1_000_000 },
      { name: 'current', label: 'Current savings', type: 'currency', default: 50000 },
      { name: 'rate', label: 'Expected return (%)', type: 'percent', default: 7 },
      { name: 'years', label: 'Years', type: 'number', default: 25 },
    ],
    run: (i) => {
      const r = num(i.rate) / 100;
      const yrs = num(i.years);
      const futureCurrent = fv(num(i.current), r, yrs);
      const shortfall = num(i.goal) - futureCurrent;
      const annual = -pmt(r, yrs, 0, -shortfall);
      return {
        summary: {
          'Future Value of Current': futureCurrent,
          'Shortfall to Fund': shortfall,
          'Annual Savings Required': annual,
          'Monthly Savings Required': annual / 12,
        },
      };
    },
  }),

  defineCalculator({
    id: 'goal.education',
    name: 'College Funding',
    category: CAT,
    description: 'Project total college cost and required savings.',
    inputs: [
      { name: 'currentCost', label: 'Today’s annual college cost', type: 'currency', default: 35000 },
      { name: 'inflation', label: 'College cost inflation (%)', type: 'percent', default: 5 },
      { name: 'yearsToCollege', label: 'Years until college', type: 'number', default: 10 },
      { name: 'years', label: 'Years of college', type: 'number', default: 4 },
      { name: 'rate', label: 'Investment return (%)', type: 'percent', default: 6 },
      { name: 'currentSavings', label: 'Current 529/savings', type: 'currency', default: 10000 },
    ],
    run: (i) => {
      const futureCost = fv(num(i.currentCost), num(i.inflation) / 100, num(i.yearsToCollege));
      // Approximate total cost as 4 years' average future cost
      const avgCost = (futureCost + fv(num(i.currentCost), num(i.inflation) / 100, num(i.yearsToCollege) + num(i.years) - 1)) / 2;
      const total = avgCost * num(i.years);
      const futureCurrent = fv(num(i.currentSavings), num(i.rate) / 100, num(i.yearsToCollege));
      const shortfall = total - futureCurrent;
      const monthly = -pmt(num(i.rate) / 100 / 12, num(i.yearsToCollege) * 12, 0, -shortfall);
      return {
        summary: {
          'First-year Cost (future)': futureCost,
          'Total Cost (4 yrs)': total,
          'Shortfall': shortfall,
          'Monthly Savings Required': monthly,
        },
      };
    },
  }),

  defineCalculator({
    id: 'goal.lumpToIncome',
    name: 'How Much Will My Lump Sum Provide?',
    category: CAT,
    description: 'Yearly income a lump sum can produce over N years at rate R.',
    inputs: [
      { name: 'lump', label: 'Lump sum', type: 'currency', default: 1_000_000 },
      { name: 'rate', label: 'Withdrawal rate (%)', type: 'percent', default: 5 },
      { name: 'years', label: 'Years', type: 'number', default: 30 },
    ],
    run: (i) => {
      const r = num(i.rate) / 100;
      const annual = -pmt(r, num(i.years), -num(i.lump));
      return {
        summary: {
          'Annual Income': annual,
          'Monthly Income': annual / 12,
          'PV at Rate': pvAnnuity(annual, r, num(i.years)),
        },
      };
    },
  }),

  defineCalculator({
    id: 'goal.fvLumpAndContrib',
    name: 'Future Value (Lump + Contributions)',
    category: CAT,
    description: 'Combine a lump sum and periodic contributions to project a balance.',
    inputs: [
      { name: 'lump', label: 'Lump sum', type: 'currency', default: 50000 },
      { name: 'contribution', label: 'Annual contribution', type: 'currency', default: 12000 },
      { name: 'rate', label: 'Rate (%)', type: 'percent', default: 7 },
      { name: 'years', label: 'Years', type: 'number', default: 20 },
    ],
    run: (i) => {
      const r = num(i.rate) / 100;
      const yrs = num(i.years);
      const totalFV = fv(num(i.lump), r, yrs) + fvAnnuity(num(i.contribution), r, yrs);
      return { summary: { 'Future Value': totalFV } };
    },
  }),
];
