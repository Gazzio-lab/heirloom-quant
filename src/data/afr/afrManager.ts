/**
 * AFR Manager — main-process singleton.
 * Orchestrates: initial load from cache, background refresh from IRS,
 * persistence of fetched data and user settings.
 *
 * Call initAfrManager() once from app.whenReady().
 */
import * as path from 'path';
import * as fs from 'fs/promises';

import type { AfrData, AfrSettings } from './types';
import { DEFAULT_AFR_DATA } from './defaultRates';
import { DEFAULT_AFR_SETTINGS } from './types';
import { parseAfrFromHtml } from './parseAFR';
import {
  fetchPicklistPage,
  fetchAfrDirectPage,
  fetchUrl,
  extractLatestRulingUrl,
} from './fetchAFR';

// ---- module state -------------------------------------------------------

let _data: AfrData = DEFAULT_AFR_DATA;
let _settings: AfrSettings = { ...DEFAULT_AFR_SETTINGS };
let _userDataDir = '';

// ---- public API ---------------------------------------------------------

/** Must be called once from the main process before any other method. */
export function initAfrManager(userDataDir: string): void {
  _userDataDir = userDataDir;
}

export function getCurrentAfrData(): AfrData {
  return _data;
}

export function getCurrentSettings(): AfrSettings {
  return _settings;
}

export function updateSettings(settings: AfrSettings): void {
  _settings = settings;
  _persistSettings().catch(() => { /* fire-and-forget */ });
}

/**
 * Load the most-recent cached data and settings from the user-data directory.
 * Always resets to built-in defaults first, then overlays the cache so that
 * invalid/corrupt cache files never leave stale state.
 */
export async function loadCachedAfrData(): Promise<void> {
  // Always start from clean defaults
  _data     = DEFAULT_AFR_DATA;
  _settings = { ...DEFAULT_AFR_SETTINGS };

  if (!_userDataDir) return;

  // Load AFR data
  try {
    const raw = await fs.readFile(path.join(_userDataDir, 'afrStore.json'), 'utf8');
    _data = JSON.parse(raw) as AfrData;
  } catch {
    // no cache yet — keep built-in defaults
  }

  // Load settings
  try {
    const raw = await fs.readFile(path.join(_userDataDir, 'afr-settings.json'), 'utf8');
    _settings = JSON.parse(raw) as AfrSettings;
  } catch {
    // no settings yet — keep defaults
  }
}

export interface AfrRefreshResult {
  success: boolean;
  message: string;
  data?: AfrData;
}

/**
 * Attempt to fetch the latest AFR from the IRS and update the in-memory state.
 * Never throws — returns a result object describing what happened.
 */
export async function refreshAfrData(): Promise<AfrRefreshResult> {
  // Strategy 1: picklist → Revenue Ruling
  try {
    const picklist = await fetchPicklistPage();
    const rulingUrl = extractLatestRulingUrl(picklist);
    if (rulingUrl && !rulingUrl.endsWith('.pdf')) {
      const html = await fetchUrl(rulingUrl);
      const parsed = parseAfrFromHtml(html, rulingUrl);
      if (parsed) return _saveAndReturn(parsed, rulingUrl);
    }
  } catch { /* try next strategy */ }

  // Strategy 2: IRS applicable-federal-rates landing page
  try {
    const html = await fetchAfrDirectPage();
    const parsed = parseAfrFromHtml(html, 'https://www.irs.gov/applicable-federal-rates');
    if (parsed) return _saveAndReturn(parsed, 'IRS applicable-federal-rates page');
  } catch { /* try next strategy */ }

  return {
    success: false,
    message:
      'Could not fetch or parse AFR data from IRS website. ' +
      'Using cached rates. Check your internet connection and try again.',
  };
}

// ---- internals ----------------------------------------------------------

async function _saveAndReturn(
  data: AfrData,
  source: string,
): Promise<AfrRefreshResult> {
  _data = data;
  if (_userDataDir) {
    try {
      await fs.writeFile(
        path.join(_userDataDir, 'afrStore.json'),
        JSON.stringify(data, null, 2),
        'utf8',
      );
    } catch { /* non-fatal */ }
  }
  return { success: true, message: `AFR updated from ${source}`, data };
}

async function _persistSettings(): Promise<void> {
  if (!_userDataDir) return;
  await fs.writeFile(
    path.join(_userDataDir, 'afr-settings.json'),
    JSON.stringify(_settings, null, 2),
    'utf8',
  );
}
