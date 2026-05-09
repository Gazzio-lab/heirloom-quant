/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppStore, AfrSettings } from '../../stores/appStore';

const cruncher = () => (window as any).cruncher;

export default function AfrPanel() {
  const { afrResponse, setAfrResponse, setStatus } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  const settings = afrResponse?.settings;
  const summary  = afrResponse?.summary;

  async function updateSettings(partial: Partial<AfrSettings>) {
    if (!settings) return;
    const next: AfrSettings = { ...settings, ...partial };
    await cruncher().afr.saveSettings(next);
    const updated = await cruncher().afr.getCurrent();
    setAfrResponse(updated);
  }

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const result = await cruncher().afr.refresh();
      const updated = await cruncher().afr.getCurrent();
      setAfrResponse(updated);
      setRefreshMsg({ ok: result.success, msg: result.message });
      setStatus(result.success ? 'AFR rates updated.' : `AFR: ${result.message}`);
    } catch (e: any) {
      setRefreshMsg({ ok: false, msg: e?.message ?? 'Unknown error' });
    } finally {
      setRefreshing(false);
    }
  }

  const termLabels: Record<string, string> = {
    annual: 'Annual', semiannual: 'Semiannual', quarterly: 'Quarterly', monthly: 'Monthly',
  };

  const comps = ['annual', 'semiannual', 'quarterly', 'monthly'] as const;
  const terms = [
    { key: 'shortTerm',  label: 'Short-term (≤3 yr)', data: summary?.shortTerm },
    { key: 'midTerm',    label: 'Mid-term (3–9 yr)',  data: summary?.midTerm },
    { key: 'longTerm',   label: 'Long-term (>9 yr)',  data: summary?.longTerm },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-100">IRS Applicable Federal Rates</h1>
          {summary && (
            <p className="text-xs text-slate-400 mt-0.5">
              {summary.month} · {summary.source?.split('(')[0].trim()}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : '↺ Refresh from IRS'}
        </button>
      </div>

      {refreshMsg && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs
          ${refreshMsg.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {refreshMsg.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
          {refreshMsg.msg}
        </div>
      )}

      {/* Settings */}
      {settings && (
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Default Rate Settings</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.useAfrAsDefault}
              onChange={(e) => updateSettings({ useAfrAsDefault: e.target.checked })}
              className="w-4 h-4 accent-sky-400"
            />
            <span className="text-sm text-slate-300">Use IRS AFR as default for applicable rate fields</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Term Override</label>
              <select
                value={settings.termOverride}
                onChange={(e) => updateSettings({ termOverride: e.target.value as AfrSettings['termOverride'] })}
                className="select-field"
              >
                <option value="auto">Auto (per calculator)</option>
                <option value="short">Short-term (≤3 yr)</option>
                <option value="mid">Mid-term (3–9 yr)</option>
                <option value="long">Long-term (&gt;9 yr)</option>
              </select>
            </div>
            <div>
              <label className="label-text">Compounding</label>
              <select
                value={settings.compounding}
                onChange={(e) => updateSettings({ compounding: e.target.value as AfrSettings['compounding'] })}
                className="select-field"
              >
                {comps.map((c) => <option key={c} value={c}>{termLabels[c]}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Full rate table */}
      {summary ? (
        <div className="card overflow-x-auto">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Current AFR Rates — {summary.month}</h2>
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="pb-2 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Term</th>
                {comps.map((c) => (
                  <th key={c} className="pb-2 text-right text-slate-400 font-semibold text-xs uppercase tracking-wide">
                    {termLabels[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {terms.map(({ key, label, data }) => data && (
                <tr key={key} className="border-t border-slate-700/50">
                  <td className="py-2 text-slate-200 font-medium">{label}</td>
                  {comps.map((c) => (
                    <td key={c} className="py-2 text-right font-mono text-sky-400">
                      {(data as any)[c]?.toFixed(2)}%
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-slate-600">
                <td className="pt-3 text-amber-400 font-semibold">§7520 Rate</td>
                <td className="pt-3 text-right font-mono text-amber-400 font-bold" colSpan={4}>
                  {summary.section7520.toFixed(2)}% (120% × Mid-term Annual)
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-[10px] text-slate-600 mt-3">
            Source: {summary.source} · Updated: {new Date(summary.updatedAt).toLocaleDateString()}
          </p>
        </div>
      ) : (
        <div className="card text-sm text-slate-400">
          <p>No AFR data loaded. Click <strong>↺ Refresh from IRS</strong> to fetch the latest rates.</p>
          <p className="mt-1 text-xs text-slate-500">Built-in fallback rates (April 2025) will be used until connected.</p>
        </div>
      )}

      {/* Reference */}
      <div className="card bg-slate-800/30 space-y-2 text-xs text-slate-400">
        <p className="font-semibold text-slate-300">AFR Reference Guide</p>
        <p>· <strong>Short-term</strong> (≤3 yr): intra-family demand/short-term loans, §7872 loans</p>
        <p>· <strong>Mid-term</strong> (3–9 yr): GRAT §7520 (×1.2), SCIN, IDGT installment notes, private annuities</p>
        <p>· <strong>Long-term</strong> (&gt;9 yr): SCIN long-term, life insurance premiums, long debt</p>
        <p>· <strong>§7520</strong> = 120% × monthly mid-term AFR; used for GRATs, QPRTs, CRATs, split-interest trusts</p>
        <p className="text-slate-600 italic">For planning estimates only — verify official IRS rates before filing or advising.</p>
      </div>
    </div>
  );
}
