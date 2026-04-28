/**
 * HTTP fetcher for IRS AFR data.
 * Runs in the Electron main process (Node.js) only — never import in renderer.
 */
import * as https from 'https';
import * as http from 'http';

const PICKLIST_URL =
  'https://apps.irs.gov/app/picklist/list/federalRates.html';

const AFR_DIRECT_URL = 'https://www.irs.gov/applicable-federal-rates';

const REQUEST_TIMEOUT_MS = 12_000;

const HEADERS = {
  'User-Agent':
    'HeirloomQuant/1.0 (financial-planning desktop app; contact support@example.com)',
  Accept: 'text/html,application/xhtml+xml,text/plain',
};

// ---- public API --------------------------------------------------------

/** Fetch the IRS AFR picklist page and return raw HTML. */
export function fetchPicklistPage(): Promise<string> {
  return httpGet(PICKLIST_URL);
}

/** Fetch the direct IRS applicable-federal-rates page. */
export function fetchAfrDirectPage(): Promise<string> {
  return httpGet(AFR_DIRECT_URL);
}

/** Fetch an arbitrary URL and return the body as a string. */
export function fetchUrl(url: string): Promise<string> {
  return httpGet(url);
}

/**
 * Extract the URL of the most-recent Revenue Ruling from the picklist HTML.
 * Returns null when no matching link is found.
 */
export function extractLatestRulingUrl(picklist: string): string | null {
  // The picklist has hrefs like "/pub/irs-drop/rr-25-8.pdf" or
  // "https://www.irs.gov/pub/irs-drop/rr-25-8.pdf" (PDF or HTML).
  // Prefer HTML revenue ruling links where available.
  const htmlPat = /href="([^"]*\/rr-\d{2}-\d+\.html?)"[^>]*>/i;
  const pdfPat  = /href="([^"]*\/rr-\d{2}-\d+\.pdf)"[^>]*>/i;

  const htmlMatch = htmlPat.exec(picklist);
  const pdfMatch  = pdfPat.exec(picklist);

  const raw = htmlMatch?.[1] ?? pdfMatch?.[1] ?? null;
  if (!raw) return null;

  if (raw.startsWith('http')) return raw;
  return `https://www.irs.gov${raw}`;
}

// ---- internals ---------------------------------------------------------

function httpGet(url: string, redirectDepth = 0): Promise<string> {
  if (redirectDepth > 5) {
    return Promise.reject(new Error('Too many redirects'));
  }

  return new Promise((resolve, reject) => {
    const lib: typeof https = url.startsWith('https') ? https : (http as unknown as typeof https);

    const req = lib.get(url, { headers: HEADERS }, (res) => {
      // Handle redirects
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        const next = res.headers.location;
        const absNext = next.startsWith('http')
          ? next
          : `https://www.irs.gov${next}`;
        res.resume(); // consume and discard body
        resolve(httpGet(absNext, redirectDepth + 1));
        return;
      }

      if (res.statusCode && res.statusCode >= 400) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        return;
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms: ${url}`));
    });
  });
}
