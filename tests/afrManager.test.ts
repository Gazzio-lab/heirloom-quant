/**
 * Tests for afrManager.ts.
 *
 * Network calls (fetchAFR) are fully mocked.
 * File I/O uses a real OS temp directory per describe block so we test
 * the actual persistence logic without touching production paths.
 */
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

// ---- mock fetchAFR module before any imports ----------------------------
jest.mock('../src/data/afr/fetchAFR', () => ({
  fetchPicklistPage:      jest.fn(),
  fetchAfrDirectPage:     jest.fn(),
  fetchUrl:               jest.fn(),
  extractLatestRulingUrl: jest.fn(),
}));

import {
  initAfrManager,
  loadCachedAfrData,
  refreshAfrData,
  getCurrentAfrData,
  getCurrentSettings,
  updateSettings,
} from '../src/data/afr/afrManager';

import { DEFAULT_AFR_DATA } from '../src/data/afr/defaultRates';
import { DEFAULT_AFR_SETTINGS } from '../src/data/afr/types';
import type { AfrData, AfrSettings } from '../src/data/afr/types';

// Import mocked functions for assertions
import {
  fetchPicklistPage,
  fetchAfrDirectPage,
  fetchUrl,
  extractLatestRulingUrl,
} from '../src/data/afr/fetchAFR';

const mockFetchPicklist      = fetchPicklistPage      as jest.Mock;
const mockFetchDirect        = fetchAfrDirectPage     as jest.Mock;
const mockFetchUrl           = fetchUrl               as jest.Mock;
const mockExtractRulingUrl   = extractLatestRulingUrl as jest.Mock;

// ---- helpers ------------------------------------------------------------

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'hq-afr-test-'));
}

async function removeTempDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

const OVERRIDE_DATA: AfrData = {
  month: '2024-01',
  updatedAt: '2024-01-15T12:00:00.000Z',
  source: 'cached-test',
  short_term: { annual: 5.00, semiannual: 4.95, quarterly: 4.93, monthly: 4.92 },
  mid_term:   { annual: 4.50, semiannual: 4.45, quarterly: 4.43, monthly: 4.42 },
  long_term:  { annual: 4.80, semiannual: 4.75, quarterly: 4.73, monthly: 4.72 },
};

/** Build a minimal IRS Revenue Ruling HTML that the parser can read. */
function makeParseableHtml(month: string, year: number): string {
  return `
<html><body>
<p>Applicable Federal Rates (AFR) for ${month} ${year}</p>
<tr><td>Short-term</td></tr>
<tr><td>AFR</td><td>4.33%</td><td>4.28%</td><td>4.26%</td><td>4.25%</td></tr>
<tr><td>Mid-term</td></tr>
<tr><td>AFR</td><td>4.02%</td><td>3.98%</td><td>3.96%</td><td>3.95%</td></tr>
<tr><td>Long-term</td></tr>
<tr><td>AFR</td><td>4.56%</td><td>4.51%</td><td>4.49%</td><td>4.48%</td></tr>
</body></html>`;
}

// ---- default state ------------------------------------------------------

describe('afrManager – default state', () => {
  beforeEach(() => {
    initAfrManager(''); // no real directory
    jest.clearAllMocks();
  });

  test('getCurrentAfrData() returns DEFAULT_AFR_DATA by default', () => {
    const d = getCurrentAfrData();
    expect(d.month).toBe(DEFAULT_AFR_DATA.month);
    expect(d.short_term.annual).toBe(DEFAULT_AFR_DATA.short_term.annual);
  });

  test('getCurrentSettings() returns DEFAULT_AFR_SETTINGS by default', () => {
    const s = getCurrentSettings();
    expect(s.useAfrAsDefault).toBe(DEFAULT_AFR_SETTINGS.useAfrAsDefault);
    expect(s.termOverride).toBe(DEFAULT_AFR_SETTINGS.termOverride);
    expect(s.compounding).toBe(DEFAULT_AFR_SETTINGS.compounding);
  });
});

// ---- loadCachedAfrData --------------------------------------------------

describe('afrManager – loadCachedAfrData()', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTempDir();
    initAfrManager(tmpDir);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await removeTempDir(tmpDir);
  });

  test('uses defaults when no cache files exist', async () => {
    await loadCachedAfrData();
    expect(getCurrentAfrData().month).toBe(DEFAULT_AFR_DATA.month);
    expect(getCurrentSettings().useAfrAsDefault).toBe(DEFAULT_AFR_SETTINGS.useAfrAsDefault);
  });

  test('loads data from afrStore.json when it exists', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'afrStore.json'),
      JSON.stringify(OVERRIDE_DATA),
      'utf8',
    );
    await loadCachedAfrData();
    const d = getCurrentAfrData();
    expect(d.month).toBe(OVERRIDE_DATA.month);
    expect(d.short_term.annual).toBe(OVERRIDE_DATA.short_term.annual);
    expect(d.source).toBe(OVERRIDE_DATA.source);
  });

  test('loads settings from afr-settings.json when it exists', async () => {
    const customSettings: AfrSettings = {
      useAfrAsDefault: false,
      termOverride: 'short',
      compounding: 'quarterly',
    };
    await fs.writeFile(
      path.join(tmpDir, 'afr-settings.json'),
      JSON.stringify(customSettings),
      'utf8',
    );
    await loadCachedAfrData();
    const s = getCurrentSettings();
    expect(s.useAfrAsDefault).toBe(false);
    expect(s.termOverride).toBe('short');
    expect(s.compounding).toBe('quarterly');
  });

  test('keeps defaults when afrStore.json contains invalid JSON', async () => {
    await fs.writeFile(path.join(tmpDir, 'afrStore.json'), '{invalid json', 'utf8');
    await loadCachedAfrData();
    // Should not throw; should keep current (default) state
    expect(getCurrentAfrData().month).toBe(DEFAULT_AFR_DATA.month);
  });
});

// ---- updateSettings -----------------------------------------------------

describe('afrManager – updateSettings()', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTempDir();
    initAfrManager(tmpDir);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await removeTempDir(tmpDir);
  });

  test('immediately updates in-memory settings', () => {
    const newSettings: AfrSettings = {
      useAfrAsDefault: false,
      termOverride: 'long',
      compounding: 'semiannual',
    };
    updateSettings(newSettings);
    const s = getCurrentSettings();
    expect(s.useAfrAsDefault).toBe(false);
    expect(s.termOverride).toBe('long');
    expect(s.compounding).toBe('semiannual');
  });

  test('persists settings to afr-settings.json (async)', async () => {
    updateSettings({ useAfrAsDefault: true, termOverride: 'mid', compounding: 'annual' });
    // Allow microtask queue to flush the fire-and-forget write
    await new Promise(r => setTimeout(r, 50));
    const raw = await fs.readFile(path.join(tmpDir, 'afr-settings.json'), 'utf8');
    const saved = JSON.parse(raw) as AfrSettings;
    expect(saved.termOverride).toBe('mid');
    expect(saved.compounding).toBe('annual');
  });
});

// ---- refreshAfrData – network failures ----------------------------------

describe('afrManager – refreshAfrData() on network failure', () => {
  beforeEach(async () => {
    initAfrManager('');
    mockFetchPicklist.mockRejectedValue(new Error('network error'));
    mockFetchDirect.mockRejectedValue(new Error('network error'));
    jest.clearAllMocks();
    // Re-apply mocks after clearAllMocks
    mockFetchPicklist.mockRejectedValue(new Error('network error'));
    mockFetchDirect.mockRejectedValue(new Error('network error'));
  });

  test('returns success=false when all strategies fail', async () => {
    const result = await refreshAfrData();
    expect(result.success).toBe(false);
    expect(result.message).toContain('Could not fetch');
  });

  test('retains existing in-memory data after failure', async () => {
    const before = getCurrentAfrData();
    await refreshAfrData();
    expect(getCurrentAfrData()).toBe(before); // same reference
  });

  test('does not throw', async () => {
    await expect(refreshAfrData()).resolves.not.toThrow();
  });
});

// ---- refreshAfrData – successful picklist strategy ----------------------

describe('afrManager – refreshAfrData() via picklist strategy', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTempDir();
    initAfrManager(tmpDir);
    jest.clearAllMocks();

    const picklistHtml = '<a href="/pub/irs-drop/rr-25-9.html">Rev. Rul. 2025-9</a>';
    const rulingHtml   = makeParseableHtml('April', 2025);

    mockFetchPicklist.mockResolvedValue(picklistHtml);
    mockExtractRulingUrl.mockReturnValue('https://www.irs.gov/pub/irs-drop/rr-25-9.html');
    mockFetchUrl.mockResolvedValue(rulingHtml);
  });

  afterEach(async () => {
    await removeTempDir(tmpDir);
  });

  test('returns success=true', async () => {
    const result = await refreshAfrData();
    expect(result.success).toBe(true);
  });

  test('updates in-memory AFR data with parsed rates', async () => {
    await refreshAfrData();
    const d = getCurrentAfrData();
    expect(d.short_term.annual).toBe(4.33);
    expect(d.mid_term.monthly).toBe(3.95);
    expect(d.long_term.annual).toBe(4.56);
  });

  test('sets correct month', async () => {
    await refreshAfrData();
    expect(getCurrentAfrData().month).toBe('2025-04');
  });

  test('persists data to afrStore.json', async () => {
    await refreshAfrData();
    const raw  = await fs.readFile(path.join(tmpDir, 'afrStore.json'), 'utf8');
    const saved = JSON.parse(raw) as AfrData;
    expect(saved.short_term.annual).toBe(4.33);
    expect(saved.mid_term.annual).toBe(4.02);
  });
});

// ---- refreshAfrData – picklist fails, direct page succeeds --------------

describe('afrManager – refreshAfrData() picklist fails → direct page succeeds', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTempDir();
    initAfrManager(tmpDir);
    jest.clearAllMocks();

    // Picklist strategy fails
    mockFetchPicklist.mockRejectedValue(new Error('picklist unavailable'));

    // Direct page succeeds
    mockFetchDirect.mockResolvedValue(makeParseableHtml('March', 2025));
  });

  afterEach(async () => {
    await removeTempDir(tmpDir);
  });

  test('falls back to direct page and returns success=true', async () => {
    const result = await refreshAfrData();
    expect(result.success).toBe(true);
  });

  test('updates data from direct page parse', async () => {
    await refreshAfrData();
    const d = getCurrentAfrData();
    expect(d.month).toBe('2025-03');
    expect(d.short_term.annual).toBe(4.33);
  });
});

// ---- refreshAfrData – parse fails ---------------------------------------

describe('afrManager – refreshAfrData() when parse fails', () => {
  beforeEach(() => {
    initAfrManager('');
    jest.clearAllMocks();

    // Returns HTML that cannot be parsed (no term headers, no rates)
    mockFetchPicklist.mockResolvedValue('<html>no useful content</html>');
    mockExtractRulingUrl.mockReturnValue(null);
    mockFetchDirect.mockResolvedValue('<html>also useless</html>');
  });

  test('returns success=false when HTML is returned but parse fails', async () => {
    const result = await refreshAfrData();
    expect(result.success).toBe(false);
  });
});
