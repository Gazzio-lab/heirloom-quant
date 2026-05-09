import React, { useState } from 'react';
import {
  User, Building, Users, Target, BarChart3, Plus, Trash2, ChevronRight, ChevronLeft,
  TrendingUp, Award,
} from 'lucide-react';
import { useAppStore, AssetItem, BeneficiaryItem, EstateScenario } from '../../stores/appStore';
import { runOptimizer, StrategyResult } from '../../../core/estateOptimizer';

const USD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const STEPS = [
  { id: 1, label: 'Client',        icon: <User size={14} /> },
  { id: 2, label: 'Assets',        icon: <Building size={14} /> },
  { id: 3, label: 'Beneficiaries', icon: <Users size={14} /> },
  { id: 4, label: 'Goals',         icon: <Target size={14} /> },
  { id: 5, label: 'Results',       icon: <BarChart3 size={14} /> },
];

const ASSET_CATEGORIES = [
  { value: 'cash',       label: 'Cash & Equivalents' },
  { value: 'stocks',     label: 'Investments' },
  { value: 'realEstate', label: 'Real Estate' },
  { value: 'retirement', label: 'Retirement Accounts' },
  { value: 'business',   label: 'Business Interest' },
  { value: 'insurance',  label: 'Life Insurance' },
  { value: 'other',      label: 'Other' },
];

const RELATION_OPTIONS = [
  { value: 'spouse',  label: 'Spouse (0% PA)' },
  { value: 'lineal',  label: 'Lineal Heir (4.5% PA)' },
  { value: 'sibling', label: 'Sibling (12% PA)' },
  { value: 'other',   label: 'Other (15% PA)' },
  { value: 'charity', label: 'Charity (0% PA)' },
];

export default function EstateOptimizer() {
  const { estateScenario, setEstateScenario, afrResponse } = useAppStore();
  const [step, setStep] = useState(1);
  const s = estateScenario;

  const update = (partial: Partial<EstateScenario>) =>
    setEstateScenario({ ...s, ...partial });

  const addAsset = () =>
    update({ assets: [...s.assets, { id: Date.now().toString(), label: 'New Asset', category: 'stocks', value: 0, annualGrowth: 6, includedInEstate: true }] });

  const removeAsset = (id: string) => update({ assets: s.assets.filter((a) => a.id !== id) });

  const updateAsset = (id: string, changes: Partial<AssetItem>) =>
    update({ assets: s.assets.map((a) => a.id === id ? { ...a, ...changes } : a) });

  const addBen = () =>
    update({ beneficiaries: [...s.beneficiaries, { id: Date.now().toString(), name: 'New Beneficiary', relation: 'lineal', sharePercent: 0 }] });

  const removeBen = (id: string) => update({ beneficiaries: s.beneficiaries.filter((b) => b.id !== id) });

  const updateBen = (id: string, changes: Partial<BeneficiaryItem>) =>
    update({ beneficiaries: s.beneficiaries.map((b) => b.id === id ? { ...b, ...changes } : b) });

  const afrMid = afrResponse?.data?.mid_term?.annual ?? 4.02;

  const report = step === 5 ? runOptimizer({
    filingStatus: s.filingStatus,
    assets: s.assets,
    beneficiaries: s.beneficiaries,
    growthRate: s.growthRate,
    years: s.years,
    charitableGoal: s.charitableGoal,
    liquidityNeedPercent: s.liquidityNeedPercent,
    afrMidAnnual: afrMid,
  }) : null;

  const baseline = report?.strategies.find((s) => s.strategyId === 'no-planning');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Step indicator */}
      <div className="flex items-center gap-0 px-6 py-3 bg-slate-900 border-b border-slate-700/60 flex-shrink-0">
        {STEPS.map((st, i) => (
          <React.Fragment key={st.id}>
            <button
              onClick={() => setStep(st.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors
                ${step === st.id
                  ? 'bg-amber-500/15 text-amber-400 font-semibold'
                  : step > st.id
                  ? 'text-slate-300 hover:text-slate-100'
                  : 'text-slate-500 hover:text-slate-400'}`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
                ${step === st.id ? 'bg-amber-500 text-slate-900' : step > st.id ? 'bg-slate-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                {st.id}
              </span>
              {st.label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight size={12} className="text-slate-600 mx-0.5" />}
          </React.Fragment>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* Step 1: Client */}
        {step === 1 && (
          <div className="max-w-lg space-y-4">
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <User size={16} className="text-amber-400" /> Client Profile
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Client Name</label>
                <input value={s.clientName} onChange={(e) => update({ clientName: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label-text">Filing Status</label>
                <select value={s.filingStatus} onChange={(e) => update({ filingStatus: e.target.value as 'single' | 'married' })} className="select-field">
                  <option value="single">Single</option>
                  <option value="married">Married Filing Jointly</option>
                </select>
              </div>
              <div>
                <label className="label-text">Client Age</label>
                <input type="text" value={s.clientAge} onChange={(e) => update({ clientAge: parseInt(e.target.value) || 0 })} className="input-field" />
              </div>
              {s.filingStatus === 'married' && (
                <div>
                  <label className="label-text">Spouse Age</label>
                  <input type="text" value={s.spouseAge ?? ''} onChange={(e) => update({ spouseAge: parseInt(e.target.value) || 0 })} className="input-field" />
                </div>
              )}
              <div>
                <label className="label-text">Planning Horizon (years)</label>
                <input type="text" value={s.years} onChange={(e) => update({ years: parseInt(e.target.value) || 10 })} className="input-field" />
              </div>
              <div>
                <label className="label-text">Portfolio Growth Rate (%)</label>
                <input type="text" value={s.growthRate} onChange={(e) => update({ growthRate: parseFloat(e.target.value) || 6 })} className="input-field" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Assets */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Building size={16} className="text-amber-400" /> Asset Inventory
              </h2>
              <button onClick={addAsset} className="btn-secondary text-xs flex items-center gap-1.5">
                <Plus size={12} /> Add Asset
              </button>
            </div>
            <div className="space-y-2">
              {s.assets.map((a) => (
                <div key={a.id} className="card flex items-center gap-3">
                  <div className="flex-1 grid grid-cols-5 gap-3">
                    <div>
                      <label className="label-text">Label</label>
                      <input value={a.label} onChange={(e) => updateAsset(a.id, { label: e.target.value })} className="input-field text-xs" />
                    </div>
                    <div>
                      <label className="label-text">Category</label>
                      <select value={a.category} onChange={(e) => updateAsset(a.id, { category: e.target.value as AssetItem['category'] })} className="select-field text-xs">
                        {ASSET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label-text">Value ($)</label>
                      <input type="text" value={a.value} onChange={(e) => updateAsset(a.id, { value: parseFloat(e.target.value.replace(/[$,]/g, '')) || 0 })} className="input-field text-xs font-mono" />
                    </div>
                    <div>
                      <label className="label-text">Growth (%)</label>
                      <input type="text" value={a.annualGrowth} onChange={(e) => updateAsset(a.id, { annualGrowth: parseFloat(e.target.value) || 0 })} className="input-field text-xs font-mono" />
                    </div>
                    <div>
                      <label className="label-text">In Estate?</label>
                      <select value={a.includedInEstate ? 'yes' : 'no'} onChange={(e) => updateAsset(a.id, { includedInEstate: e.target.value === 'yes' })} className="select-field text-xs">
                        <option value="yes">Yes</option>
                        <option value="no">No (ILIT/outside)</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={() => removeAsset(a.id)} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="card bg-slate-700/30">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Gross Estate (in-estate assets)</span>
                <span className="font-mono font-semibold text-sky-400">
                  {USD(s.assets.filter((a) => a.includedInEstate).reduce((s, a) => s + a.value, 0))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Beneficiaries */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Users size={16} className="text-amber-400" /> Beneficiary Structure
              </h2>
              <button onClick={addBen} className="btn-secondary text-xs flex items-center gap-1.5">
                <Plus size={12} /> Add Beneficiary
              </button>
            </div>
            <p className="text-xs text-slate-400">
              PA inheritance tax rates: spouse 0% · lineal 4.5% · siblings 12% · others 15% · charity 0%
            </p>
            <div className="space-y-2">
              {s.beneficiaries.map((b) => (
                <div key={b.id} className="card flex items-center gap-3">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <label className="label-text">Name</label>
                      <input value={b.name} onChange={(e) => updateBen(b.id, { name: e.target.value })} className="input-field text-xs" />
                    </div>
                    <div>
                      <label className="label-text">Relationship / PA Rate</label>
                      <select value={b.relation} onChange={(e) => updateBen(b.id, { relation: e.target.value as BeneficiaryItem['relation'] })} className="select-field text-xs">
                        {RELATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label-text">Share %</label>
                      <input type="text" value={b.sharePercent} onChange={(e) => updateBen(b.id, { sharePercent: parseFloat(e.target.value) || 0 })} className="input-field text-xs font-mono" />
                    </div>
                  </div>
                  <button onClick={() => removeBen(b.id)} className="text-slate-500 hover:text-red-400 p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="card bg-slate-700/30 text-xs text-slate-400">
              Total share: {s.beneficiaries.reduce((sum, b) => sum + b.sharePercent, 0).toFixed(1)}%
              {' '}(should equal 100%)
            </div>
          </div>
        )}

        {/* Step 4: Goals */}
        {step === 4 && (
          <div className="max-w-lg space-y-4">
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Target size={16} className="text-amber-400" /> Planning Goals
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Charitable Goal ($)</label>
                <input type="text" value={s.charitableGoal} onChange={(e) => update({ charitableGoal: parseFloat(e.target.value.replace(/[$,]/g, '')) || 0 })} className="input-field" />
              </div>
              <div>
                <label className="label-text">Liquidity Need (% of estate)</label>
                <input type="text" value={s.liquidityNeedPercent} onChange={(e) => update({ liquidityNeedPercent: parseFloat(e.target.value) || 0 })} className="input-field" />
              </div>
            </div>
            <div className="card bg-amber-500/5 border-amber-500/20 text-xs text-amber-300 space-y-1">
              <p className="font-semibold">Ready to analyze</p>
              <p>Click <strong>Results →</strong> to run all 8 planning strategies and get personalized recommendations.</p>
              <p className="text-amber-400/60">Mid-term AFR used: {afrMid.toFixed(2)}%</p>
            </div>
          </div>
        )}

        {/* Step 5: Results */}
        {step === 5 && report && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <BarChart3 size={16} className="text-amber-400" /> Strategy Analysis
              </h2>
              <span className="text-xs text-slate-400">
                {s.clientName} · {s.years}-year horizon · Growth {s.growthRate}%
              </span>
            </div>

            {/* Recommended */}
            <div className="card border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Award size={14} className="text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Recommended Strategy</span>
              </div>
              <h3 className="font-bold text-slate-100 text-sm">{report.recommended.strategyName}</h3>
              <p className="text-xs text-slate-400 mt-1">{report.recommended.description}</p>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <div className="label-text">Net to Heirs</div>
                  <div className="font-mono font-bold text-emerald-400">{USD(report.recommended.netToHeirs)}</div>
                </div>
                <div>
                  <div className="label-text">Total Tax</div>
                  <div className="font-mono font-bold text-red-400">{USD(report.recommended.totalTax)}</div>
                </div>
                <div>
                  <div className="label-text">vs. Baseline</div>
                  <div className="font-mono font-bold text-sky-400">
                    {baseline ? USD(report.recommended.netToHeirs - baseline.netToHeirs) : '—'}
                  </div>
                </div>
              </div>
              {report.recommended.notes.map((n, i) => (
                <p key={i} className="text-[11px] text-slate-400 mt-1">• {n}</p>
              ))}
            </div>

            {/* Strategy comparison table */}
            <div className="card overflow-x-auto">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">All Strategies — Ranked by Net to Heirs</h3>
              <table className="w-full text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-slate-600">
                    {['Rank','Strategy','Future Estate','Fed. Tax','PA Tax','Total Tax','Net to Heirs'].map((h) => (
                      <th key={h} className="pb-2 text-right first:text-left last:text-right text-slate-400 font-semibold uppercase text-[10px] tracking-wide px-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.strategies.map((st, i) => (
                    <tr key={st.strategyId}
                        className={`border-t border-slate-700/50 ${i === 0 ? 'bg-emerald-500/5' : 'hover:bg-slate-700/20'}`}>
                      <td className="px-2 py-2 text-slate-300 font-semibold">#{i + 1}</td>
                      <td className="px-2 py-2 text-slate-200">{st.strategyName}</td>
                      <td className="px-2 py-2 text-right text-slate-300 font-mono">{USD(st.futureGrossEstate)}</td>
                      <td className="px-2 py-2 text-right text-red-400 font-mono">{USD(st.federalTax)}</td>
                      <td className="px-2 py-2 text-right text-amber-400 font-mono">{USD(st.paTax)}</td>
                      <td className="px-2 py-2 text-right text-red-300 font-mono">{USD(st.totalTax)}</td>
                      <td className={`px-2 py-2 text-right font-mono font-bold ${i === 0 ? 'text-emerald-400' : 'text-sky-300'}`}>
                        {USD(st.netToHeirs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PA breakdown */}
            {report.paBreakdown.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">PA Inheritance Tax Breakdown (Baseline)</h3>
                <table className="w-full text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-600">
                      {['Beneficiary','Share','PA Tax'].map((h) => (
                        <th key={h} className="pb-2 text-right first:text-left px-2 text-slate-400 font-semibold uppercase text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.paBreakdown.map((p) => (
                      <tr key={p.relation} className="border-t border-slate-700/50">
                        <td className="px-2 py-1.5 text-slate-300">{p.relation}</td>
                        <td className="px-2 py-1.5 text-right text-slate-400">{(p.share * 100).toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-right text-amber-400 font-mono font-semibold">{USD(p.tax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[10px] text-slate-600 mt-2">For planning estimates only — verify with PA Department of Revenue.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-700/60 bg-slate-900 flex-shrink-0">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="btn-secondary flex items-center gap-1.5 disabled:opacity-30"
        >
          <ChevronLeft size={13} /> Back
        </button>
        <span className="text-xs text-slate-500">Step {step} of {STEPS.length}</span>
        <button
          onClick={() => setStep(Math.min(5, step + 1))}
          disabled={step === 5}
          className="btn-primary flex items-center gap-1.5 disabled:opacity-30"
        >
          {step === 4 ? 'Run Analysis' : 'Next'} <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
