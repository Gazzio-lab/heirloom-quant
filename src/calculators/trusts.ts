import { defineCalculator, num } from './_helpers';
import { pvAnnuity } from '../core/financial';
import { SECTION_7520_RATE_DEFAULT, lifeExpectancy } from '../data/irsRates';

const CAT = 'trusts';

export const trustCalculators = [
  defineCalculator({
    id: 'tru.grat',
    name: 'GRAT (Grantor Retained Annuity Trust)',
    category: CAT,
    description: 'Models a Walton-style zeroed-out GRAT: solves for the annuity that drives taxable gift to ~$0.',
    inputs: [
      { name: 'principal', label: 'Funding amount', type: 'currency', default: 5_000_000 },
      { name: 'years', label: 'GRAT term (years)', type: 'number', default: 5 },
      { name: 'rate7520', label: '§7520 rate (%)', type: 'percent', default: SECTION_7520_RATE_DEFAULT * 100,
        afrLinked: { term: 'mid', compounding: 'annual', multiplier: 1.2 } },
      { name: 'expectedReturn', label: 'Expected asset return (%)', type: 'percent', default: 9 },
    ],
    run: (i) => {
      const r = num(i.rate7520) / 100;
      const principal = num(i.principal);
      const years = num(i.years);
      // Annual annuity that zeroes out the gift: Annuity Factor = PV of annuity at §7520
      const annuityFactor = (1 - Math.pow(1 + r, -years)) / r;
      const annualAnnuity = principal / annuityFactor;
      // Project trust at expected return, paying out the annuity each year
      const eR = num(i.expectedReturn) / 100;
      let bal = principal;
      const schedule: Array<Record<string, number>> = [];
      for (let y = 1; y <= years; y++) {
        bal = bal * (1 + eR) - annualAnnuity;
        schedule.push({ year: y, annuity: annualAnnuity, endingBalance: Math.max(bal, 0) });
      }
      return {
        summary: {
          'Annual Annuity (zeroed-out)': annualAnnuity,
          'Taxable Gift': 0,
          'Projected Remainder to Heirs': Math.max(bal, 0),
          '§7520 Rate Used': r,
        },
        schedule,
      };
    },
  }),

  defineCalculator({
    id: 'tru.qprt',
    name: 'QPRT (Qualified Personal Residence Trust)',
    category: CAT,
    description: 'Estimate the taxable gift on transfer of a home into a QPRT.',
    inputs: [
      { name: 'home', label: 'Home value', type: 'currency', default: 2_000_000 },
      { name: 'term', label: 'QPRT term (years)', type: 'number', default: 10 },
      { name: 'rate7520', label: '§7520 rate (%)', type: 'percent', default: SECTION_7520_RATE_DEFAULT * 100,
        afrLinked: { term: 'mid', compounding: 'annual', multiplier: 1.2 } },
      { name: 'grantorAge', label: 'Grantor age', type: 'number', default: 60 },
    ],
    run: (i) => {
      const r = num(i.rate7520) / 100;
      const term = num(i.term);
      const home = num(i.home);
      const age = num(i.grantorAge);
      // PV of retained term interest = home * (1 - (1+r)^-n)
      const retainedIncome = home * (1 - Math.pow(1 + r, -term));
      // Approx survival probability using simplified life expectancy
      const surv = Math.max(0, 1 - term / Math.max(lifeExpectancy(age), term + 1));
      const retained = retainedIncome * surv;
      const remainder = home - retained;
      return {
        summary: {
          'Retained Interest (PV)': retained,
          'Taxable Gift (Remainder)': remainder,
          'Survival Probability (approx.)': surv,
        },
        notes: ['Survival adjustment uses simplified life expectancy; actual IRS calc uses Table 90CM/2010CM factors.'],
      };
    },
  }),

  defineCalculator({
    id: 'tru.ilit',
    name: 'ILIT Funding (Crummey Powers)',
    category: CAT,
    description: 'Annual gifting capacity into an ILIT using Crummey beneficiaries.',
    inputs: [
      { name: 'crummeyHolders', label: '# Crummey beneficiaries', type: 'integer', default: 3 },
      { name: 'annualExclusion', label: 'Annual exclusion / donor', type: 'currency', default: 18000 },
      { name: 'splitGift', label: 'Spouses split? (1=yes)', type: 'integer', default: 1 },
      { name: 'years', label: 'Funding years', type: 'number', default: 20 },
    ],
    run: (i) => {
      const donors = num(i.splitGift) === 1 ? 2 : 1;
      const annual = num(i.crummeyHolders) * num(i.annualExclusion) * donors;
      return {
        summary: {
          'Annual Tax-Free Funding': annual,
          'Cumulative over Period': annual * num(i.years),
        },
      };
    },
  }),

  defineCalculator({
    id: 'tru.idgt',
    name: 'IDGT Installment Sale',
    category: CAT,
    description: 'Sell appreciating assets to an Intentionally Defective Grantor Trust on installment note.',
    inputs: [
      { name: 'principal', label: 'Sale value', type: 'currency', default: 10_000_000 },
      { name: 'noteRate', label: 'Note interest rate (AFR %)', type: 'percent', default: 4.4,
        afrLinked: { term: 'mid', compounding: 'annual' } },
      { name: 'term', label: 'Note term (years)', type: 'number', default: 9 },
      { name: 'expectedReturn', label: 'Expected asset return (%)', type: 'percent', default: 9 },
    ],
    run: (i) => {
      const principal = num(i.principal);
      const r = num(i.noteRate) / 100;
      const er = num(i.expectedReturn) / 100;
      const term = num(i.term);
      // Interest-only note, balloon at maturity
      const interest = principal * r;
      let bal = principal;
      const schedule: Array<Record<string, number>> = [];
      for (let y = 1; y <= term; y++) {
        bal = bal * (1 + er) - interest;
        schedule.push({ year: y, interestPaid: interest, trustBalance: bal });
      }
      const remainder = bal - principal; // after balloon
      return {
        summary: {
          'Annual Interest (note)': interest,
          'Trust Remainder after Balloon': remainder,
          'Wealth Transferred': remainder,
        },
        schedule,
      };
    },
  }),
];
