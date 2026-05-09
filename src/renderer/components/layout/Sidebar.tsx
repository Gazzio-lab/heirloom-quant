import React, { useState } from 'react';
import {
  LayoutDashboard, TrendingUp, Wind, Home, ShieldCheck, PieChart,
  Target, Calculator, BarChart2, ScrollText, Heart, Lightbulb,
  DollarSign, Briefcase, Clock, Percent, ChevronDown, ChevronRight,
  LineChart, Landmark, Settings, RefreshCw,
} from 'lucide-react';
import { useAppStore, Tab, Calc } from '../../stores/appStore';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: 'section' | 'tab' | 'special';
}

const TAB_ICONS: Record<string, React.ReactNode> = {
  investment:  <TrendingUp size={14} />,
  inflation:   <Wind size={14} />,
  realestate:  <Home size={14} />,
  insurance:   <ShieldCheck size={14} />,
  networth:    <PieChart size={14} />,
  goals:       <Target size={14} />,
  budgeting:   <Calculator size={14} />,
  valuation:   <BarChart2 size={14} />,
  estate:      <ScrollText size={14} />,
  trusts:      <Landmark size={14} />,
  charitable:  <Heart size={14} />,
  techniques:  <Lightbulb size={14} />,
  taxes:       <DollarSign size={14} />,
  retirement:  <Briefcase size={14} />,
  pvfv:        <Clock size={14} />,
  section199a: <Percent size={14} />,
  estateplanning: <ScrollText size={14} />,
};

export default function Sidebar() {
  const { view, activeTab, activeCalcId, tabs, byCategory, setView, setActiveTab, setActiveCalcId } = useAppStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const selectCalc = (tab: Tab, calc: Calc) => {
    setActiveTab(tab.id);
    setActiveCalcId(calc.id);
    setView('calculator');
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-700/60 flex flex-col h-full overflow-hidden">
      {/* Brand */}
      <div className="px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <LineChart size={18} className="text-sky-400" />
          <span className="font-bold text-slate-100 text-sm">Heirloom Quant</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5">Estate · Tax · Financial Planning</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {/* Dashboard */}
        <button
          onClick={() => setView('dashboard')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
            ${view === 'dashboard'
              ? 'bg-sky-500/15 text-sky-400 font-medium'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}
        >
          <LayoutDashboard size={14} />
          Dashboard
        </button>

        {/* Divider */}
        <div className="my-2 border-t border-slate-700/50" />

        {/* Calculator tabs */}
        {tabs.map((tab) => {
          const calcs = byCategory[tab.id] ?? [];
          const isActiveTab = activeTab === tab.id && view === 'calculator';
          const isOpen = expanded[tab.id] ?? isActiveTab;

          return (
            <div key={tab.id}>
              <button
                onClick={() => {
                  toggle(tab.id);
                  if (calcs.length > 0 && !isOpen) {
                    selectCalc(tab, calcs[0]);
                  }
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors
                  ${isActiveTab
                    ? 'bg-sky-500/10 text-sky-400 font-medium'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}
              >
                <span className="flex items-center gap-2">
                  {TAB_ICONS[tab.id] ?? <Calculator size={14} />}
                  {tab.label}
                </span>
                {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>

              {isOpen && calcs.length > 0 && (
                <div className="mt-0.5 mb-1 ml-4 space-y-0.5 border-l border-slate-700/50 pl-2">
                  {calcs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCalc(tab, c)}
                      className={`w-full text-left px-2 py-1 rounded text-[11px] transition-colors truncate
                        ${activeCalcId === c.id && isActiveTab
                          ? 'bg-sky-500/20 text-sky-300 font-medium'
                          : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Divider */}
        <div className="my-2 border-t border-slate-700/50" />

        {/* Special modules */}
        <button
          onClick={() => setView('estate-optimizer')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
            ${view === 'estate-optimizer'
              ? 'bg-amber-500/15 text-amber-400 font-medium'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}
        >
          <Lightbulb size={14} className="text-amber-400" />
          Estate Optimizer
        </button>

        <button
          onClick={() => setView('afr')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
            ${view === 'afr'
              ? 'bg-emerald-500/15 text-emerald-400 font-medium'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}
        >
          <RefreshCw size={14} className="text-emerald-400" />
          AFR Rates
        </button>
      </nav>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-700/60">
        <p className="text-[10px] text-slate-600">
          For planning estimates only — verify official IRS rates.
        </p>
      </div>
    </aside>
  );
}
