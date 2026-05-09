import { contextBridge, ipcRenderer } from 'electron';

/**
 * Narrow API exposed to the renderer. Renderer code never accesses
 * Node, fs, or Electron directly; it only sees this typed surface.
 */
const api = {
  listTabs: () => ipcRenderer.invoke('cruncher:tabs'),
  listCalculators: () => ipcRenderer.invoke('cruncher:calculators'),
  run: (id: string, inputs: Record<string, any>) =>
    ipcRenderer.invoke('cruncher:run', { id, inputs }),
  saveScenario: (scenario: any) =>
    ipcRenderer.invoke('cruncher:saveScenario', scenario),
  loadScenario: () => ipcRenderer.invoke('cruncher:loadScenario'),
  exportCSV: (rows: any[], suggestedName?: string) =>
    ipcRenderer.invoke('cruncher:exportCSV', { rows, suggestedName }),
  exportPDF: () => ipcRenderer.invoke('cruncher:exportPDF'),
  onAction: (cb: (action: string) => void) => {
    const handler = (_evt: unknown, action: string) => cb(action);
    const channels = [
      'action:new-scenario',
      'action:open-scenario',
      'action:save-scenario',
      'action:export-csv',
    ];
    channels.forEach(c => ipcRenderer.on(c, () => handler(null, c)));
  },
  afr: {
    getCurrent: () => ipcRenderer.invoke('afr:getCurrent'),
    refresh:    () => ipcRenderer.invoke('afr:refresh'),
    getSettings: () => ipcRenderer.invoke('afr:getSettings'),
    saveSettings: (s: any) => ipcRenderer.invoke('afr:saveSettings', s),
  },
};

contextBridge.exposeInMainWorld('cruncher', api);

export type CruncherAPI = typeof api;
