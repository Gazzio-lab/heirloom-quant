import { defineCalculator, num } from './_helpers';
import { fv, fvAnnuity, pmt, pvAnnuity } from '../core/financial';
import { UNIFORM_RMD_DIVISOR } from '../data/irsRates';

const CAT = 'retirement';

export const retirementCalculators = [
  defineCalculator({
    id: 'ret.nestEgg',
    name: 'Retirement Nest-Egg Need',
    category: CAT,
    description: 'PV of inflation-adjusted retirement income, then back-out savings target.',
    inputs: [
      { name: 'currentIncome', label: 'Current annual income', type: 'currency', default: 200000 },
      { name: 'replacement', label: 'Replacement %', type: 'percent', default: 80 },
      { name: 'inflation', label: 'Inflation (%)', type: 'percent', default: 3 },
      { name: 'retireYears', label: 'Years until retirement', type: 'number', default: 25 },
      { name: 'retirementYears', label: 'Years in retirement', type: 'number', default: 30 },
      { name: 'returnPre', label: 'Pre-retirement return (%)', type: 'percent', default: 7 },
      { name: 'returnPost', label: 'Post-retirement return (%)', type: 'percent', default: 5 },
      { name: 'currentSavings', label: 'Current retirement savings', type: 'currency', default: 250000 },
    ],
    run: (i) => {
      const incomeNeed = num(i.currentIncome) * num(i.replacement) / 100;
      const futureNeed = fv(incomeNeed, num(i.inflation) / 100, num(i.retireYears));
      // PV at retirement of withdrawals over retirementYears (inflation-adjusted real return)
      const realRet = (1 + num(i.returnPost) / 100) / (1 + num(i.inflation) / 100) - 1;
      const nestEgg = pvAnnuity(futureNeed, realRet, num(i.retirementYears));
      const futureCurrent = fv(num(i.currentSavings), num(i.returnPre) / 100, num(i.retireYears));
      const shortfall = nestEgg - futureCurrent;
      const annual = -pmt(num(i.returnPre) / 100, num(i.retireYears), 0, -shortfall);
      return {
        summary: {
          'Income Need (Year 1 retired)': futureNeed,
          'Required Nest Egg @ Retirement': nestEgg,
          'FV of Current Savings': futureCurrent,
          'Annual Savings Required': annual,
          'Monthly Savings Required': annual / 12,
        },
      };
    },
  }),

  defineCalculator({
    id: 'ret.rmd',
    name: 'RMD Projection',
    category: CAT,
    description: 'Required Minimum Distribution year-by-year using the IRS Uniform Lifetime Table.',
    inputs: [
      { name: 'balance', label: 'Account balance @ start age', type: 'currency', default: 1_500_000 },
      { name: 'startAge', label: 'Starting age (≥73)', type: 'integer', default: 73 },
      { name: 'years', label: 'Years to project', type: 'number', default: 15 },
      { name: 'returnPct', label: 'Expected return (%)', type: 'percent', default: 5 },
    ],
    run: (i) => {
      let bal = num(i.balance);
      const er = num(i.returnPct) / 100;
      const startAge = num(i.startAge);
      const yrs = num(i.years);
      const schedule: Array<Record<string, number>> = [];
      let totalRMD = 0;
      for (let y = 0; y < yrs; y++) {
        const age = startAge + y;
        const divisor = UNIFORM_RMD_DIVISOR[age] ?? UNIFORM_RMD_DIVISOR[100];
        const rmd = bal / divisor;
        totalRMD += rmd;
        bal = (bal - rmd) * (1 + er);
        schedule.push({ age, divisor, rmd, endingBalance: Math.max(bal, 0) });
      }
      return {
        summary: {
          'Total RMDs': totalRMD,
          'Ending Balance': Math.max(bal, 0),
        },
        schedule,
      };
    },
  }),

  defineCalculator({
    id: 'ret.rothConversion',
    name: 'Roth Conversion',
    category: CAT,
    description: 'Compare keeping a Traditional IRA vs. converting to Roth and paying tax now.',
    inputs: [
      { name: 'balance', label: 'IRA balance', type: 'currency', default: 500000 },
      { name: 'currentRate', label: 'Current marginal rate (%)', type: 'percent', default: 24 },
      { name: 'futureRate', label: 'Expected future rate (%)', type: 'percent', default: 32 },
      { name: 'rate', label: 'Annual return (%)', type: 'percent', default: 6 },
      { name: 'years', label: 'Years until withdrawal', type: 'number', default: 20 },
    ],
    run: (i) => {
      const bal = num(i.balance);
      const r = num(i.rate) / 100;
      const yrs = num(i.years);
      const tradFV = fv(bal, r, yrs);
      const tradAfterTax = tradFV * (1 - num(i.futureRate) / 100);
      const tax = bal * num(i.currentRate) / 100;
      const rothFV = fv(bal - tax, r, yrs);
      return {
        summary: {
          'Traditional after-tax FV': tradAfterTax,
          'Roth FV (after tax now)': rothFV,
          'Net Benefit of Conversion': rothFV - tradAfterTax,
        },
      };
    },
  }),

  defineCalculator({
    id: 'ret.ssBreakeven',
    name: 'Social Security Break-Even',
    category: CAT,
    description: 'Compare cumulative SS benefits between two claiming ages.',
    inputs: [
      { name: 'earlyBenefit', label: 'Early monthly benefit', type: 'currency', default: 2400 },
      { name: 'earlyAge', label: 'Early age', type: 'integer', default: 62 },
      { name: 'lateBenefit', label: 'Late monthly benefit', type: 'currency', default: 4200 },
      { name: 'lateAge', label: 'Late age', type: 'integer', default: 70 },
    ],
    run: (i) => {
      const ea = num(i.earlyAge);
      const la = num(i.lateAge);
      const eb = num(i.earlyBenefit);
      const lb = num(i.lateBenefit);
      // Solve for age T where eb*(T-ea)*12 = lb*(T-la)*12
      // T = (lb*la - eb*ea)/(lb - eb)
      const breakEven = (lb * la - eb * ea) / (lb - eb);
      return {
        summary: {
          'Break-Even Age': breakEven,
          'Annual Difference (early vs. late)': (lb - eb) * 12,
        },
      };
    },
  }),

  defineCalculator({
    id: 'ret.withdrawalSustainability',
    name: 'Withdrawal Sustainability',
    category: CAT,
    description: 'How many years a portfolio lasts at a given withdrawal & return.',
    inputs: [
      { name: 'balance', label: 'Starting balance', type: 'currency', default: 1_500_000 },
      { name: 'withdrawal', label: 'Annual withdrawal', type: 'currency', default: 90000 },
      { name: 'rate', label: 'Annual return (%)', type: 'percent', default: 5 },
      { name: 'inflation', label: 'Inflation (%)', type: 'percent', default: 3 },
    ],
    run: (i) => {
      let bal = num(i.balance);
      let w = num(i.withdrawal);
      const r = num(i.rate) / 100;
      const infl = num(i.inflation) / 100;
      const schedule: Array<Record<string, number>> = [];
      let yr = 0;
      while (bal > 0 && yr < 100) {
        yr++;
        bal = (bal - w) * (1 + r);
        schedule.push({ year: yr, withdrawal: w, balance: Math.max(bal, 0) });
        if (bal <= 0) break;
        w *= 1 + infl;
      }
      return {
        summary: {
          'Years Lasts': yr,
          'Ending Balance': Math.max(bal, 0),
        },
        schedule,
      };
    },
  }),
];
