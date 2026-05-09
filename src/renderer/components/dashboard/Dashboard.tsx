import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useAppStore } from '../../stores/appStore';
import { TrendingUp, Landmark, Heart, Clock, ArrowRight } from 'lucide-react';

const USD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const ESTATE_TAX_EXEMPTION_2024 = 13_610_000;
const TOP_RATE = 0.40;
const PA_LINEAL_RATE = 0.045;

export default function Dashboard() {
  const { tabs, calcs, afrResponse, scenarios, estateScenario, setView, setActiveTab, setActiveCalcId } = useAppStore();

  const s = estateScenario;
  const grossEstate = s.assets
    .filter((a) => a.includedInEstate)
    .reduce((sum, a) => sum + a.value, 0);
  const overExemption = Math.max(grossEstate - (s.filingStatus === 'married' ? ESTATE_TAX_EXEMPTION_2024 * 2 : ESTATE_TAX_EXEMPTION_2024), 0);
  const fedTax = overExemption * TOP_RATE;
  const lineals = s.beneficiaries.filter((b) => b.relation === 'lineal');
  const linealsShare = lineals.reduce((sum, b) => sum + b.sharePercent, 0) / 100;
  const paTax = (grossEstate - fedTax) * linealsShare * PA_LINEAL_RATE;
  const netToHeirs = grossEstate - fedTax - paTax;

  const chartData = [
    { name: 'Gross Estate', value: grossEstate },
    { name: 'Federal Tax',  value: fedTax },
    { name: 'PA Tax',       value: paTax },
    { name: 'Net to Heirs', value: netToHeirs },
  ];

  const afrSummary = afrResponse?.summary;
  const afrRates = afrSummary ? [
    { label: 'Short-term', annual: afrSummary.shortTerm.annual, monthly: afrSummary.shortTerm.monthly },
    { label: 'Mid-term',   annual: afrSummary.midTerm.annual,   monthly: afrSummary.midTerm.monthly },
    { label: 'Long-term',  annual: afrSummary.longTerm.annual,   monthly: afrSummary.longTerm.monthly },
  ] : [];

  const quickLinks = [
    { label: 'GRAT',               tab: 'trusts',    id: 'tru.grat',       icon: <Landmark size={14} /> },
    { label: 'IDGT Sale',          tab: 'trusts',    id: 'tru.idgt',       icon: <TrendingUp size={14} /> },
    { label: 'CRAT',               tab: 'charitable',id: 'cha.crat',       icon: <Heart size={14} /> },
    { label: 'Retirement Nest Egg',tab: 'retirement',id: 'ret.nestEgg',    icon: <Clock size={14} /> },
    { label: 'Federal Estate Tax', tab: 'estate',    id: 'est.federalTax', icon: <Landmark size={14} /> },
    { label: 'QBI Deduction',      tab: 'section199a',id: 'qbi.deduction', icon: <TrendingUp size={14} /> },
  ];

  function openCalc(tab: string, id: string) {
    setActiveTab(tab);
    setActiveCalcId(id);
    setView('calculator');
  }

  const CHART_COLORS = ['#38bdf8', '#f87171', '#fbbf24', '#34d399'];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100">Dashboard</h1>
          <p className="text-xs text-slate-400">
            {s.clientName} · {calcs.length} calculators · {tabs.length} modules
          </p>
        </div>
        {afrSummary && (
          <div className="text-right text-xs text-slate-400">
            <div className="text-amber-400 font-semibold">§7520: {afrSummary.section7520.toFixed(2)}%</div>
            <div>AFR {afrSummary.month}</div>
          </div>
        )}
      </div>

      {/* Estate summary KPI row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Gross Estate',  value: grossEstate,  color: 'text-sky-400' },
          { label: 'Federal Tax',   value: fedTax,       color: 'text-red-400' },
          { label: 'PA Inheritance',value: paTax,        color: 'text-amber-400' },
          { label: 'Net to Heirs',  value: netToHeirs,   color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card">
            <div className="label-text">{label}</div>
            <div className={`text-lg font-bold font-mono mt-1 ${color}`}>{USD(value)}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Estate tax chart */}
        <div className="col-span-2 card">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Estate Tax Exposure — {s.clientName}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={40}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0', fontSize: 12 }}
                formatter={(v: number) => [USD(v), '']}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <button
            onClick={() => setView('estate-optimizer')}
            className="mt-3 btn-secondary text-xs flex items-center gap-1.5"
          >
            Open Estate Optimizer <ArrowRight size={11} />
          </button>
        </div>

        {/* AFR rates */}
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">IRS AFR Rates</h2>
          {afrRates.length > 0 ? (
            <>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500">
                    <th className="text-left pb-1">Term</th>
                    <th className="text-right pb-1">Annual</th>
                    <th className="text-right pb-1">Monthly</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {afrRates.map((r) => (
                    <tr key={r.label} className="border-t border-slate-700">
                      <td className="py-1.5 text-slate-300">{r.label}</td>
                      <td className="py-1.5 text-right font-mono text-sky-400">{r.annual.toFixed(2)}%</td>
                      <td className="py-1.5 text-right font-mono text-slate-400">{r.monthly.toFixed(2)}%</td>
                    </tr>
                  ))}
                  {afrSummary && (
                    <tr className="border-t border-slate-600">
                      <td className="pt-2 text-amber-400 font-semibold">§7520</td>
                      <td className="pt-2 text-right font-mono text-amber-400 font-semibold" colSpan={2}>
                        {afrSummary.section7520.toFixed(2)}%
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <p className="text-[10px] text-slate-600">{afrSummary?.month} · {afrSummary?.source?.split('(')[0]}</p>
            </>
          ) : (
            <p className="text-xs text-slate-500">AFR not loaded. Check internet connection.</p>
          )}
          <button onClick={() => setView('afr')} className="btn-ghost text-xs w-full">
            Manage AFR Settings →
          </button>
        </div>
      </div>

      {/* Quick links + recent scenarios */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Quick Launch</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map(({ label, tab, id, icon }) => (
              <button
                key={id}
                onClick={() => openCalc(tab, id)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700
                           rounded-lg text-xs text-slate-300 hover:text-slate-100 transition-colors text-left"
              >
                <span className="text-sky-400">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Recent Scenarios</h2>
          {scenarios.length === 0 ? (
            <p className="text-xs text-slate-500">No saved scenarios yet. Use Save in the calculator panel.</p>
          ) : (
            <div className="space-y-2">
              {scenarios.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{s.name}</span>
                  <span className="text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
