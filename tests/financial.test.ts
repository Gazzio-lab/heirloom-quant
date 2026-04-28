import {
  fv, pv, fvAnnuity, pvAnnuity, pmt, npv, irr, mirr,
  effectiveRate, continuousEAR, cagr, realRate,
} from '../src/core/financial';

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

describe('financial primitives', () => {
  test('fv & pv inverse', () => {
    const future = fv(1000, 0.05, 10);
    expect(close(future, 1628.894627, 1e-3)).toBe(true);
    expect(close(pv(future, 0.05, 10), 1000, 1e-3)).toBe(true);
  });

  test('pvAnnuity / fvAnnuity', () => {
    expect(close(pvAnnuity(1000, 0.06, 10), 7360.087052, 1e-3)).toBe(true);
    expect(close(fvAnnuity(1000, 0.06, 10), 13180.79494, 1e-3)).toBe(true);
  });

  test('pmt matches Excel', () => {
    // Excel: =PMT(0.05/12, 30*12, -200000) ≈ 1073.64
    const monthly = pmt(0.05 / 12, 360, -200000);
    expect(close(monthly, 1073.6434, 1e-3)).toBe(true);
  });

  test('npv basic', () => {
    expect(close(npv(0.10, [-100, 60, 60]), 4.13223, 1e-3)).toBe(true);
  });

  test('irr converges', () => {
    const r = irr([-100, 60, 60]);
    // closed form for x = 1+r where 100 = 60x^-1 + 60x^-2 -> r ≈ 0.13066
    expect(close(r, 0.130662386, 1e-4)).toBe(true);
  });

  test('mirr is rational', () => {
    const r = mirr([-1000, 200, 300, 400, 500], 0.06, 0.10);
    expect(r).toBeGreaterThan(0.05);
    expect(r).toBeLessThan(0.20);
  });

  test('effective vs continuous', () => {
    expect(close(effectiveRate(0.12, 12), 0.12682503, 1e-6)).toBe(true);
    expect(close(continuousEAR(0.12), 0.127496852, 1e-6)).toBe(true);
  });

  test('cagr', () => {
    expect(close(cagr(100, 200, 10), 0.07177346, 1e-6)).toBe(true);
  });

  test('realRate Fisher', () => {
    expect(close(realRate(0.07, 0.03), 0.0388349, 1e-5)).toBe(true);
  });
});
