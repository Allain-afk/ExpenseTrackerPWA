import type { Budget, ExpenseTransaction } from '../../types/models';

export interface MonthlySummaryValue {
  spent: number;
  budget: number;
  remaining: number;
  percentage: number;
  status: 'none' | 'healthy' | 'warning' | 'over';
}

export function getMonthlySummary(
  transactions: ExpenseTransaction[],
  budgets: Budget[],
  referenceDate: Date,
): MonthlySummaryValue {
  const spent = transactions
    .filter((transaction) => {
      return transaction.type === 'expense'
        && transaction.date.getFullYear() === referenceDate.getFullYear()
        && transaction.date.getMonth() === referenceDate.getMonth();
    })
    .reduce((total, transaction) => total + transaction.amount, 0);
  const budget = budgets.reduce((total, item) => total + Math.max(0, item.limitAmount), 0);
  const remaining = budget > 0 ? budget - spent : 0;
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  const status = budget <= 0
    ? 'none'
    : percentage > 100
      ? 'over'
      : percentage >= 80
        ? 'warning'
        : 'healthy';

  return { spent, budget, remaining, percentage, status };
}
