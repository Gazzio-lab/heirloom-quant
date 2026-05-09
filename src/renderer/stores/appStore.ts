/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';

// ---- types mirrored from main process (renderer can't import /core directly) ----

export interface AfrTermRates {
  annual: number; semiannual: number; quarterly: number; monthly: number;
}
export interface AfrData {
  month: string; updatedAt: string; source: string;
  short_term: AfrTermRates; mid_term: AfrTermRates; long_term: AfrTermRates;
}
export interface AfrSettings {
  useAfrAsDefault: boolean;
  termOverride: 'auto' | 'short' | 'mid' | 'long';
  compounding: 'annual' | 'semiannual' | 'quarterly' | 'monthly';
}
export interface AfrSummary {
  shortTerm: AfrTermRates; midTerm: AfrTermRates; longTerm: AfrTermRates;
  section7520: number; month: string; source: string; updatedAt: string;
}
export interface AfrResponse { data: AfrData; settings: AfrSettings; summary: AfrSummary; }

export interface CalcResult {
  summary: Record<string, number | string>;
  schedule?: Array<Record<string, number | string>>;
  notes?: string[];
}
export interface Scenario {
  id: string; name: string; createdAt: string;
  calculatorId: string; inputs: Record<string, any>; result?: CalcResult;
}
export interface FieldDef {
  name: string; label: string;
  type: 'number' | 'currency' | 'percent' | 'integer' | 'text' | 'select' | 'date';
  default?: number | string;
  options?: { value: string | number; label: string }[];
  help?: string;
  afrLinked?: { term: 'short' | 'mid' | 'long'; compounding: string; multiplier?: number; };
}
export interface Calc {
  id: string; name: string; category: string; description: string; inputs: FieldDef[];
}
export interface Tab { id: string; label: string; }

// ---- estate optimizer types ----
export interface AssetItem {
  id: string; label: string;
  category: 'cash' | 'stocks' | 'realEstate' | 'retirement' | 'business' | 'insurance' | 'other';
  value: number; annualGrowth: number; includedInEstate: boolean;
}
export interface BeneficiaryItem {
  id: string; name: string;
  relation: 'spouse' | 'lineal' | 'sibling' | 'other' | 'charity';
  sharePercent: number;
}
export interface EstateScenario {
  clientName: string; filingStatus: 'single' | 'married';
  clientAge: number; spouseAge?: number;
  assets: AssetItem[];
  beneficiaries: BeneficiaryItem[];
  charitableGoal: number;
  liquidityNeedPercent: number;
  growthRate: number;
  years: number;
}
export const DEFAULT_ESTATE_SCENARIO: EstateScenario = {
  clientName: 'Sample Client',
  filingStatus: 'married',
  clientAge: 65,
  spouseAge: 63,
  assets: [
    { id: '1', label: 'Investment Portfolio', category: 'stocks',      value: 5_000_000, annualGrowth: 7, includedInEstate: true },
    { id: '2', label: 'Primary Residence',    category: 'realEstate',  value: 2_000_000, annualGrowth: 3, includedInEstate: true },
    { id: '3', label: 'IRA / Retirement',     category: 'retirement',  value: 2_000_000, annualGrowth: 6, includedInEstate: true },
    { id: '4', label: 'Business Interest',    category: 'business',    value: 3_000_000, annualGrowth: 5, includedInEstate: true },
    { id: '5', label: 'Life Insurance',       category: 'insurance',   value: 1_000_000, annualGrowth: 0, includedInEstate: false },
  ],
  beneficiaries: [
    { id: '1', name: 'Spouse',         relation: 'spouse',  sharePercent: 0 },
    { id: '2', name: 'Child 1',        relation: 'lineal',  sharePercent: 40 },
    { id: '3', name: 'Child 2',        relation: 'lineal',  sharePercent: 40 },
    { id: '4', name: 'Grandchildren',  relation: 'lineal',  sharePercent: 15 },
    { id: '5', name: 'Local Charity',  relation: 'charity', sharePercent: 5 },
  ],
  charitableGoal: 500_000,
  liquidityNeedPercent: 10,
  growthRate: 6,
  years: 10,
};

// ---- store ----

type NavView = 'dashboard' | 'calculator' | 'estate-optimizer' | 'afr';

interface AppStore {
  // Navigation
  view: NavView;
  activeTab: string;
  activeCalcId: string;
  setView: (v: NavView) => void;
  setActiveTab: (t: string) => void;
  setActiveCalcId: (id: string) => void;

  // Tabs + calculators (populated via IPC on init)
  tabs: Tab[];
  calcs: Calc[];
  byCategory: Record<string, Calc[]>;
  setTabs: (tabs: Tab[], calcs: Calc[]) => void;

  // AFR
  afrResponse: AfrResponse | null;
  setAfrResponse: (r: AfrResponse | null) => void;

  // Calculator results cache
  lastResult: CalcResult | null;
  lastInputs: Record<string, any>;
  setLastResult: (r: CalcResult | null, inputs: Record<string, any>) => void;

  // Saved scenarios
  scenarios: Scenario[];
  addScenario: (s: Scenario) => void;
  removeScenario: (id: string) => void;

  // Estate optimizer
  estateScenario: EstateScenario;
  setEstateScenario: (s: EstateScenario) => void;

  // Status bar
  status: string;
  setStatus: (msg: string) => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  view: 'dashboard',
  activeTab: '',
  activeCalcId: '',
  setView: (view) => set({ view }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setActiveCalcId: (activeCalcId) => set({ activeCalcId }),

  tabs: [],
  calcs: [],
  byCategory: {},
  setTabs: (tabs, calcs) => {
    const byCategory: Record<string, Calc[]> = {};
    for (const t of tabs) byCategory[t.id] = [];
    for (const c of calcs) (byCategory[c.category] ??= []).push(c);
    set({ tabs, calcs, byCategory });
  },

  afrResponse: null,
  setAfrResponse: (afrResponse) => set({ afrResponse }),

  lastResult: null,
  lastInputs: {},
  setLastResult: (lastResult, lastInputs) => set({ lastResult, lastInputs }),

  scenarios: [],
  addScenario: (s) => set((st) => ({ scenarios: [s, ...st.scenarios.slice(0, 19)] })),
  removeScenario: (id) => set((st) => ({ scenarios: st.scenarios.filter((s) => s.id !== id) })),

  estateScenario: DEFAULT_ESTATE_SCENARIO,
  setEstateScenario: (estateScenario) => set({ estateScenario }),

  status: 'Ready.',
  setStatus: (status) => set({ status }),

  theme: 'dark',
  toggleTheme: () =>
    set((st) => {
      const next = st.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      return { theme: next };
    }),
}));
