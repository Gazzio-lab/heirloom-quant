/**
 * Parser for IRS Applicable Federal Rate tables from Revenue Ruling HTML.
 * Uses regex/string search — no DOM dependency — so it runs safely in Node.js.
 *
 * The IRS table structure (simplified):
 *   Table 1 – Applicable Federal Rates for [Month] [Year]
 *   Period for Compounding: Annual | Semiannual | Quarterly | Monthly
 *   Short-term
 *     AFR     X.XX%  X.XX%  X.XX%  X.XX%
 *     110%...
 *   Mid-term
 *     AFR     X.XX%  X.XX%  X.XX%  X.XX%
 *   Long-term
 *     AFR     X.XX%  X.XX%  X.XX%  X.XX%
 */
import type { AfrData, AfrTermRates } from './types';

// ---- public API --------------------------------------------------------

/**
 * Attempt to parse AFR data from an IRS page (Revenue Ruling HTML or
 * applicable-federal-rates landing page).
 * Returns null if the structure cannot be recognised.
 */
export function parseAfrFromHtml(html: string, sourceLabel: string): AfrData | null {
  try {
    const text = stripHtml(html);
    const month = extractMonth(text);
    const rates = extractAllTermRates(text);
    if (!rates) return null;

    return {
      month,
      updatedAt: new Date().toISOString(),
      source: sourceLabel,
      short_term: rates.short,
      mid_term:   rates.mid,
      long_term:  rates.long,
    };
  } catch {
    return null;
  }
}

// ---- helpers -----------------------------------------------------------

/**
 * Remove HTML tags and normalise whitespace while preserving line structure.
 * Block-level tags (tr, p, div, br, li) become newlines so that each table
 * row stays on its own line — critical for the 110%/120% variant filter.
 * Only horizontal whitespace (spaces/tabs) is collapsed; newlines survive.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<\/?(?:tr|p|div|br|li|h[1-6])[^>]*>/gi, '\n') // block tags → newline
    .replace(/<[^>]*>/g, ' ')                                  // inline tags → space
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#\d+;/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')                                // collapse horizontal ws only
    .replace(/[ \t]*\n[ \t]*/g, '\n')                         // trim spaces around newlines
    .replace(/\n{2,}/g, '\n');                                 // collapse blank lines
}

const MONTH_NAMES =
  'january|february|march|april|may|june|july|august|september|october|november|december';

function extractMonth(text: string): string {
  const pat = new RegExp(
    `(${MONTH_NAMES})\\s+(20\\d{2})`,
    'i',
  );
  const m = pat.exec(text);
  if (!m) return '';
  const d = new Date(`${m[1]} 1, ${m[2]}`);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${mo}`;
}

/**
 * Find all three term sections and extract the first AFR row (4 percentages)
 * from each.  The IRS always lists Annual, Semiannual, Quarterly, Monthly.
 */
function extractAllTermRates(
  text: string,
): { short: AfrTermRates; mid: AfrTermRates; long: AfrTermRates } | null {
  // Locate term headers (case-insensitive, allow hyphens)
  const shortIdx = indexOfPattern(text, /short[\s-]?term/i);
  const midIdx   = indexOfPattern(text, /mid[\s-]?term/i);
  const longIdx  = indexOfPattern(text, /long[\s-]?term/i);

  if (shortIdx === -1 || midIdx === -1 || longIdx === -1) return null;

  // Section boundaries
  const shortSection = text.slice(shortIdx, midIdx);
  const midSection   = text.slice(midIdx,   longIdx);
  const longSection  = text.slice(longIdx,  longIdx + 1000);

  const short = extractFirstAfrRow(shortSection);
  const mid   = extractFirstAfrRow(midSection);
  const long  = extractFirstAfrRow(longSection);

  if (!short || !mid || !long) return null;
  return { short, mid, long };
}

/**
 * Find the index of the first match for `pat` in `text`.
 * Returns -1 if not found.
 */
function indexOfPattern(text: string, pat: RegExp): number {
  const m = pat.exec(text);
  return m ? m.index : -1;
}

/**
 * Extract the first row of exactly 4 percentage values from a text section.
 * Matches patterns like "4.33 4.28 4.26 4.25" or "4.33% 4.28% 4.26% 4.25%".
 * Skips "110% AFR" / "120% AFR" rows which contain 3-digit prefixes.
 */
function extractFirstAfrRow(section: string): AfrTermRates | null {
  // Pattern: four floating-point numbers with optional % signs, space-separated.
  // Accepts 1–2 decimal digits (\.\d{1,2}) to handle both "4.33%" and rare "4.3%" formats.
  // Leading integer must be 1–2 digits only (rejects 3-digit "110", "120" etc.).
  const rowPat =
    /\b(\d{1,2}\.\d{1,2})%?\s+(\d{1,2}\.\d{1,2})%?\s+(\d{1,2}\.\d{1,2})%?\s+(\d{1,2}\.\d{1,2})%?/;

  // Walk through the section line by line, skip lines that look like "110%" variants
  const lines = section.split(/[\n\r]+/);
  for (const line of lines) {
    if (/\b1[12]\d%?\s*AFR/i.test(line)) continue; // skip 110%/120%/130% AFR rows
    const m = rowPat.exec(line);
    if (m) {
      return {
        annual:     parseFloat(m[1]),
        semiannual: parseFloat(m[2]),
        quarterly:  parseFloat(m[3]),
        monthly:    parseFloat(m[4]),
      };
    }
  }

  // Fallback: search across the whole section (no line splitting)
  const m = rowPat.exec(section);
  if (m) {
    return {
      annual:     parseFloat(m[1]),
      semiannual: parseFloat(m[2]),
      quarterly:  parseFloat(m[3]),
      monthly:    parseFloat(m[4]),
    };
  }

  return null;
}
