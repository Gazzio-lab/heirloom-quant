import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { TABS, listCalculators, getCalculator } from '../calculators/registry';
import type { Scenario } from '../core/types';
import {
  initAfrManager,
  loadCachedAfrData,
  refreshAfrData,
  getCurrentAfrData,
  getCurrentSettings,
  updateSettings,
} from '../data/afr/afrManager';
import { buildAfrSummary } from '../core/afrEngine';
import type { AfrSettings } from '../data/afr/types';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: 'Heirloom Quant',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load the Vite-built renderer (dist/renderer/index.html)
  const indexPath = path.join(__dirname, '..', 'renderer', 'index.html');
  mainWindow.loadFile(indexPath);

  // Open external links in the user's browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.NC_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function buildMenu(): void {
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            { role: 'quit' as const },
          ],
        }]
      : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Scenario', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('action:new-scenario') },
        { label: 'Open Scenario…', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('action:open-scenario') },
        { label: 'Save Scenario…', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('action:save-scenario') },
        { type: 'separator' },
        { label: 'Export Results CSV…', click: () => mainWindow?.webContents.send('action:export-csv') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'About Heirloom Quant', click: () => dialog.showMessageBox(mainWindow!, {
          type: 'info',
          message: 'Heirloom Quant',
          detail: `Version ${app.getVersion()}\nA cross-platform financial calculator suite.`,
        }) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ----- IPC -----

ipcMain.handle('cruncher:tabs', () => TABS);

ipcMain.handle('cruncher:calculators', () => {
  return listCalculators().map(c => ({
    id: c.id,
    name: c.name,
    category: c.category,
    description: c.description,
    inputs: c.inputs,
  }));
});

ipcMain.handle('cruncher:run', (_evt, payload: { id: string; inputs: Record<string, any> }) => {
  const calc = getCalculator(payload.id);
  if (!calc) return { error: `Unknown calculator: ${payload.id}` };
  try {
    return { result: calc.run(payload.inputs ?? {}) };
  } catch (err: any) {
    return { error: err?.message ?? String(err) };
  }
});

ipcMain.handle('cruncher:saveScenario', async (_evt, scenario: Scenario) => {
  if (!mainWindow) return { error: 'no window' };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Scenario',
    defaultPath: `${scenario.name.replace(/\s+/g, '_')}.json`,
    filters: [{ name: 'Heirloom Quant Scenario', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  await fs.writeFile(filePath, JSON.stringify(scenario, null, 2), 'utf8');
  return { filePath };
});

ipcMain.handle('cruncher:loadScenario', async () => {
  if (!mainWindow) return { error: 'no window' };
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Scenario',
    filters: [{ name: 'Heirloom Quant Scenario', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths[0]) return { canceled: true };
  const data = await fs.readFile(filePaths[0], 'utf8');
  return { scenario: JSON.parse(data) as Scenario, filePath: filePaths[0] };
});

ipcMain.handle('cruncher:exportCSV', async (_evt, payload: { rows: Record<string, any>[]; suggestedName?: string }) => {
  if (!mainWindow) return { error: 'no window' };
  const rows = payload.rows ?? [];
  if (!rows.length) return { error: 'No rows to export' };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export to CSV',
    defaultPath: payload.suggestedName ?? 'heirloom-quant-export.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r =>
      headers
        .map(h => {
          const v = r[h];
          if (v == null) return '';
          const s = String(v);
          return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    ),
  ].join('\n');
  await fs.writeFile(filePath, csv, 'utf8');
  return { filePath };
});

// ----- PDF export -----

ipcMain.handle('cruncher:exportPDF', async () => {
  if (!mainWindow) return { error: 'no window' };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save PDF',
    defaultPath: 'heirloom-quant-report.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  const data = await mainWindow.webContents.printToPDF({
    printBackground: true,
    pageSize: 'Letter',
    margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
  });
  await fs.writeFile(filePath, data);
  return { filePath };
});

// ----- AFR IPC handlers -----

ipcMain.handle('afr:getCurrent', () => ({
  data:     getCurrentAfrData(),
  settings: getCurrentSettings(),
  summary:  buildAfrSummary(getCurrentAfrData()),
}));

ipcMain.handle('afr:refresh', async () => {
  const result = await refreshAfrData();
  return {
    ...result,
    summary: buildAfrSummary(getCurrentAfrData()),
  };
});

ipcMain.handle('afr:getSettings', () => getCurrentSettings());

ipcMain.handle('afr:saveSettings', (_evt, settings: AfrSettings) => {
  updateSettings(settings);
  return { ok: true };
});

app.whenReady().then(async () => {
  // Initialise AFR: load cache synchronously, kick off background refresh.
  initAfrManager(app.getPath('userData'));
  await loadCachedAfrData();
  refreshAfrData().catch(() => { /* background – ignore errors */ });

  createWindow();
  buildMenu();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
