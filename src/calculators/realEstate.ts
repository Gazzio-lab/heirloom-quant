import { defineCalculator, num } from './_helpers';
import { buildAmortization } from '../core/amortization';
import { pmt } from '../core/financial';

const CAT = 'realestate';

export const realEstateCalculators = [
  defineCalculator({
    id: 're.mortgage',
    name: 'Mortgage Amortization',
    category: CAT,
    description: 'Builds a complete amortization schedule for a fixed-rate mortgage.',
    inputs: [
      { name: 'principal', label: 'Loan amount', type: 'currency', default: 500000, required: true },
      { name: 'rate', label: 'Annual rate (%)', type: 'percent', default: 6.5,
        afrLinked: { term: 'long', compounding: 'monthly' } },
      { name: 'years', label: 'Term (years)', type: 'number', default: 30 },
      { name: 'extra', label: 'Extra monthly principal', type: 'currency', default: 0 },
    ],
    run: (i) => {
      const result = buildAmortization(num(i.principal), num(i.rate) / 100, num(i.years), 12, num(i.extra));
      return {
        summary: {
          'Monthly Payment': result.payment,
          'Total Paid': result.totalPaid,
          'Total Interest': result.totalInterest,
          'Months to Payoff': result.schedule.length,
        },
        schedule: result.schedule,
      };
    },
  }),

  defineCalculator({
    id: 're.refiBreakeven',
    name: 'Refinance Break-Even',
    category: CAT,
    description: 'Months until refinance savings recoup closing costs.',
    inputs: [
      { name: 'oldPayment', label: 'Current monthly payment', type: 'currency', default: 3500 },
      { name: 'newPayment', label: 'New monthly payment', type: 'currency', default: 3100 },
      { name: 'closingCosts', label: 'Closing costs', type: 'currency', default: 9000 },
    ],
    run: (i) => {
      const savings = num(i.oldPayment) - num(i.newPayment);
      const months = savings > 0 ? num(i.closingCosts) / savings : Infinity;
      return {
        summary: {
          'Monthly Savings': savings,
          'Break-even (months)': months,
          'Break-even (years)': months / 12,
        },
      };
    },
  }),

  defineCalculator({
    id: 're.capRate',
    name: 'Rental Cap Rate & Cash-on-Cash',
    category: CAT,
    description: 'Capitalization rate and cash-on-cash return for a rental property.',
    inputs: [
      { name: 'price', label: 'Purchase price', type: 'currency', default: 400000 },
      { name: 'noi', label: 'Annual NOI', type: 'currency', default: 28000 },
      { name: 'down', label: 'Down payment', type: 'currency', default: 80000 },
      { name: 'cashFlow', label: 'Annual after-debt cashflow', type: 'currency', default: 8000 },
    ],
    run: (i) => ({
      summary: {
        'Cap Rate': num(i.price) > 0 ? num(i.noi) / num(i.price) : NaN,
        'Cash-on-Cash': num(i.down) > 0 ? num(i.cashFlow) / num(i.down) : NaN,
        'NOI': num(i.noi),
      },
    }),
  }),

  defineCalculator({
    id: 're.rentVsBuy',
    name: 'Rent vs. Buy (5-year)',
    category: CAT,
    description: 'Compare 5-year cost of renting vs. buying. Highly simplified.',
    inputs: [
      { name: 'rent', label: 'Monthly rent', type: 'currency', default: 2500 },
      { name: 'rentInflation', label: 'Rent inflation (%)', type: 'percent', default: 3 },
      { name: 'price', label: 'Home price', type: 'currency', default: 500000 },
      { name: 'down', label: 'Down payment', type: 'currency', default: 100000 },
      { name: 'rate', label: 'Mortgage rate (%)', type: 'percent', default: 6.5 },
      { name: 'years', label: 'Hold years', type: 'number', default: 5 },
      { name: 'taxIns', label: 'Annual prop tax + insurance', type: 'currency', default: 9000 },
    ],
    run: (i) => {
      const yrs = num(i.years);
      let rent = num(i.rent);
      let totalRent = 0;
      for (let y = 1; y <= yrs; y++) {
        totalRent += rent * 12;
        rent *= 1 + num(i.rentInflation) / 100;
      }
      const loan = num(i.price) - num(i.down);
      const monthly = -pmt(num(i.rate) / 100 / 12, 30 * 12, loan);
      const totalBuy = monthly * 12 * yrs + num(i.taxIns) * yrs + num(i.down);
      return {
        summary: {
          'Total Rent (cumulative)': totalRent,
          'Total Buy Cost': totalBuy,
          'Difference (Buy − Rent)': totalBuy - totalRent,
        },
        notes: ['Excludes home appreciation, tax deductions, and opportunity cost of down payment.'],
      };
    },
  }),
];
