import { pmt } from './financial';

export interface AmortizationRow {
  [key: string]: number;
  period: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface AmortizationResult {
  payment: number;
  totalPaid: number;
  totalInterest: number;
  schedule: AmortizationRow[];
}

/**
 * Build a fixed-rate amortization schedule.
 * principal = loan amount (positive)
 * annualRate = nominal annual interest rate (e.g., 0.065 for 6.5%)
 * years = total term in years
 * paymentsPerYear = 12 for monthly, 26 biweekly, etc.
 * extraPayment = optional extra principal each period
 */
export function buildAmortization(
  principal: number,
  annualRate: number,
  years: number,
  paymentsPerYear = 12,
  extraPayment = 0
): AmortizationResult {
  const n = Math.round(years * paymentsPerYear);
  const r = annualRate / paymentsPerYear;
  // pmt() returns a negative cash outflow; flip sign for human readability
  const basePayment = -pmt(r, n, principal, 0, false);

  const schedule: AmortizationRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;

  for (let p = 1; p <= n && balance > 0.005; p++) {
    const interest = balance * r;
    let principalPaid = basePayment - interest + extraPayment;
    if (principalPaid > balance) principalPaid = balance;
    const payment = principalPaid + interest;
    balance -= principalPaid;
    totalInterest += interest;
    totalPaid += payment;
    schedule.push({
      period: p,
      payment,
      interest,
      principal: principalPaid,
      balance: Math.max(balance, 0),
    });
  }

  return { payment: basePayment, totalPaid, totalInterest, schedule };
}
