/**
 * Pennsylvania Inheritance Tax Engine
 *
 * Rates per PA Department of Revenue (72 P.S. §9106):
 *   0%   — surviving spouse
 *   0%   — charities / exempt organizations
 *   4.5% — direct lineal descendants (children, grandchildren, great-grandchildren)
 *            and ancestors (parents, grandparents)
 *  12%   — siblings
 *  15%   — all other heirs (nieces, nephews, non-relatives, etc.)
 *
 * Key deductions allowed:
 *   - Funeral expenses (actual, reasonable)
 *   - Administrative expenses (attorney, accounting)
 *   - Debts of decedent
 *   - Family exemption ($3,500 per PA §2109)
 *
 * NOTE: PA inheritance tax is assessed on the clear value of transferred
 * property. Jointly-held property with right of survivorship goes to
 * surviving spouse at 0%. JTWROS between non-spouses: 50% is taxable.
 *
 * This engine is for planning estimates only. Verify against current
 * PA DOR guidance before filing.
 */

export type PaBeneficiaryClass = 'spouse' | 'lineal' | 'sibling' | 'other' | 'charity';

export const PA_RATES: Record<PaBeneficiaryClass, number> = {
  spouse:  0.000,
  lineal:  0.045,
  sibling: 0.120,
  other:   0.150,
  charity: 0.000,
};

export interface PaBeneficiaryAllocation {
  name: string;
  relation: PaBeneficiaryClass;
  /** Dollar amount received (after federal estate tax, before PA tax). */
  amount: number;
}

export interface PaInheritanceInput {
  grossEstate: number;
  federalEstateTax: number;
  funeralExpenses: number;
  adminExpenses: number;
  debts: number;
  /** Number of resident family members claiming the $3,500 family exemption. */
  familyExemptionCount: number;
  beneficiaries: PaBeneficiaryAllocation[];
}

export interface PaBeneficiaryResult {
  name: string;
  relation: PaBeneficiaryClass;
  amount: number;
  rate: number;
  tax: number;
  netReceived: number;
}

export interface PaInheritanceTaxResult {
  taxableEstate: number;
  totalDeductions: number;
  byBeneficiary: PaBeneficiaryResult[];
  totalTax: number;
  effectiveRate: number;
}

/**
 * Compute PA inheritance tax for a given estate.
 *
 * The beneficiary allocations should be expressed as shares of the
 * net estate (after federal estate tax and deductions). If provided
 * as proportions of gross estate, set `grossEstate` accordingly.
 */
export function computePaInheritanceTax(
  input: PaInheritanceInput,
): PaInheritanceTaxResult {
  const familyExemption = input.familyExemptionCount * 3_500;
  const totalDeductions =
    input.funeralExpenses +
    input.adminExpenses +
    input.debts +
    familyExemption +
    input.federalEstateTax;

  const taxableEstate = Math.max(input.grossEstate - totalDeductions, 0);

  // Allocate the taxable estate proportionally across beneficiaries
  const totalShares = input.beneficiaries.reduce((s, b) => s + b.amount, 0);

  const byBeneficiary: PaBeneficiaryResult[] = input.beneficiaries.map((b) => {
    const share = totalShares > 0 ? b.amount / totalShares : 0;
    const taxableAmount = taxableEstate * share;
    const rate = PA_RATES[b.relation] ?? PA_RATES.other;
    const tax = taxableAmount * rate;
    return {
      name: b.name,
      relation: b.relation,
      amount: b.amount,
      rate,
      tax,
      netReceived: b.amount - tax,
    };
  });

  const totalTax = byBeneficiary.reduce((s, b) => s + b.tax, 0);
  const effectiveRate = taxableEstate > 0 ? totalTax / taxableEstate : 0;

  return { taxableEstate, totalDeductions, byBeneficiary, totalTax, effectiveRate };
}

/**
 * Quick estimate: given just gross estate, filing class proportions,
 * and simple deductions. Useful for dashboard approximations.
 */
export function quickPaTax(params: {
  taxableEstate: number;
  spousePct: number;
  linealPct: number;
  siblingPct: number;
  otherPct: number;
  charityPct: number;
}): number {
  const { taxableEstate: te, spousePct, linealPct, siblingPct, otherPct, charityPct } = params;
  return (
    te * spousePct  * PA_RATES.spouse  +
    te * linealPct  * PA_RATES.lineal  +
    te * siblingPct * PA_RATES.sibling +
    te * otherPct   * PA_RATES.other   +
    te * charityPct * PA_RATES.charity
  );
}
