import type { AfrData } from './types';

/**
 * Hardcoded fallback AFR rates for April 2025 (IRS Rev. Rul. 2025-9).
 * Used when the live fetch fails and no cached data exists.
 * Update annually or let the live fetch override this at runtime.
 *
 * Source: https://www.irs.gov/applicable-federal-rates
 */
export const DEFAULT_AFR_DATA: AfrData = {
  month: '2025-04',
  updatedAt: '2025-04-15T00:00:00.000Z',
  source: 'IRS Rev. Rul. 2025-9 (built-in fallback)',
  short_term: {
    annual: 4.33,
    semiannual: 4.28,
    quarterly: 4.26,
    monthly: 4.25,
  },
  mid_term: {
    annual: 4.02,
    semiannual: 3.98,
    quarterly: 3.96,
    monthly: 3.95,
  },
  long_term: {
    annual: 4.56,
    semiannual: 4.51,
    quarterly: 4.49,
    monthly: 4.48,
  },
};
