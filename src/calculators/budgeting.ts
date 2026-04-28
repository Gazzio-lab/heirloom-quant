import { defineCalculator, num } from './_helpers';

const CAT = 'budgeting';

export const budgetingCalculators = [
  defineCalculator({
    id: 'bud.cashflow',
    name: 'Monthly Cash Flow',
    category: CAT,
    description: 'Income minus categorized expenses. Surplus is candidate savings.',
    inputs: [
      { name: 'income', label: 'Monthly take-home', type: 'currency', default: 9000 },
      { name: 'housing', label: 'Housing', type: 'currency', default: 2700 },
      { name: 'transport', label: 'Transportation', type: 'currency', default: 700 },
      { name: 'food', label: 'Food', type: 'currency', default: 900 },
      { name: 'insurance', label: 'Insurance', type: 'currency', default: 500 },
      { name: 'debtPmts', label: 'Debt payments', type: 'currency', default: 600 },
      { name: 'other', label: 'Other', type: 'currency', default: 1500 },
    ],
    run: (i) => {
      const expenses = num(i.housing) + num(i.transport) + num(i.food) + num(i.insurance) + num(i.debtPmts) + num(i.other);
      const surplus = num(i.income) - expenses;
      return {
        summary: {
          'Total Expenses': expenses,
          'Surplus / (Deficit)': surplus,
          'Savings Rate': num(i.income) > 0 ? surplus / num(i.income) : NaN,
        },
      };
    },
  }),

  defineCalculator({
    id: 'bud.debtSnowball',
    name: 'Debt Snowball Payoff',
    category: CAT,
    description: 'Apply a fixed extra payment to the smallest balance, then roll over.',
    inputs: [
      { name: 'debts', label: 'Debts (balance@APR;balance@APR;…)', type: 'text', default: '5000@21;12000@9;25000@6.5' },
      { name: 'monthly', label: 'Total monthly debt budget', type: 'currency', default: 1500 },
    ],
    run: (i) => {
      type Debt = { balance: number; rate: number; minPayment: number };
      const parts = String(i.debts ?? '').split(';').map(s => s.trim()).filter(Boolean);
      const debts: Debt[] = parts.map(p => {
        const [bal, apr] = p.split('@').map(s => num(s));
        return { balance: bal, rate: apr / 100 / 12, minPayment: Math.max(25, bal * 0.02) };
      });
      const budget = num(i.monthly);
      let month = 0;
      let totalInterest = 0;
      const schedule: Array<Record<string, number>> = [];
      while (debts.some(d => d.balance > 0.01) && month < 600) {
        month++;
        // accrue interest
        for (const d of debts) {
          const interest = d.balance * d.rate;
          d.balance += interest;
          totalInterest += interest;
        }
        // pay minimums
        let remaining = budget;
        for (const d of debts) {
          const pay = Math.min(d.minPayment, d.balance, remaining);
          d.balance -= pay;
          remaining -= pay;
        }
        // snowball: smallest balance first
        debts.sort((a, b) => a.balance - b.balance);
        for (const d of debts) {
          if (remaining <= 0) break;
          const pay = Math.min(remaining, d.balance);
          d.balance -= pay;
          remaining -= pay;
        }
        schedule.push({
          month,
          balance: debts.reduce((s, d) => s + d.balance, 0),
          interestPaid: totalInterest,
        });
      }
      return {
        summary: {
          'Months to Debt-Free': month,
          'Years to Debt-Free': month / 12,
          'Total Interest Paid': totalInterest,
        },
        schedule,
      };
    },
  }),
];
