import { getAFR, termBucket, getSection7520Rate, buildAfrSummary } from '../src/core/afrEngine';
import type { AfrData } from '../src/data/afr/types';

// ---- fixtures -----------------------------------------------------------

/** Realistic April 2025 AFR data used across all tests. */
const SAMPLE: AfrData = {
  month: '2025-04',
  updatedAt: '2025-04-15T00:00:00.000Z',
  source: 'test-fixture',
  short_term: { annual: 4.33, semiannual: 4.28, quarterly: 4.26, monthly: 4.25 },
  mid_term:   { annual: 4.02, semiannual: 3.98, quarterly: 3.96, monthly: 3.95 },
  long_term:  { annual: 4.56, semiannual: 4.51, quarterly: 4.49, monthly: 4.48 },
};

const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

// ---- getAFR -------------------------------------------------------------

describe('getAFR()', () => {
  test('returns short-term annual rate', () => {
    expect(getAFR(SAMPLE, 'short', 'annual')).toBe(4.33);
  });

  test('returns short-term monthly rate', () => {
    expect(getAFR(SAMPLE, 'short', 'monthly')).toBe(4.25);
  });

  test('returns mid-term quarterly rate', () => {
    expect(getAFR(SAMPLE, 'mid', 'quarterly')).toBe(3.96);
  });

  test('returns long-term semiannual rate', () => {
    expect(getAFR(SAMPLE, 'long', 'semiannual')).toBe(4.51);
  });

  test('applies multiplier of 1.2 (§7520 proxy)', () => {
    const expected = 4.02 * 1.2; // 4.824
    expect(close(getAFR(SAMPLE, 'mid', 'annual', 1.2), expected)).toBe(true);
  });

  test('applies arbitrary multiplier', () => {
    expect(close(getAFR(SAMPLE, 'short', 'monthly', 1.1), 4.25 * 1.1)).toBe(true);
  });

  test('multiplier defaults to 1 (no-op)', () => {
    expect(getAFR(SAMPLE, 'long', 'annual')).toBe(getAFR(SAMPLE, 'long', 'annual', 1));
  });
});

// ---- termBucket ---------------------------------------------------------

describe('termBucket()', () => {
  test('0 years → short', () => expect(termBucket(0)).toBe('short'));
  test('1 year → short',  () => expect(termBucket(1)).toBe('short'));
  test('3 years → short', () => expect(termBucket(3)).toBe('short'));

  test('3.01 years → mid', () => expect(termBucket(3.01)).toBe('mid'));
  test('5 years → mid',    () => expect(termBucket(5)).toBe('mid'));
  test('9 years → mid',    () => expect(termBucket(9)).toBe('mid'));

  test('9.01 years → long', () => expect(termBucket(9.01)).toBe('long'));
  test('15 years → long',   () => expect(termBucket(15)).toBe('long'));
  test('30 years → long',   () => expect(termBucket(30)).toBe('long'));
  test('100 years → long',  () => expect(termBucket(100)).toBe('long'));
});

// ---- getSection7520Rate -------------------------------------------------

describe('getSection7520Rate()', () => {
  test('equals 120% of mid-term annual AFR', () => {
    const expected = SAMPLE.mid_term.annual * 1.2;
    expect(getSection7520Rate(SAMPLE)).toBe(expected);
  });

  test('is greater than the raw mid-term annual AFR', () => {
    expect(getSection7520Rate(SAMPLE)).toBeGreaterThan(SAMPLE.mid_term.annual);
  });

  test('is consistent with getAFR(mid, annual, 1.2)', () => {
    expect(getSection7520Rate(SAMPLE)).toBe(getAFR(SAMPLE, 'mid', 'annual', 1.2));
  });

  test('changes when mid-term annual changes', () => {
    const higher: AfrData = {
      ...SAMPLE,
      mid_term: { ...SAMPLE.mid_term, annual: 5.00 },
    };
    expect(getSection7520Rate(higher)).toBe(6.00);
  });
});

// ---- buildAfrSummary ----------------------------------------------------

describe('buildAfrSummary()', () => {
  const summary = buildAfrSummary(SAMPLE);

  test('shortTerm mirrors short_term', () => {
    expect(summary.shortTerm.annual).toBe(SAMPLE.short_term.annual);
    expect(summary.shortTerm.monthly).toBe(SAMPLE.short_term.monthly);
  });

  test('midTerm mirrors mid_term', () => {
    expect(summary.midTerm.semiannual).toBe(SAMPLE.mid_term.semiannual);
  });

  test('longTerm mirrors long_term', () => {
    expect(summary.longTerm.quarterly).toBe(SAMPLE.long_term.quarterly);
  });

  test('section7520 is 120% of mid-term annual', () => {
    expect(summary.section7520).toBe(getSection7520Rate(SAMPLE));
  });

  test('metadata fields are copied', () => {
    expect(summary.month).toBe(SAMPLE.month);
    expect(summary.source).toBe(SAMPLE.source);
    expect(summary.updatedAt).toBe(SAMPLE.updatedAt);
  });

  test('summary is a shallow copy (mutations do not propagate)', () => {
    summary.shortTerm.annual = 999;
    expect(SAMPLE.short_term.annual).toBe(4.33);
  });
});

// ---- cross-property consistency -----------------------------------------

describe('rate ordering sanity', () => {
  // For a given term, compounding more frequently = lower stated rate
  // (because more frequent compounding means a smaller per-period rate to achieve same EAR)
  test('short: annual > semiannual > quarterly > monthly', () => {
    const s = SAMPLE.short_term;
    expect(s.annual).toBeGreaterThan(s.semiannual);
    expect(s.semiannual).toBeGreaterThan(s.quarterly);
    expect(s.quarterly).toBeGreaterThan(s.monthly);
  });

  test('mid: annual > monthly', () => {
    expect(SAMPLE.mid_term.annual).toBeGreaterThan(SAMPLE.mid_term.monthly);
  });

  test('long: annual > monthly', () => {
    expect(SAMPLE.long_term.annual).toBeGreaterThan(SAMPLE.long_term.monthly);
  });

  test('section7520 > any individual term annual rate', () => {
    const s7520 = getSection7520Rate(SAMPLE);
    expect(s7520).toBeGreaterThan(SAMPLE.short_term.annual);
    expect(s7520).toBeGreaterThan(SAMPLE.mid_term.annual);
  });
});
