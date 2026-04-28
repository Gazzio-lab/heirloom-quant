import { buildAmortization } from '../src/core/amortization';

describe('amortization schedule', () => {
  test('30-year fixed mortgage matches Excel within $0.01 per row', () => {
    const r = buildAmortization(200000, 0.05, 30, 12);
    expect(r.schedule.length).toBe(360);
    expect(Math.abs(r.payment - 1073.6434)).toBeLessThan(0.01);
    expect(Math.abs(r.schedule[0].interest - 833.3333)).toBeLessThan(0.01);
    expect(r.schedule[359].balance).toBeLessThan(0.01);
    expect(r.totalInterest).toBeGreaterThan(180000);
    expect(r.totalInterest).toBeLessThan(190000);
  });

  test('extra payment shortens term', () => {
    const baseline = buildAmortization(200000, 0.05, 30, 12, 0);
    const accelerated = buildAmortization(200000, 0.05, 30, 12, 200);
    expect(accelerated.schedule.length).toBeLessThan(baseline.schedule.length);
    expect(accelerated.totalInterest).toBeLessThan(baseline.totalInterest);
  });
});
