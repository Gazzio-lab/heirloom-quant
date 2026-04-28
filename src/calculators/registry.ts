import type { Calculator } from '../core/types';

import { investmentCalculators } from './investment';
import { inflationCalculators } from './inflation';
import { realEstateCalculators } from './realEstate';
import { insuranceCalculators } from './insurance';
import { netWorthCalculators } from './netWorth';
import { goalsCalculators } from './goals';
import { budgetingCalculators } from './budgeting';
import { valuationCalculators } from './valuation';
import { estateCalculators } from './estate';
import { trustCalculators } from './trusts';
import { charitableCalculators } from './charitable';
import { techniquesCalculators } from './techniques';
import { taxesCalculators } from './taxes';
import { retirementCalculators } from './retirement';
import { pvfvCalculators } from './pvfv';
import { section199ACalculators } from './section199a';

export interface Tab {
  id: string;
  label: string;
}

/** The 16 tabs for Heirloom Quant, in display order. */
export const TABS: Tab[] = [
  { id: 'investment',  label: 'Investment' },
  { id: 'inflation',   label: 'Inflation' },
  { id: 'realestate',  label: 'Real Estate' },
  { id: 'insurance',   label: 'Insurance' },
  { id: 'networth',    label: 'Net Worth' },
  { id: 'goals',       label: 'Financial Goals' },
  { id: 'budgeting',   label: 'Budgeting' },
  { id: 'valuation',   label: 'Valuation' },
  { id: 'estate',      label: 'Tools of Estate Planning' },
  { id: 'trusts',      label: 'Trusts' },
  { id: 'charitable',  label: 'Charitable' },
  { id: 'techniques',  label: 'Estate Planning Techniques' },
  { id: 'taxes',       label: 'Taxes' },
  { id: 'retirement',  label: 'Retirement' },
  { id: 'pvfv',        label: 'Present / Future Value' },
  { id: 'section199a', label: '§199A' },
];

const ALL: Calculator[] = [
  ...investmentCalculators,
  ...inflationCalculators,
  ...realEstateCalculators,
  ...insuranceCalculators,
  ...netWorthCalculators,
  ...goalsCalculators,
  ...budgetingCalculators,
  ...valuationCalculators,
  ...estateCalculators,
  ...trustCalculators,
  ...charitableCalculators,
  ...techniquesCalculators,
  ...taxesCalculators,
  ...retirementCalculators,
  ...pvfvCalculators,
  ...section199ACalculators,
];

const BY_ID = new Map<string, Calculator>(ALL.map(c => [c.id, c]));

export function listCalculators(): Calculator[] {
  return ALL;
}

export function getCalculator(id: string): Calculator | undefined {
  return BY_ID.get(id);
}

export function calculatorsByCategory(): Record<string, Calculator[]> {
  const out: Record<string, Calculator[]> = {};
  for (const t of TABS) out[t.id] = [];
  for (const c of ALL) (out[c.category] ??= []).push(c);
  return out;
}
