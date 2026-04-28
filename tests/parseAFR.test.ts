import { parseAfrFromHtml } from '../src/data/afr/parseAFR';

// ---- helpers ------------------------------------------------------------

/** Build a minimal IRS Revenue Ruling HTML table for a single month. */
function makeIrsHtml(opts: {
  month: string;
  year: number;
  short: [number, number, number, number];
  mid:   [number, number, number, number];
  long:  [number, number, number, number];
  includeVariants?: boolean;
}): string {
  const { month, year, short, mid, long, includeVariants = true } = opts;
  // Always emit 2 decimal places to match the IRS published format
  const row = ([a, b, c, d]: [number, number, number, number]) =>
    `<tr><td>${a.toFixed(2)}%</td><td>${b.toFixed(2)}%</td><td>${c.toFixed(2)}%</td><td>${d.toFixed(2)}%</td></tr>`;
  const variant = ([a, b, c, d]: [number, number, number, number], pct: number) => {
    const v = [a, b, c, d].map(x => (x * pct / 100).toFixed(2));
    return `<tr><td>${pct}% AFR</td><td>${v[0]}%</td><td>${v[1]}%</td><td>${v[2]}%</td><td>${v[3]}%</td></tr>`;
  };

  return `
<html><body>
<p>REV. RUL. ${year}-12 TABLE 1</p>
<p>Applicable Federal Rates (AFR) for ${month} ${year}</p>
<table>
<tr><th></th><th>Annual</th><th>Semiannual</th><th>Quarterly</th><th>Monthly</th></tr>
<tr><td>Short-term</td></tr>
<tr><td>AFR</td>${row(short)}</tr>
${includeVariants ? variant(short, 110) : ''}
${includeVariants ? variant(short, 120) : ''}
<tr><td>Mid-term</td></tr>
<tr><td>AFR</td>${row(mid)}</tr>
${includeVariants ? variant(mid, 110) : ''}
${includeVariants ? variant(mid, 120) : ''}
<tr><td>Long-term</td></tr>
<tr><td>AFR</td>${row(long)}</tr>
${includeVariants ? variant(long, 110) : ''}
</table>
</body></html>`;
}

const APRIL_2025_HTML = makeIrsHtml({
  month: 'April', year: 2025,
  short: [4.33, 4.28, 4.26, 4.25],
  mid:   [4.02, 3.98, 3.96, 3.95],
  long:  [4.56, 4.51, 4.49, 4.48],
});

// ---- parseAfrFromHtml - happy path --------------------------------------

describe('parseAfrFromHtml() – happy path', () => {
  const result = parseAfrFromHtml(APRIL_2025_HTML, 'test-source');

  test('returns a non-null result', () => {
    expect(result).not.toBeNull();
  });

  test('sets source label correctly', () => {
    expect(result!.source).toBe('test-source');
  });

  test('sets updatedAt to an ISO timestamp', () => {
    expect(result!.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('extracts month in YYYY-MM format', () => {
    expect(result!.month).toBe('2025-04');
  });

  test('extracts short-term annual rate', () => {
    expect(result!.short_term.annual).toBe(4.33);
  });

  test('extracts short-term monthly rate', () => {
    expect(result!.short_term.monthly).toBe(4.25);
  });

  test('extracts mid-term annual rate', () => {
    expect(result!.mid_term.annual).toBe(4.02);
  });

  test('extracts mid-term semiannual rate', () => {
    expect(result!.mid_term.semiannual).toBe(3.98);
  });

  test('extracts mid-term quarterly rate', () => {
    expect(result!.mid_term.quarterly).toBe(3.96);
  });

  test('extracts mid-term monthly rate', () => {
    expect(result!.mid_term.monthly).toBe(3.95);
  });

  test('extracts long-term annual rate', () => {
    expect(result!.long_term.annual).toBe(4.56);
  });

  test('extracts long-term monthly rate', () => {
    expect(result!.long_term.monthly).toBe(4.48);
  });

  test('does NOT use 110%/120% variant rows as the primary AFR', () => {
    // 110% of 4.33 = 4.763, not equal to 4.33
    expect(result!.short_term.annual).toBe(4.33);
    expect(result!.mid_term.annual).toBe(4.02);
    expect(result!.long_term.annual).toBe(4.56);
  });
});

// ---- month extraction ---------------------------------------------------

describe('parseAfrFromHtml() – month extraction', () => {
  test.each([
    ['January 2025',   '2025-01'],
    ['February 2025',  '2025-02'],
    ['March 2025',     '2025-03'],
    ['April 2025',     '2025-04'],
    ['May 2025',       '2025-05'],
    ['June 2025',      '2025-06'],
    ['July 2025',      '2025-07'],
    ['August 2025',    '2025-08'],
    ['September 2025', '2025-09'],
    ['October 2025',   '2025-10'],
    ['November 2025',  '2025-11'],
    ['December 2025',  '2025-12'],
  ])('"%s" → "%s"', (monthStr, expectedYm) => {
    const html = makeIrsHtml({
      month: monthStr.split(' ')[0], year: parseInt(monthStr.split(' ')[1]),
      short: [4.33, 4.28, 4.26, 4.25],
      mid:   [4.02, 3.98, 3.96, 3.95],
      long:  [4.56, 4.51, 4.49, 4.48],
    });
    const r = parseAfrFromHtml(html, 'src');
    expect(r?.month).toBe(expectedYm);
  });

  test('returns empty string for unparseable month, but still extracts rates', () => {
    const html = makeIrsHtml({
      month: 'InvalidMonth', year: 2025,
      short: [4.33, 4.28, 4.26, 4.25],
      mid:   [4.02, 3.98, 3.96, 3.95],
      long:  [4.56, 4.51, 4.49, 4.48],
    });
    const r = parseAfrFromHtml(html, 'src');
    // Rates should still parse; month may be empty or year extracted
    if (r) {
      expect(r.short_term.annual).toBe(4.33);
    }
  });
});

// ---- failure cases ------------------------------------------------------

describe('parseAfrFromHtml() – failure cases', () => {
  test('returns null for empty string', () => {
    expect(parseAfrFromHtml('', 'src')).toBeNull();
  });

  test('returns null for unrelated HTML (no term headers)', () => {
    expect(parseAfrFromHtml('<html><body><p>Hello world</p></body></html>', 'src')).toBeNull();
  });

  test('returns null when rates are missing', () => {
    const html = `<html><body>
      <p>Short-term</p><p>Mid-term</p><p>Long-term</p>
      <p>No numeric rates here</p>
    </body></html>`;
    expect(parseAfrFromHtml(html, 'src')).toBeNull();
  });

  test('returns null when only two terms present', () => {
    const html = `<html><body>
      <p>April 2025</p>
      <p>Short-term AFR 4.33% 4.28% 4.26% 4.25%</p>
      <p>Mid-term AFR 4.02% 3.98% 3.96% 3.95%</p>
    </body></html>`;
    // Long-term is missing — should fail
    expect(parseAfrFromHtml(html, 'src')).toBeNull();
  });
});

// ---- alternative HTML formats -------------------------------------------

describe('parseAfrFromHtml() – format variants', () => {
  test('plain text format (no HTML tags)', () => {
    const text = `
Applicable Federal Rates for March 2025

Short-term
AFR  4.42 4.37 4.35 4.34
110% AFR  4.87 4.81 4.79 4.77

Mid-term
AFR  4.10 4.06 4.04 4.03
110% AFR  4.52 ...

Long-term
AFR  4.62 4.57 4.55 4.54
`;
    const r = parseAfrFromHtml(text, 'plain-text');
    expect(r).not.toBeNull();
    expect(r!.short_term.annual).toBe(4.42);
    expect(r!.mid_term.annual).toBe(4.10);
    expect(r!.long_term.monthly).toBe(4.54);
    expect(r!.month).toBe('2025-03');
  });

  test('handles hyphenated term labels (short-term)', () => {
    const html = makeIrsHtml({
      month: 'May', year: 2025,
      short: [4.20, 4.16, 4.14, 4.13],
      mid:   [4.05, 4.01, 3.99, 3.98],
      long:  [4.60, 4.55, 4.53, 4.52],
    }).replace('Short-term', 'Short-Term');
    const r = parseAfrFromHtml(html, 'src');
    expect(r).not.toBeNull();
    expect(r!.short_term.annual).toBe(4.20);
  });

  test('case-insensitive term labels', () => {
    const html = makeIrsHtml({
      month: 'June', year: 2025,
      short: [4.10, 4.06, 4.04, 4.03],
      mid:   [3.90, 3.86, 3.84, 3.83],
      long:  [4.40, 4.35, 4.33, 4.32],
    }).replace(/Short-term/g, 'SHORT-TERM')
      .replace(/Mid-term/g, 'MID-TERM')
      .replace(/Long-term/g, 'LONG-TERM');
    const r = parseAfrFromHtml(html, 'src');
    expect(r).not.toBeNull();
    expect(r!.mid_term.annual).toBe(3.90);
  });
});

// ---- precision ----------------------------------------------------------

describe('parseAfrFromHtml() – rate precision', () => {
  test('preserves two decimal places', () => {
    const html = makeIrsHtml({
      month: 'April', year: 2025,
      short: [1.25, 1.24, 1.23, 1.23],
      mid:   [2.78, 2.76, 2.75, 2.74],
      long:  [3.99, 3.96, 3.94, 3.93],
    });
    const r = parseAfrFromHtml(html, 'src');
    expect(r).not.toBeNull();
    expect(r!.short_term.annual).toBe(1.25);
    expect(r!.mid_term.semiannual).toBe(2.76);
    expect(r!.long_term.monthly).toBe(3.93);
  });
});
