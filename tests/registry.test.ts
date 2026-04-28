import { listCalculators, TABS } from '../src/calculators/registry';

describe('calculator registry', () => {
  test('all 16 tabs are present', () => {
    expect(TABS.length).toBe(16);
    expect(TABS.map(t => t.id)).toEqual(expect.arrayContaining([
      'investment','inflation','realestate','insurance','networth','goals',
      'budgeting','valuation','estate','trusts','charitable','techniques',
      'taxes','retirement','pvfv','section199a',
    ]));
  });

  test('each calculator has a unique id, schema, and runs with defaults', () => {
    const calcs = listCalculators();
    expect(calcs.length).toBeGreaterThan(20);
    const ids = new Set<string>();
    for (const c of calcs) {
      expect(c.id).toBeTruthy();
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);
      expect(c.inputs.length).toBeGreaterThanOrEqual(0);
      // Build defaults map and execute
      const inputs: Record<string, any> = {};
      for (const f of c.inputs) inputs[f.name] = f.default;
      const result = c.run(inputs);
      expect(result).toBeTruthy();
      expect(typeof result.summary).toBe('object');
      // At least one summary entry
      expect(Object.keys(result.summary).length).toBeGreaterThan(0);
    }
  });

  test('every tab id maps to at least one calculator', () => {
    const calcs = listCalculators();
    const cats = new Set(calcs.map(c => c.category));
    for (const t of TABS) {
      expect(cats.has(t.id)).toBe(true);
    }
  });
});
