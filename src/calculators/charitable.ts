import { defineCalculator, num } from './_helpers';
import { SECTION_7520_RATE_DEFAULT } from '../data/irsRates';

const CAT = 'charitable';

export const charitableCalculators = [
  defineCalculator({
    id: 'cha.crat',
    name: 'CRAT (Charitable Remainder Annuity Trust)',
    category: CAT,
    description: 'Charitable remainder & deduction estimate for a CRAT term-of-years.',
    inputs: [
      { name: 'principal', label: 'Funding amount', type: 'currency', default: 1_000_000 },
      { name: 'rate', label: 'Annuity payout rate (%)', type: 'percent', default: 5 },
      { name: 'years', label: 'Term (years)', type: 'number', default: 20 },
      { name: 'rate7520', label: '§7520 rate (%)', type: 'percent', default: SECTION_7520_RATE_DEFAULT * 100,
        afrLinked: { term: 'mid', compounding: 'annual', multiplier: 1.2 } },
      { name: 'expectedReturn', label: 'Expected return (%)', type: 'percent', default: 7 },
    ],
    run: (i) => {
      const principal = num(i.principal);
      const annuity = principal * num(i.rate) / 100;
      const r7520 = num(i.rate7520) / 100;
      const yrs = num(i.years);
      const annuityFactor = (1 - Math.pow(1 + r7520, -yrs)) / r7520;
      const incomeInterest = annuity * annuityFactor;
      const charitableRemainder = principal - incomeInterest;
      // Project trust balance
      const er = num(i.expectedReturn) / 100;
      let bal = principal;
      const schedule: Array<Record<string, number>> = [];
      for (let y = 1; y <= yrs; y++) {
        bal = bal * (1 + er) - annuity;
        schedule.push({ year: y, payout: annuity, endingBalance: Math.max(bal, 0) });
      }
      return {
        summary: {
          'Annual Annuity Payout': annuity,
          'Income Interest (PV)': incomeInterest,
          'Charitable Deduction (PV)': Math.max(charitableRemainder, 0),
          'Projected Charity Remainder': Math.max(bal, 0),
        },
      };
    },
  }),

  defineCalculator({
    id: 'cha.crut',
    name: 'CRUT (Unitrust Payout)',
    category: CAT,
    description: 'Project a CRUT paying a fixed % of trust value each year.',
    inputs: [
      { name: 'principal', label: 'Funding amount', type: 'currency', default: 1_000_000 },
      { name: 'unitrustRate', label: 'Unitrust % (5–50%)', type: 'percent', default: 5 },
      { name: 'years', label: 'Term (years)', type: 'number', default: 20 },
      { name: 'expectedReturn', label: 'Expected return (%)', type: 'percent', default: 7 },
    ],
    run: (i) => {
      const u = num(i.unitrustRate) / 100;
      const er = num(i.expectedReturn) / 100;
      const yrs = num(i.years);
      let bal = num(i.principal);
      let totalPaid = 0;
      const schedule: Array<Record<string, number>> = [];
      for (let y = 1; y <= yrs; y++) {
        const payout = bal * u;
        totalPaid += payout;
        bal = (bal - payout) * (1 + er);
        schedule.push({ year: y, payout, endingBalance: Math.max(bal, 0) });
      }
      return {
        summary: {
          'Total Payouts': totalPaid,
          'Charity Remainder': Math.max(bal, 0),
        },
        schedule,
      };
    },
  }),

  defineCalculator({
    id: 'cha.qcd',
    name: 'Qualified Charitable Distribution',
    category: CAT,
    description: 'Tax saved by directing IRA RMD straight to charity.',
    inputs: [
      { name: 'qcdAmount', label: 'QCD amount', type: 'currency', default: 50000 },
      { name: 'marginalRate', label: 'Marginal tax rate (%)', type: 'percent', default: 32 },
    ],
    run: (i) => ({
      summary: {
        'Tax Saved': num(i.qcdAmount) * num(i.marginalRate) / 100,
      },
    }),
  }),
];
