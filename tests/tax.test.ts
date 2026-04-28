import { applyBrackets } from '../src/core/tax';
import { FED_BRACKETS_2024, STANDARD_DEDUCTION_2024 } from '../src/data/taxBrackets2024';

describe('tax brackets', () => {
  test('MFJ at $200k taxable matches manual calc', () => {
    const r = applyBrackets(200_000, FED_BRACKETS_2024.marriedFilingJointly);
    // Expected: 23200*.10 + (94300-23200)*.12 + (200000-94300)*.22
    //         = 2320 + 8532 + 23254 = 34106
    expect(Math.abs(r.tax - 34106)).toBeLessThan(0.5);
    expect(r.marginalRate).toBe(0.22);
    expect(r.effectiveRate).toBeCloseTo(34106 / 200000, 4);
  });

  test('Single at standard deduction floor pays $0', () => {
    const r = applyBrackets(0, FED_BRACKETS_2024.single);
    expect(r.tax).toBe(0);
  });

  test('standard deduction lookup is consistent', () => {
    expect(STANDARD_DEDUCTION_2024.marriedFilingJointly).toBe(29_200);
    expect(STANDARD_DEDUCTION_2024.single).toBe(14_600);
  });
});
