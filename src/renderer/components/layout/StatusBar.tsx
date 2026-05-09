import React from 'react';
import { useAppStore } from '../../stores/appStore';

export default function StatusBar() {
  const { status, afrResponse } = useAppStore();
  const s7520 = afrResponse?.summary?.section7520;

  return (
    <footer className="h-6 flex items-center justify-between px-4 bg-slate-950 border-t border-slate-700/40 flex-shrink-0 text-[10px] text-slate-500">
      <span>{status}</span>
      <span className="flex items-center gap-4">
        {s7520 != null && (
          <span className="text-amber-500/80">§7520: {s7520.toFixed(2)}%</span>
        )}
        {afrResponse?.summary?.month && (
          <span>AFR: {afrResponse.summary.month}</span>
        )}
        <span>© Heirloom Quant</span>
      </span>
    </footer>
  );
}
