/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import StatusBar from './components/layout/StatusBar';
import Dashboard from './components/dashboard/Dashboard';
import CalculatorPanel from './components/calculator/CalculatorPanel';
import EstateOptimizer from './components/estate/EstateOptimizer';
import AfrPanel from './components/afr/AfrPanel';
import { useAppStore } from './stores/appStore';

const cruncher = () => (window as any).cruncher;

export default function App() {
  const { view, setTabs, setAfrResponse, setStatus } = useAppStore();

  useEffect(() => {
    // Boot: load tabs/calcs and AFR
    async function init() {
      try {
        const [tabs, calcs] = await Promise.all([
          cruncher().listTabs(),
          cruncher().listCalculators(),
        ]);
        setTabs(tabs, calcs);
      } catch (e: any) {
        setStatus(`Init error: ${e?.message ?? e}`);
      }

      try {
        const afr = await cruncher().afr.getCurrent();
        setAfrResponse(afr);
      } catch { /* AFR optional */ }
    }

    init();

    // Accelerators from main process — wire all menu/keyboard shortcuts to the React UI.
    // The header buttons carry IDs so we can proxy clicks; the store handles state changes.
    cruncher().onAction?.((action: string) => {
      const store = useAppStore.getState();
      switch (action) {
        case 'action:new-scenario':
          store.setLastResult(null, {});
          store.setStatus('New scenario.');
          break;
        case 'action:open-scenario':
          // Navigate to calculator view, then trigger the header’s Open button
          store.setView('calculator');
          setTimeout(() => document.getElementById('btn-load')?.click(), 50);
          break;
        case 'action:save-scenario':
          document.getElementById('btn-save')?.click();
          break;
        case 'action:export-csv':
          document.getElementById('btn-export')?.click();
          break;
        case 'action:open-estate-optimizer':
          store.setView('estate-optimizer');
          break;
      }
    });
  }, []);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          {view === 'dashboard'         && <Dashboard />}
          {view === 'calculator'        && <CalculatorPanel />}
          {view === 'estate-optimizer'  && <EstateOptimizer />}
          {view === 'afr'               && <AfrPanel />}
        </main>
        <StatusBar />
      </div>
    </div>
  );
}
