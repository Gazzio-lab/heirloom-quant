/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { useAppStore, FieldDef, CalcResult } from '../../stores/appStore';

const cruncher = () => (window as any).cruncher;

// ---- formatting helpers ------------------------------------------------

function fmt(label: string, v: number | string): string {
  if (typeof v === 'string') return v;
  if (!Number.isFinite(v)) return '—';
  const l = label.toLowerCase();
  const isMoney =
    Math.abs(v) >= 1_000 ||
    /value|payment|balance|income|cost|savings|tax|gain|coverage|net|annuity|benefit|estate|shortfall|worth|exclusion|limit|contribution|payout|deduction|remainder/.test(l);
  const isRate =
    /rate|return|yield|ratio|irr|cagr|hpr|mirr|discount|savings rate|probability|phase/.test(l);

  if (isRate && Math.abs(v) <= 1.5) {
    return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v);
  }
  if (isMoney) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(v);
}

// ---- AFR helpers -------------------------------------------------------

function getAfrRate(
  afrLinked: FieldDef['afrLinked'],
  afrResponse: any,
): number | null {
  if (!afrLinked || !afrResponse?.data || !afrResponse?.settings?.useAfrAsDefault) return null;
  const s = afrResponse.settings;
  const effectiveTerm: string = s.termOverride !== 'auto' ? s.termOverride : afrLinked.term;
  const comp: string = s.compounding;
  const termData: any =
    effectiveTerm === 'short' ? afrResponse.data.short_term :
    effectiveTerm === 'mid'   ? afrResponse.data.mid_term   :
                                afrResponse.data.long_term;
  const base = (termData[comp] ?? termData.annual) as number;
  return base * (afrLinked.multiplier ?? 1);
}

function afrBadge(afrLinked: FieldDef['afrLinked'], rate: number, settings: any): string {
  const termMap: Record<string, string> = { short: 'Short-term', mid: 'Mid-term', long: 'Long-term' };
  const compMap: Record<string, string> = {
    annual: 'Annual', semiannual: 'Semiannual', quarterly: 'Quarterly', monthly: 'Monthly',
  };
  const effectiveTerm = settings?.termOverride !== 'auto' ? settings?.termOverride : afrLinked?.term;
  const comp = settings?.compounding ?? afrLinked?.compounding;
  const tLabel = termMap[effectiveTerm ?? ''] ?? effectiveTerm;
  const cLabel = compMap[comp ?? ''] ?? comp;
  return afrLinked?.multiplier
    ? `§7520 (120% × ${tLabel} · ${cLabel}): ${rate.toFixed(2)}%`
    : `IRS AFR · ${tLabel} · ${cLabel}: ${rate.toFixed(2)}%`;
}

// ---- sub-components ----------------------------------------------------

function InputField({
  field, value, onChange, afrResponse,
}: {
  field: FieldDef;
  value: string;
  onChange: (name: string, v: string) => void;
  afrResponse: any;
}) {
  const afrRate = getAfrRate(field.afrLinked, afrResponse);
  const displayValue = value !== '' ? value : (afrRate != null ? afrRate.toFixed(2) : String(field.default ?? ''));

  return (
    <div className="mb-3">
      <label className="label-text">{field.label}</label>
      {field.type === 'select' ? (
        <select
          value={displayValue}
          onChange={(e) => onChange(field.name, e.target.value)}
          className="select-field"
        >
          {field.options?.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          inputMode={field.type === 'text' ? 'text' : 'decimal'}
          placeholder={field.type}
          value={displayValue}
          onChange={(e) => onChange(field.name, e.target.value)}
          className="input-field"
        />
      )}
      {field.afrLinked && afrRate != null && (
        <div className="afr-badge">{afrBadge(field.afrLinked, afrRate, afrResponse?.settings)}</div>
      )}
      {field.help && <p className="text-[10px] text-slate-500 mt-1">{field.help}</p>}
    </div>
  );
}

function KpiCard({ label, value, primary }: { label: string; value: number | string; primary: boolean }) {
  return (
    <div className={`bg-slate-800 rounded-xl p-4 border ${primary ? 'border-sky-500/30' : 'border-slate-700'}`}>
      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
      <div className={`mt-1.5 text-xl font-bold font-mono tabular-nums ${primary ? 'text-emerald-400' : 'text-sky-300'}`}>
        {fmt(label, value)}
      </div>
    </div>
  );
}

function DataTable({ schedule }: { schedule: Array<Record<string, number | string>> }) {
  if (!schedule.length) return null;
  const headers = Object.keys(schedule[0]);
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-auto max-h-72">
      <table className="w-full text-xs tabular-nums border-collapse">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="sticky top-0 bg-slate-700/80 px-3 py-2 text-right first:text-left text-slate-300 font-semibold uppercase text-[10px] tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {schedule.map((row, i) => (
            <tr key={i} className="border-t border-slate-700/50 hover:bg-slate-700/30">
              {headers.map((h) => (
                <td key={h} className="px-3 py-1.5 text-right first:text-left text-slate-300">
                  {typeof row[h] === 'number' ? fmt(h, row[h] as number) : String(row[h])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- main panel --------------------------------------------------------

export default function CalculatorPanel() {
  const { activeCalcId, calcs, afrResponse, setLastResult, setStatus } = useAppStore();
  const calc = calcs.find((c) => c.id === activeCalcId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CalcResult | null>(null);
  const runRef = useRef(0);

  // Reset form when calculator changes
  useEffect(() => {
    setValues({});
    setResult(null);
    if (calc) runCalc({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCalcId]);

  const buildInputs = useCallback(
    (overrides: Record<string, string> = values) => {
      if (!calc) return {};
      const out: Record<string, any> = {};
      for (const f of calc.inputs) {
        const raw = overrides[f.name] ?? '';
        const afrRate = getAfrRate(f.afrLinked, afrResponse);

        if (f.type === 'text' || f.type === 'select' || f.type === 'date') {
          out[f.name] = raw || String(f.default ?? '');
        } else {
          const str = raw !== '' ? raw : (afrRate != null ? String(afrRate.toFixed(2)) : String(f.default ?? '0'));
          const n = parseFloat(str.replace(/[$,]/g, ''));
          out[f.name] = Number.isFinite(n) ? n : 0;
        }
      }
      return out;
    },
    [calc, values, afrResponse],
  );

  const runCalc = useCallback(async (overrides?: Record<string, string>) => {
    if (!calc) return;
    const ticket = ++runRef.current;
    setStatus('Calculating…');
    try {
      const inputs = buildInputs(overrides ?? values);
      const resp = await cruncher().run(calc.id, inputs);
      if (ticket !== runRef.current) return;
      if (resp.error) {
        setStatus(`Error: ${resp.error}`);
        setResult({ summary: { Error: resp.error } });
        setLastResult(null, inputs);
      } else {
        setResult(resp.result);
        setLastResult(resp.result, inputs);
        setStatus('Calculated.');
      }
    } catch (e: any) {
      setStatus(`Error: ${e?.message ?? e}`);
    }
  }, [calc, values, buildInputs]);

  function handleChange(name: string, val: string) {
    const next = { ...values, [name]: val };
    setValues(next);
    runCalc(next);
  }

  function resetForm() {
    setValues({});
    runCalc({});
  }

  if (!calc) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Select a calculator from the sidebar
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Inputs */}
      <div className="w-80 flex-shrink-0 bg-slate-900/50 border-r border-slate-700/60 overflow-y-auto p-4">
        <h2 className="font-semibold text-slate-100 text-sm mb-1">{calc.name}</h2>
        <p className="text-[11px] text-slate-400 mb-4">{calc.description}</p>

        {calc.inputs.map((f) => (
          <InputField
            key={f.name}
            field={f}
            value={values[f.name] ?? ''}
            onChange={handleChange}
            afrResponse={afrResponse}
          />
        ))}

        <div className="flex gap-2 mt-4">
          <button onClick={() => runCalc()} className="btn-primary flex-1 flex items-center justify-center gap-1.5">
            <RefreshCw size={12} /> Recalculate
          </button>
          <button onClick={resetForm} className="btn-secondary flex items-center gap-1.5">
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {result && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {Object.entries(result.summary).map(([k, v], i) => (
                <KpiCard key={k} label={k} value={v} primary={i === 0} />
              ))}
            </div>

            {/* Schedule table */}
            {result.schedule && result.schedule.length > 0 && (
              <DataTable schedule={result.schedule} />
            )}

            {/* Notes */}
            {result.notes && result.notes.length > 0 && (
              <ul className="list-disc pl-5 text-[11px] text-slate-400 space-y-1">
                {result.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
