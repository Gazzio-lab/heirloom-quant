/**
 * Estate Planning Calculators — expanded module.
 * Covers PA inheritance tax, private annuity, dynasty trust projection,
 * intra-family loan, gift tax tracker, and unified credit tracker.
 */
import { defineCalculator, num } from './_helpers';
import { pmt, pvAnnuity, fv } from '../core/financial';
import { SECTION_7520_RATE_DEFAULT } from '../data/irsRates';
import { PA_RATES } from '../core/paInheritanceTax';
import { ESTATE_2024 } from '../data/taxBrackets2024';

const CAT = 'estateplanning';

export const estatePlanningCalculators = [

  // ---- PA Inheritance Tax ------------------------------------------------
  defineCalculator({
    id: 'ep.paTax',
    name: 'PA Inheritance Tax',
    category: CAT,
    description: 'Apply Pennsylvania inheritance tax rates by beneficiary class.',
    inputs: [
      { name: 'grossEstate',    label: 'Gross estate value',          type: 'currency', default: 5_000_000 },
      { name: 'fedEstateTax',   label: 'Federal estate tax paid',     type: 'currency', default: 0 },
      { name: 'debts',          label: 'Debts + admin expenses',      type: 'currency', default: 50_000 },
      { name: 'spouseShare',    label: 'Spouse share (%)',            type: 'percent',  default: 0 },
      { name: 'linealShare',    label: 'Lineal heir share (%)',       type: 'percent',  default: 80 },
      { name: 'siblingShare',   label: 'Sibling share (%)',           type: 'percent',  default: 10 },
      { name: 'otherShare',     label: 'Other heir share (%)',        type: 'percent',  default: 5 },
      { name: 'charityShare',   label: 'Charity share (%)',           type: 'percent',  default: 5 },
    ],
    run: (i) => {
      const gross   = num(i.grossEstate);
      const deduc   = num(i.fedEstateTax) + num(i.debts);
      const taxable = Math.max(gross - deduc, 0);

      const spouseAmt  = taxable * num(i.spouseShare)  / 100;
      const linealAmt  = taxable * num(i.linealShare)  / 100;
      const siblingAmt = taxable * num(i.siblingShare) / 100;
      const otherAmt   = taxable * num(i.otherShare)   / 100;

      const spouseTax  = spouseAmt  * PA_RATES.spouse;
      const linealTax  = linealAmt  * PA_RATES.lineal;
      const siblingTax = siblingAmt * PA_RATES.sibling;
      const otherTax   = otherAmt   * PA_RATES.other;
      const total      = spouseTax + linealTax + siblingTax + otherTax;

      return {
        summary: {
          'Taxable Estate (PA)':    taxable,
          'Tax — Spouse (0%)':      spouseTax,
          'Tax — Lineal (4.5%)':    linealTax,
          'Tax — Siblings (12%)':   siblingTax,
          'Tax — Others (15%)':     otherTax,
          'Total PA Inheritance Tax': total,
          'Effective PA Rate':      gross > 0 ? total / gross : 0,
        },
        notes: [
          'PA inheritance tax rates: spouse 0%, lineal 4.5%, siblings 12%, others 15%, charity 0%.',
          'Based on PA Dept of Revenue rules (72 P.S. §9106). For estimates only.',
        ],
      };
    },
  }),

  // ---- Private Annuity ---------------------------------------------------
  defineCalculator({
    id: 'ep.privateAnnuity',
    name: 'Private Annuity',
    category: CAT,
    description: 'Value a private annuity and estimate the unsecured payments needed to transfer property tax-free.',
    inputs: [
      { name: 'propertyValue',  label: 'FMV of transferred property', type: 'currency', default: 2_000_000 },
      { name: 'annuitantAge',   label: 'Annuitant age',               type: 'integer',  default: 70 },
      { name: 'rate7520',       label: '§7520 rate (%)',               type: 'percent',  default: SECTION_7520_RATE_DEFAULT * 100,
        afrLinked: { term: 'mid', compounding: 'annual', multiplier: 1.2 } },
      { name: 'paymentFreq',    label: 'Payments per year',           type: 'integer',  default: 12 },
    ],
    run: (i) => {
      // IRS single life annuity factor (simplified — actual uses Tbl S/90CM)
      const age = num(i.annuitantAge);
      const lifeExp = Math.max(90 - age, 1);
      const r = num(i.rate7520) / 100;
      const freq = num(i.paymentFreq);
      const perPeriodRate = r / freq;
      const n = lifeExp * freq;
      const annuityFactor = (1 - Math.pow(1 + perPeriodRate, -n)) / perPeriodRate;
      const annualPayment = num(i.propertyValue) / (annuityFactor / freq);

      return {
        summary: {
          'Annual Payment Required':         annualPayment,
          'Monthly Payment':                 annualPayment / 12,
          'Life Expectancy Used (years)':    lifeExp,
          'Annuity Factor':                  annuityFactor / freq,
          'Total Payments (expected)':       annualPayment * lifeExp,
        },
        notes: [
          'Simplified life expectancy (90 − age). Actual calculation uses IRS Table S / 90CM.',
          'Private annuity: property transfers tax-free if annuitant dies before full payment.',
        ],
      };
    },
  }),

  // ---- Dynasty Trust Projection -------------------------------------------
  defineCalculator({
    id: 'ep.dynastyTrust',
    name: 'Dynasty Trust Projection',
    category: CAT,
    description: 'Project multi-generational wealth inside a dynasty (GST-exempt) trust.',
    inputs: [
      { name: 'funding',       label: 'Initial funding',              type: 'currency', default: 5_000_000 },
      { name: 'returnRate',    label: 'Annual trust return (%)',      type: 'percent',  default: 7 },
      { name: 'annualDist',    label: 'Annual distribution ($)',      type: 'currency', default: 250_000 },
      { name: 'years',         label: 'Projection years',            type: 'integer',  default: 50 },
      { name: 'estateIncluded',label: 'Without trust: estate tax (%)',type: 'percent',  default: 40 },
    ],
    run: (i) => {
      const r   = num(i.returnRate) / 100;
      const dist = num(i.annualDist);
      const yrs  = num(i.years);
      let bal = num(i.funding);
      const schedule: Array<Record<string, number>> = [];

      for (let y = 1; y <= yrs; y++) {
        bal = bal * (1 + r) - dist;
        if (bal < 0) { bal = 0; }
        schedule.push({ year: y, distribution: dist, endingBalance: Math.max(bal, 0) });
        if (bal <= 0) break;
      }

      const noTrustValue = num(i.funding) * Math.pow(1 + r, yrs) * (1 - num(i.estateIncluded) / 100);
      return {
        summary: {
          [`Trust Balance after ${yrs} yrs`]: Math.max(bal, 0),
          'Total Distributions':     dist * Math.min(yrs, schedule.length),
          'Without Trust (after tax)': noTrustValue,
          'Dynasty Trust Advantage': Math.max(bal + dist * schedule.length - noTrustValue, 0),
        },
        schedule,
        notes: ['GST exemption preserves trust assets across multiple generations without estate tax at each death.'],
      };
    },
  }),

  // ---- Intra-Family Loan -------------------------------------------------
  defineCalculator({
    id: 'ep.intrafamilyLoan',
    name: 'Intra-Family Loan',
    category: CAT,
    description: 'Structure an intra-family loan at AFR to transfer wealth while meeting §7872 requirements.',
    inputs: [
      { name: 'loanAmount',   label: 'Loan amount',               type: 'currency', default: 2_000_000 },
      { name: 'afrRate',      label: 'AFR rate (%)',              type: 'percent',  default: 4.02,
        afrLinked: { term: 'mid', compounding: 'annual' } },
      { name: 'borrowerReturn', label: 'Expected borrower return (%)', type: 'percent', default: 8 },
      { name: 'term',         label: 'Loan term (years)',         type: 'integer',  default: 9 },
      { name: 'amortized',    label: 'Amortized? (1=yes, 0=interest-only)', type: 'integer', default: 0 },
    ],
    run: (i) => {
      const loan   = num(i.loanAmount);
      const afrR   = num(i.afrRate) / 100;
      const brR    = num(i.borrowerReturn) / 100;
      const term   = num(i.term);
      const isAmort = num(i.amortized) === 1;

      const annualInterest = loan * afrR;
      const borrowerFV     = fv(loan, brR, term);
      const loanRepaid     = isAmort
        ? loan
        : loan + annualInterest * term; // balloon + all interest
      const netTransferred = Math.max(borrowerFV - loanRepaid, 0);

      const annualPayment = isAmort ? -pmt(afrR, term, loan) : annualInterest;

      return {
        summary: {
          'Annual Payment (to lender)':  annualPayment,
          'Borrower Asset FV':           borrowerFV,
          'Amount Repaid to Lender':     loanRepaid,
          'Wealth Transferred (net)':    netTransferred,
          'Spread (return − AFR)':       brR - afrR,
        },
        notes: [
          `Loan must bear at least the applicable AFR (${num(i.afrRate).toFixed(2)}%) to avoid imputed gift.`,
          'Interest income is taxable to lender; principal repayment is tax-free.',
        ],
      };
    },
  }),

  // ---- Gift Tax Tracker --------------------------------------------------
  defineCalculator({
    id: 'ep.giftTaxTracker',
    name: 'Cumulative Gift Tracker',
    category: CAT,
    description: 'Track cumulative taxable gifts against the lifetime exemption.',
    inputs: [
      { name: 'priorGifts',      label: 'Prior taxable gifts',      type: 'currency', default: 0 },
      { name: 'currentGift',     label: 'Current gift (FMV)',       type: 'currency', default: 1_000_000 },
      { name: 'annualExclusions',label: 'Annual exclusion offsets', type: 'currency', default: 0 },
      { name: 'exemption',       label: 'Lifetime exemption',       type: 'currency', default: ESTATE_2024.exemption },
      { name: 'topRate',         label: 'Top gift tax rate (%)',    type: 'percent',  default: 40 },
    ],
    run: (i) => {
      const taxableGift   = Math.max(num(i.currentGift) - num(i.annualExclusions), 0);
      const cumulativePrior = num(i.priorGifts);
      const cumulative      = cumulativePrior + taxableGift;
      const exemptionRemaining = Math.max(num(i.exemption) - cumulative, 0);
      const overExemption      = Math.max(cumulative - num(i.exemption), 0);
      const giftTaxDue         = overExemption * num(i.topRate) / 100;

      return {
        summary: {
          'Current Taxable Gift':       taxableGift,
          'Cumulative Taxable Gifts':   cumulative,
          'Exemption Remaining':        exemptionRemaining,
          'Over Exemption':             overExemption,
          'Gift Tax Due':               giftTaxDue,
        },
        notes: [
          'Annual exclusion gifts do not count toward the lifetime exemption.',
          '2024 annual exclusion: $18,000 per donor per recipient ($36,000 split gift).',
        ],
      };
    },
  }),

  // ---- Unified Credit Optimizer ------------------------------------------
  defineCalculator({
    id: 'ep.unifiedCredit',
    name: 'Unified Credit / Exemption Optimizer',
    category: CAT,
    description: 'Model the combined federal gift + estate tax exposure and optimise exemption use.',
    inputs: [
      { name: 'grossEstate',    label: 'Projected gross estate',    type: 'currency', default: 20_000_000 },
      { name: 'lifetimeGifts',  label: 'Prior taxable gifts',       type: 'currency', default: 0 },
      { name: 'spousePortability', label: 'Spouse DSUE available',  type: 'currency', default: 0 },
      { name: 'exemption',      label: 'Basic exclusion amount',    type: 'currency', default: ESTATE_2024.exemption },
      { name: 'topRate',        label: 'Top estate tax rate (%)',   type: 'percent',  default: 40 },
    ],
    run: (i) => {
      const gross     = num(i.grossEstate);
      const gifts     = num(i.lifetimeGifts);
      const dsue      = num(i.spousePortability);
      const exemption = num(i.exemption) + dsue;
      const usedByGifts = Math.min(gifts, exemption);
      const remainingExemption = Math.max(exemption - usedByGifts, 0);
      const taxableEstate = Math.max(gross - remainingExemption, 0);
      const estateTax = taxableEstate * num(i.topRate) / 100;

      return {
        summary: {
          'Combined Exemption (incl. DSUE)': exemption,
          'Exemption Used by Lifetime Gifts': usedByGifts,
          'Remaining Estate Exemption':       remainingExemption,
          'Taxable Estate':                   taxableEstate,
          'Federal Estate Tax':               estateTax,
          'Net to Heirs':                     Math.max(gross - estateTax, 0),
        },
        notes: [
          'DSUE (Deceased Spouse\'s Unused Exemption) is available via portability election on Form 706.',
          'Sunset provision: current exemption levels expire after 2025 absent new legislation.',
        ],
      };
    },
  }),

];
