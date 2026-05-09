/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Save, FolderOpen, FileDown, Sun, Moon, FileText } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export default function Header() {
  const {
    view, activeCalcId, calcs, lastResult, lastInputs,
    setStatus, addScenario, theme, toggleTheme,
  } = useAppStore();

  const calc = calcs.find((c) => c.id === activeCalcId);

  async function handleSave() {
    if (!calc || !lastResult) { setStatus('Nothing to save.'); return; }
    const scenario = {
      id: `sc-${Date.now()}`,
      name: calc.name,
      createdAt: new Date().toISOString(),
      calculatorId: calc.id,
      inputs: lastInputs,
      result: lastResult,
    };
    const r = await (window as any).cruncher.saveScenario(scenario);
    if (r.canceled) setStatus('Save canceled.');
    else if (r.error) setStatus(`Save error: ${r.error}`);
    else { addScenario(scenario); setStatus(`Saved to ${r.filePath}`); }
  }

  async function handleLoad() {
    const r = await (window as any).cruncher.loadScenario();
    if (r.canceled) return;
    if (r.error || !r.scenario) { setStatus(`Load error: ${r.error ?? 'unknown'}`); return; }
    setStatus(`Loaded: ${r.scenario.name}`);
  }

  async function handleExportCSV() {
    if (!lastResult) { setStatus('No results to export.'); return; }
    const rows = lastResult.schedule?.length
      ? lastResult.schedule
      : Object.entries(lastResult.summary).map(([metric, value]) => ({ metric, value }));
    const r = await (window as any).cruncher.exportCSV(rows, `${calc?.id ?? 'export'}.csv`);
    if (r.canceled) setStatus('Export canceled.');
    else if (r.error) setStatus(`Export error: ${r.error}`);
    else setStatus(`Exported to ${r.filePath}`);
  }

  async function handleExportPDF() {
    const r = await (window as any).cruncher.exportPDF();
    if (!r || r.error) setStatus(`PDF error: ${r?.error ?? 'unknown'}`);
    else setStatus(`PDF saved to ${r.filePath}`);
  }

  return (
    <header className="h-10 flex items-center justify-between px-4 bg-slate-900 border-b border-slate-700/60 flex-shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-slate-400">
        {view === 'calculator' && calc ? (
          <>
            <span className="text-slate-500">{calc.category}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200">{calc.name}</span>
          </>
        ) : view === 'estate-optimizer' ? (
          <span className="text-amber-400">Estate Optimizer</span>
        ) : view === 'afr' ? (
          <span className="text-emerald-400">AFR Rates</span>
        ) : (
          <span className="text-slate-200">Dashboard</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {view === 'calculator' && (
          <>
            <button onClick={handleSave}      className="btn-ghost flex items-center gap-1"><Save size={12} />Save</button>
            <button onClick={handleLoad}      className="btn-ghost flex items-center gap-1"><FolderOpen size={12} />Open</button>
            <button onClick={handleExportCSV} className="btn-ghost flex items-center gap-1"><FileDown size={12} />CSV</button>
            <button onClick={handleExportPDF} className="btn-ghost flex items-center gap-1"><FileText size={12} />PDF</button>
            <div className="w-px h-4 bg-slate-700 mx-1" />
          </>
        )}
        <button onClick={toggleTheme} className="btn-ghost p-1.5">
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>
      </div>
    </header>
  );
}
