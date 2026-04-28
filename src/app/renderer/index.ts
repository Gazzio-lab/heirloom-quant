/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Heirloom Quant — renderer entrypoint.
 *
 * The renderer never imports from /core or /calculators directly:
 * it talks to the main process exclusively via window.cruncher (preload).
 * That keeps the renderer browser-safe and platform-agnostic.
 */

// ---- Local type declarations (mirror main-process types) ---------------

interface FieldDef {
  name: string;
  label: string;
  type: 'number' | 'currency' | 'percent' | 'integer' | 'text' | 'select' | 'date';
  default?: number | string;
  options?: { value: string | number; label: string }[];
  help?: string;
  afrLinked?: {
    term: 'short' | 'mid' | 'long';
    compounding: 'annual' | 'semiannual' | 'quarterly' | 'monthly';
    multiplier?: number;
  };
}
interface Calc {
  id: string; name: string; category: string; description: string; inputs: FieldDef[];
}
interface Tab { id: string; label: string; }
interface CalcResult {
  summary: Record<string, number | string>;
  schedule?: Array<Record<string, number | string>>;
  notes?: string[];
}

// AFR types (duplicated here since renderer cannot import from /core)
interface AfrTermRates {
  annual: number; semiannual: number; quarterly: number; monthly: number;
}
interface AfrData {
  month: string; updatedAt: string; source: string;
  short_term: AfrTermRates; mid_term: AfrTermRates; long_term: AfrTermRates;
}
interface AfrSettings {
  useAfrAsDefault: boolean;
  termOverride: 'auto' | 'short' | 'mid' | 'long';
  compounding: 'annual' | 'semiannual' | 'quarterly' | 'monthly';
}
interface AfrSummary {
  shortTerm: AfrTermRates; midTerm: AfrTermRates; longTerm: AfrTermRates;
  section7520: number; month: string; source: string; updatedAt: string;
}
interface AfrResponse {
  data: AfrData; settings: AfrSettings; summary: AfrSummary;
}

declare global {
  interface Window {
    cruncher: {
      listTabs: () => Promise<Tab[]>;
      listCalculators: () => Promise<Calc[]>;
      run: (id: string, inputs: Record<string, any>) =>
        Promise<{ result?: CalcResult; error?: string }>;
      saveScenario: (s: any) => Promise<{ filePath?: string; canceled?: boolean; error?: string }>;
      loadScenario: () => Promise<{ scenario?: any; canceled?: boolean; error?: string }>;
      exportCSV: (rows: any[], suggestedName?: string) =>
        Promise<{ filePath?: string; canceled?: boolean; error?: string }>;
      onAction: (cb: (action: string) => void) => void;
      afr: {
        getCurrent:   () => Promise<AfrResponse>;
        refresh:      () => Promise<{ success: boolean; message: string; summary?: AfrSummary }>;
        getSettings:  () => Promise<AfrSettings>;
        saveSettings: (s: AfrSettings) => Promise<{ ok: boolean }>;
      };
    };
  }
}

// ---- Utilities ----------------------------------------------------------

const $ = <T extends HTMLElement = HTMLElement>(sel: string) =>
  document.querySelector(sel) as T;

// ---- Application state --------------------------------------------------

const state = {
  tabs:          [] as Tab[],
  calcs:         [] as Calc[],
  byCategory:    {} as Record<string, Calc[]>,
  activeTab:     '',
  activeCalcId:  '',
  lastResult:    null as CalcResult | null,
  lastInputs:    {} as Record<string, any>,
};

const afrState = {
  data:     null as AfrData | null,
  settings: null as AfrSettings | null,
  summary:  null as AfrSummary | null,
};

// ---- Formatters ---------------------------------------------------------

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 2,
  }).format(n);
}
function fmtPercent(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 4,
  }).format(n);
}
function fmtNumber(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(n);
}
function smartFormat(label: string, v: number | string): string {
  if (typeof v === 'string') return v;
  if (!Number.isFinite(v)) return '\u2014';
  const l = label.toLowerCase();
  if (
    l.includes('rate') || l.includes('return') || l.includes('yield') ||
    l.includes('ratio') || l.includes('irr')  || l.includes('cagr') ||
    l.includes('hpr')  || l.includes('mirr')  || l.includes('discount') ||
    l.includes('savings rate') || l.includes('probability') || l.includes('phase')
  ) {
    if (Math.abs(v) <= 1.5) return fmtPercent(v);
  }
  if (
    Math.abs(v) >= 1000 ||
    l.includes('value')    || l.includes('payment')  || l.includes('balance') ||
    l.includes('income')   || l.includes('cost')     || l.includes('savings') ||
    l.includes('tax')      || l.includes('gain')     || l.includes('coverage') ||
    l.includes('net')      || l.includes('annuity')  || l.includes('benefit') ||
    l.includes('estate')   || l.includes('shortfall')|| l.includes('worth') ||
    l.includes('exclusion')|| l.includes('limit')    || l.includes('contribution')
  ) {
    return fmtCurrency(v);
  }
  return fmtNumber(v);
}

// ---- AFR helpers --------------------------------------------------------

type AfrLinked = NonNullable<FieldDef['afrLinked']>;

/**
 * Compute the AFR-derived rate (as a %) for a field, respecting global settings.
 * Returns null when AFR is disabled or data is unavailable.
 */
function getAFRRate(field: AfrLinked): number | null {
  if (!afrState.data || !afrState.settings?.useAfrAsDefault) return null;
  const settings = afrState.settings;

  const effectiveTerm: 'short' | 'mid' | 'long' =
    settings.termOverride !== 'auto' ? settings.termOverride : field.term;

  const comp = settings.compounding;
  const termData =
    effectiveTerm === 'short' ? afrState.data.short_term :
    effectiveTerm === 'mid'   ? afrState.data.mid_term   :
                                afrState.data.long_term;

  const base = termData[comp] ?? termData.annual;
  return base * (field.multiplier ?? 1);
}

function _termLabel(t: 'short' | 'mid' | 'long'): string {
  return t === 'short' ? 'Short-term' : t === 'mid' ? 'Mid-term' : 'Long-term';
}
function _compLabel(c: string): string {
  const m: Record<string, string> = {
    annual: 'Annual', semiannual: 'Semiannual',
    quarterly: 'Quarterly', monthly: 'Monthly',
  };
  return m[c] ?? c;
}

function afrBadgeText(field: AfrLinked, rate: number): string {
  if (!afrState.settings) return '';
  const effectiveTerm: 'short' | 'mid' | 'long' =
    afrState.settings.termOverride !== 'auto'
      ? afrState.settings.termOverride
      : field.term;
  const comp   = _compLabel(afrState.settings.compounding);
  const term   = _termLabel(effectiveTerm);
  const pct    = rate.toFixed(2);
  return field.multiplier
    ? `\u00a77520 (120% \u00d7 ${term} AFR \u00b7 ${comp}): ${pct}%`
    : `IRS AFR \u00b7 ${term} \u00b7 ${comp}: ${pct}%`;
}

// ---- Initialization -----------------------------------------------------

async function init() {
  // Load AFR data first (non-blocking)
  try {
    const resp = await window.cruncher.afr.getCurrent();
    afrState.data     = resp.data;
    afrState.settings = resp.settings;
    afrState.summary  = resp.summary;
    renderAfrPanel();
  } catch { /* AFR unavailable \u2014 static defaults will be used */ }

  state.tabs  = await window.cruncher.listTabs();
  state.calcs = await window.cruncher.listCalculators();
  state.byCategory = {};
  for (const t of state.tabs) state.byCategory[t.id] = [];
  for (const c of state.calcs) (state.byCategory[c.category] ??= []).push(c);

  renderTabs();
  const firstTab = state.tabs.find(t => state.byCategory[t.id]?.length) ?? state.tabs[0];
  if (firstTab) selectTab(firstTab.id);

  // Toolbar buttons
  $('#btn-new').addEventListener('click', () => resetForm());
  $('#btn-load').addEventListener('click', () => loadScenario());
  $('#btn-save').addEventListener('click', () => saveScenario());
  $('#btn-export').addEventListener('click', () => exportCSV());
  $('#btn-afr').addEventListener('click', () => openAfrPanel());

  // AFR panel controls
  $('#afr-close').addEventListener('click', () => closeAfrPanel());
  ($('#afr-use-default') as HTMLInputElement).addEventListener('change', onAfrToggleChanged);
  ($('#afr-term')        as HTMLSelectElement).addEventListener('change', onAfrSettingChanged);
  ($('#afr-compounding') as HTMLSelectElement).addEventListener('change', onAfrSettingChanged);
  $('#afr-refresh').addEventListener('click', onAfrRefresh);

  // Accelerators from main process
  window.cruncher.onAction((a) => {
    if (a === 'action:new-scenario') resetForm();
    if (a === 'action:open-scenario') loadScenario();
    if (a === 'action:save-scenario') saveScenario();
    if (a === 'action:export-csv')    exportCSV();
  });
}

// ---- Tab / calculator navigation ----------------------------------------

function renderTabs() {
  const nav = $('#tabs');
  nav.innerHTML = '';
  for (const t of state.tabs) {
    const el = document.createElement('div');
    el.className  = 'tab';
    el.dataset.id = t.id;
    el.textContent = t.label;
    el.addEventListener('click', () => selectTab(t.id));
    nav.appendChild(el);
  }
}

function selectTab(id: string) {
  state.activeTab = id;
  for (const el of document.querySelectorAll<HTMLElement>('.tab')) {
    el.classList.toggle('active', el.dataset.id === id);
  }
  renderCalcList();
  const first = state.byCategory[id]?.[0];
  if (first) selectCalculator(first.id);
  else clearWorkarea();
}

function renderCalcList() {
  const list = $('#calc-list');
  list.innerHTML = '';
  const calcs = state.byCategory[state.activeTab] ?? [];
  if (!calcs.length) {
    list.innerHTML = `<div style="padding:16px;color:var(--muted);font-size:12px;">
      No calculators available in this tab yet.</div>`;
    return;
  }
  for (const c of calcs) {
    const el = document.createElement('div');
    el.className  = 'calc-item';
    el.dataset.id = c.id;
    el.innerHTML  = `<div class="name"></div><div class="desc"></div>`;
    (el.querySelector('.name') as HTMLElement).textContent = c.name;
    (el.querySelector('.desc') as HTMLElement).textContent = c.description;
    el.addEventListener('click', () => selectCalculator(c.id));
    list.appendChild(el);
  }
}

function clearWorkarea() {
  ($('#calc-title')   as HTMLElement).textContent     = 'Select a calculator';
  ($('#calc-desc')    as HTMLElement).textContent     = '';
  ($('#inputs-form')  as HTMLFormElement).innerHTML   = '';
  ($('#kpis')         as HTMLElement).innerHTML       = '';
  ($('#schedule')     as HTMLElement).innerHTML       = '';
  ($('#notes')        as HTMLElement).innerHTML       = '';
}

function selectCalculator(id: string) {
  state.activeCalcId = id;
  const calc = state.calcs.find(c => c.id === id);
  if (!calc) return;
  for (const el of document.querySelectorAll<HTMLElement>('.calc-item')) {
    el.classList.toggle('active', el.dataset.id === id);
  }
  ($('#calc-title') as HTMLElement).textContent = calc.name;
  ($('#calc-desc')  as HTMLElement).textContent = calc.description;
  renderForm(calc);
  runCurrent();
}

// ---- Form rendering + AFR injection -------------------------------------

function renderForm(calc: Calc) {
  const form = $('#inputs-form') as HTMLFormElement;
  form.innerHTML = '';

  for (const f of calc.inputs) {
    const lbl  = document.createElement('label');
    const span = document.createElement('span');
    span.className  = 'lbl';
    span.textContent = f.label;
    lbl.appendChild(span);

    let input: HTMLInputElement | HTMLSelectElement;
    if (f.type === 'select') {
      input = document.createElement('select');
      for (const opt of f.options ?? []) {
        const o = document.createElement('option');
        o.value       = String(opt.value);
        o.textContent = opt.label;
        input.appendChild(o);
      }
      input.value = String(f.default ?? f.options?.[0]?.value ?? '');
    } else {
      input = document.createElement('input');
      input.type        = (f.type === 'text' || f.type === 'date') ? f.type : 'text';
      input.placeholder = f.type;

      // Inject AFR default when available; fall back to static default
      const afrRate = f.afrLinked ? getAFRRate(f.afrLinked) : null;
      input.value = afrRate !== null
        ? afrRate.toFixed(2)
        : (f.default !== undefined ? String(f.default) : '');
    }

    input.name               = f.name;
    input.dataset.fieldType  = f.type;
    input.addEventListener('change', () => runCurrent());
    input.addEventListener('blur',   () => runCurrent());
    lbl.appendChild(input);

    // AFR badge — shown only when AFR is active for this field
    if (f.afrLinked) {
      const rate = getAFRRate(f.afrLinked);
      if (rate !== null) {
        const badge       = document.createElement('div');
        badge.className   = 'afr-badge';
        badge.textContent = afrBadgeText(f.afrLinked, rate);
        lbl.appendChild(badge);
      }
    }

    // Regular help text
    if (f.help) {
      const h       = document.createElement('div');
      h.className   = 'help';
      h.textContent = f.help;
      lbl.appendChild(h);
    }
    form.appendChild(lbl);
  }

  // Action buttons
  const actions  = document.createElement('div');
  actions.className = 'calc-actions';
  const runBtn   = document.createElement('button');
  runBtn.type    = 'button';
  runBtn.textContent = 'Recalculate';
  runBtn.addEventListener('click', (e) => { e.preventDefault(); runCurrent(); });
  actions.appendChild(runBtn);
  const resetBtn = document.createElement('button');
  resetBtn.type      = 'button';
  resetBtn.className = 'secondary';
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', (e) => { e.preventDefault(); resetForm(); });
  actions.appendChild(resetBtn);
  form.appendChild(actions);
}

// ---- Form read / run / result -------------------------------------------

function readForm(): Record<string, any> {
  const out: Record<string, any> = {};
  const calc = state.calcs.find(c => c.id === state.activeCalcId);
  if (!calc) return out;
  const form = $('#inputs-form') as HTMLFormElement;
  for (const f of calc.inputs) {
    const el = form.elements.namedItem(f.name) as HTMLInputElement | HTMLSelectElement | null;
    if (!el) continue;
    if (f.type === 'text' || f.type === 'select' || f.type === 'date') {
      out[f.name] = el.value;
    } else {
      const v = parseFloat(el.value.replace(/[, $]/g, ''));
      out[f.name] = Number.isFinite(v) ? v : 0;
    }
  }
  return out;
}

async function runCurrent() {
  if (!state.activeCalcId) return;
  const inputs = readForm();
  state.lastInputs = inputs;
  setStatus('Calculating\u2026');
  const resp = await window.cruncher.run(state.activeCalcId, inputs);
  if (resp.error) {
    setStatus(`Error: ${resp.error}`);
    state.lastResult = null;
    renderResult({ summary: { Error: resp.error } });
    return;
  }
  state.lastResult = resp.result ?? null;
  renderResult(resp.result!);
  setStatus('Calculated.');
}

function renderResult(r: CalcResult) {
  const kpis = $('#kpis') as HTMLElement;
  kpis.innerHTML = '';
  let first = true;
  for (const [k, v] of Object.entries(r.summary)) {
    const el  = document.createElement('div');
    el.className = 'kpi' + (first ? ' primary' : '');
    first = false;
    const lbl = document.createElement('div');
    lbl.className  = 'lbl';
    lbl.textContent = k;
    const val = document.createElement('div');
    val.className  = 'val';
    val.textContent = smartFormat(k, v);
    el.appendChild(lbl);
    el.appendChild(val);
    kpis.appendChild(el);
  }

  const sched = $('#schedule') as HTMLElement;
  sched.innerHTML = '';
  if (r.schedule && r.schedule.length) {
    const headers = Object.keys(r.schedule[0]);
    const tbl    = document.createElement('table');
    const thead  = document.createElement('thead');
    const trh    = document.createElement('tr');
    for (const h of headers) {
      const th  = document.createElement('th');
      th.textContent = h;
      trh.appendChild(th);
    }
    thead.appendChild(trh);
    tbl.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const row of r.schedule) {
      const tr = document.createElement('tr');
      for (const h of headers) {
        const td = document.createElement('td');
        const v  = (row as any)[h];
        td.textContent = typeof v === 'number' ? smartFormat(h, v) : String(v);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);
    sched.appendChild(tbl);
  }

  const notes = $('#notes') as HTMLElement;
  notes.innerHTML = '';
  for (const n of r.notes ?? []) {
    const li  = document.createElement('li');
    li.textContent = n;
    notes.appendChild(li);
  }
}

function resetForm() {
  if (!state.activeCalcId) return;
  const calc = state.calcs.find(c => c.id === state.activeCalcId);
  if (!calc) return;
  renderForm(calc);
  runCurrent();
}

// ---- Scenario save / load / export --------------------------------------

async function saveScenario() {
  if (!state.activeCalcId) return;
  const calc = state.calcs.find(c => c.id === state.activeCalcId);
  if (!calc) return;
  const scenario = {
    id: `sc-${Date.now()}`,
    name: calc.name,
    createdAt: new Date().toISOString(),
    calculatorId: calc.id,
    inputs: state.lastInputs,
    result: state.lastResult,
  };
  const r = await window.cruncher.saveScenario(scenario);
  if (r.canceled) setStatus('Save canceled.');
  else if (r.error) setStatus(`Save error: ${r.error}`);
  else setStatus(`Saved to ${r.filePath}`);
}

async function loadScenario() {
  const r = await window.cruncher.loadScenario();
  if (r.canceled) return;
  if (r.error || !r.scenario) { setStatus(`Load error: ${r.error ?? 'unknown'}`); return; }
  const calc = state.calcs.find(c => c.id === r.scenario.calculatorId);
  if (!calc) { setStatus('Calculator from scenario no longer exists.'); return; }
  selectTab(calc.category);
  selectCalculator(calc.id);
  setTimeout(() => {
    const form = $('#inputs-form') as HTMLFormElement;
    for (const [k, v] of Object.entries(r.scenario.inputs ?? {})) {
      const el = form.elements.namedItem(k) as HTMLInputElement | HTMLSelectElement | null;
      if (el) el.value = String(v);
    }
    runCurrent();
  }, 50);
  setStatus(`Loaded ${r.scenario.name}`);
}

async function exportCSV() {
  if (!state.lastResult) { setStatus('Nothing to export.'); return; }
  const rows = state.lastResult.schedule?.length
    ? state.lastResult.schedule
    : Object.entries(state.lastResult.summary).map(([k, v]) => ({ metric: k, value: v }));
  const calc = state.calcs.find(c => c.id === state.activeCalcId);
  const r = await window.cruncher.exportCSV(rows, `${calc?.id ?? 'export'}.csv`);
  if (r.canceled) setStatus('Export canceled.');
  else if (r.error) setStatus(`Export error: ${r.error}`);
  else setStatus(`Exported to ${r.filePath}`);
}

// ---- AFR panel ----------------------------------------------------------

function openAfrPanel()  { $('#afr-panel').classList.remove('hidden'); }
function closeAfrPanel() { $('#afr-panel').classList.add('hidden'); }

/** Sync panel controls and rates table from current afrState. */
function renderAfrPanel() {
  if (!afrState.settings) return;

  ($('#afr-use-default') as HTMLInputElement).checked  = afrState.settings.useAfrAsDefault;
  ($('#afr-term')        as HTMLSelectElement).value   = afrState.settings.termOverride;
  ($('#afr-compounding') as HTMLSelectElement).value   = afrState.settings.compounding;

  if (afrState.summary) {
    const container = $('#afr-rates-table');
    container.innerHTML = '';
    container.appendChild(_buildRatesTable(afrState.summary));
  }

  if (afrState.summary?.updatedAt) {
    try {
      const d = new Date(afrState.summary.updatedAt);
      const label = isNaN(d.getTime())
        ? afrState.summary.updatedAt
        : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      ($('#afr-updated') as HTMLElement).textContent =
        `Updated: ${label}${afrState.summary.month ? ' \u00b7 ' + afrState.summary.month : ''}`;
    } catch { /* ignore */ }
  }
}

function _buildRatesTable(s: AfrSummary): HTMLTableElement {
  const tbl   = document.createElement('table');
  const thead = document.createElement('thead');
  const trh   = document.createElement('tr');
  for (const col of ['Term', 'Annual', 'Semi.', 'Qtrly.', 'Monthly']) {
    const th  = document.createElement('th');
    th.textContent = col;
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  tbl.appendChild(thead);

  const tbody = document.createElement('tbody');
  const dataRows: [string, AfrTermRates][] = [
    ['Short-term', s.shortTerm],
    ['Mid-term',   s.midTerm],
    ['Long-term',  s.longTerm],
  ];
  for (const [label, rates] of dataRows) {
    const tr = document.createElement('tr');
    for (const cell of [
      label,
      `${rates.annual.toFixed(2)}%`,
      `${rates.semiannual.toFixed(2)}%`,
      `${rates.quarterly.toFixed(2)}%`,
      `${rates.monthly.toFixed(2)}%`,
    ]) {
      const td  = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  // §7520 row (highlighted in amber)
  const s7520 = document.createElement('tr');
  s7520.className = 'section7520-row';
  for (const cell of ['\u00a77520 Rate', `${s.section7520.toFixed(2)}%`, '\u2014', '\u2014', '\u2014']) {
    const td  = document.createElement('td');
    td.textContent = cell;
    s7520.appendChild(td);
  }
  tbody.appendChild(s7520);
  tbl.appendChild(tbody);
  return tbl;
}

// ---- AFR event handlers -------------------------------------------------

function onAfrToggleChanged() {
  if (!afrState.settings) return;
  afrState.settings = {
    ...afrState.settings,
    useAfrAsDefault: ($('#afr-use-default') as HTMLInputElement).checked,
  };
  _persistAfrSettings();
  _reapplyAfrToActiveCalc();
}

function onAfrSettingChanged() {
  if (!afrState.settings) return;
  afrState.settings = {
    ...afrState.settings,
    termOverride: ($('#afr-term')        as HTMLSelectElement).value as AfrSettings['termOverride'],
    compounding:  ($('#afr-compounding') as HTMLSelectElement).value as AfrSettings['compounding'],
  };
  _persistAfrSettings();
  _reapplyAfrToActiveCalc();
}

async function onAfrRefresh() {
  const btn = $('#afr-refresh') as HTMLButtonElement;
  btn.disabled    = true;
  btn.textContent = '\u21ba Refreshing\u2026';
  setStatus('Fetching latest AFR from IRS\u2026');
  try {
    const result = await window.cruncher.afr.refresh();
    setStatus(result.success ? 'AFR rates updated from IRS.' : `AFR: ${result.message}`);
    // Re-fetch full response to keep data in sync
    const resp = await window.cruncher.afr.getCurrent();
    afrState.data     = resp.data;
    afrState.settings = resp.settings;
    afrState.summary  = resp.summary;
    renderAfrPanel();
    _reapplyAfrToActiveCalc();
  } catch (err: any) {
    setStatus(`AFR refresh error: ${err?.message ?? err}`);
  } finally {
    btn.disabled    = false;
    btn.textContent = '\u21ba Refresh';
  }
}

function _persistAfrSettings() {
  if (!afrState.settings) return;
  window.cruncher.afr.saveSettings(afrState.settings).catch(() => { /* non-fatal */ });
}

/** Re-render the active calculator's form to pick up updated AFR defaults. */
function _reapplyAfrToActiveCalc() {
  if (!state.activeCalcId) return;
  const calc = state.calcs.find(c => c.id === state.activeCalcId);
  if (calc) { renderForm(calc); runCurrent(); }
}

// ---- Status bar ---------------------------------------------------------

function setStatus(msg: string) {
  const el = $('#status');
  if (el) el.textContent = msg;
}

// ---- Boot ---------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => setStatus(`Init error: ${err?.message ?? err}`));
});

export {};
