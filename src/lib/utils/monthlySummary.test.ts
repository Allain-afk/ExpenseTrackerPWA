import { describe, expect, test } from 'vitest';
import type { Budget, ExpenseTransaction } from '../../types/models';
import { getMonthlySummary } from './monthlySummary';

describe('getMonthlySummary', () => {
  test('counts only current-month expenses and sums positive budget limits', () => {
    const transactions: ExpenseTransaction[] = [
      { amount: 250, category: 'Food', description: 'Lunch', date: new Date(2026, 9, 3), type: 'expense' },
      { amount: 900, category: 'Salary', description: 'Pay', date: new Date(2026, 9, 1), type: 'income' },
      { amount: 100, category: 'Food', description: 'Old', date: new Date(2026, 8, 30), type: 'expense' },
    ];
    const budgets: Budget[] = [
      { id: 'food', category: 'Food', limitAmount: 1000 },
      { id: 'ignored', category: 'Other', limitAmount: -100 },
    ];

    expect(getMonthlySummary(transactions, budgets, new Date(2026, 9, 5))).toEqual({
      spent: 250,
      budget: 1000,
      remaining: 750,
      percentage: 25,
      status: 'healthy',
    });
  });

  test('returns finite no-budget values', () => {
    expect(getMonthlySummary([], [], new Date(2026, 9, 5))).toEqual({
      spent: 0,
      budget: 0,
      remaining: 0,
      percentage: 0,
      status: 'none',
    });
  });

  test('preserves overspend and marks warning thresholds', () => {
    const expense: ExpenseTransaction = {
      amount: 1250,
      category: 'Food',
      description: 'Month',
      date: new Date(2026, 9, 2),
      type: 'expense',
    };

    expect(getMonthlySummary([expense], [{ category: 'Food', limitAmount: 1000 }], new Date(2026, 9, 5)))
      .toMatchObject({ remaining: -250, percentage: 125, status: 'over' });
    expect(getMonthlySummary(
      [{ ...expense, amount: 800 }],
      [{ category: 'Food', limitAmount: 1000 }],
      new Date(2026, 9, 5),
    ).status).toBe('warning');
  });
});
