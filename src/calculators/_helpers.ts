import type { Calculator, CalculatorResult } from '../core/types';

/**
 * Tiny factory used by every calculator module so the boilerplate is
 * consistent and the result shape is always correct.
 */
export function defineCalculator(c: Calculator): Calculator {
  return c;
}

export function num(v: any, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

export function emptyResult(): CalculatorResult {
  return { summary: {}, schedule: [], notes: [] };
}
