import { describe, expect, it } from 'vitest';
import type { ExpenseTransaction } from '../types/models';
import {
  clearGroupFromTransactions,
  removeTransaction,
  removeTransactionsByWallet,
  sortTransactionsByDateDesc,
  summarizeTransactions,
  upsertTransaction,
} from './transactionState';

function tx(input: Partial<ExpenseTransaction> & Pick<ExpenseTransaction, 'amount' | 'category' | 'description' | 'date' | 'type'>): ExpenseTransaction {
  return {
    ...input,
    amount: input.amount,
    category: input.category,
    description: input.description,
    date: input.date,
    type: input.type,
  };
}

describe('transactionState', () => {
  it('summarizes totals and expense category totals', () => {
    const transactions: ExpenseTransaction[] = [
      tx({ id: 1, amount: 1000, category: 'Salary', description: 'Pay', date: new Date('2026-04-01T08:00:00Z'), type: 'income' }),
      tx({ id: 2, amount: 200, category: 'Food', description: 'Lunch', date: new Date('2026-04-02T08:00:00Z'), type: 'expense' }),
      tx({ id: 3, amount: 300, category: 'Food', description: 'Dinner', date: new Date('2026-04-03T08:00:00Z'), type: 'expense' }),
      tx({ id: 4, amount: 120, category: 'Transport', description: 'Taxi', date: new Date('2026-04-03T10:00:00Z'), type: 'expense' }),
    ];

    const summary = summarizeTransactions(transactions);

    expect(summary.totalIncome).toBe(1000);
    expect(summary.totalExpense).toBe(620);
    expect(summary.categoryTotals).toEqual({
      Food: 500,
      Transport: 120,
    });
  });

  it('sorts by date descending and uses id as tie-breaker', () => {
    const sameDate = new Date('2026-04-02T08:00:00Z');
    const transactions: ExpenseTransaction[] = [
      tx({ id: 2, amount: 1, category: 'A', description: 'A', date: sameDate, type: 'expense' }),
      tx({ id: 4, amount: 1, category: 'B', description: 'B', date: sameDate, type: 'expense' }),
      tx({ id: 1, amount: 1, category: 'C', description: 'C', date: new Date('2026-04-01T08:00:00Z'), type: 'expense' }),
    ];

    const sorted = sortTransactionsByDateDesc(transactions);

    expect(sorted.map((item) => item.id)).toEqual([4, 2, 1]);
  });

  it('upserts transaction by id and keeps sorted order', () => {
    const initial: ExpenseTransaction[] = [
      tx({ id: 1, amount: 10, category: 'Food', description: 'Old', date: new Date('2026-04-01T08:00:00Z'), type: 'expense' }),
      tx({ id: 2, amount: 20, category: 'Food', description: 'Current', date: new Date('2026-04-02T08:00:00Z'), type: 'expense' }),
    ];

    const updated = upsertTransaction(initial, tx({ id: 1, amount: 50, category: 'Bills', description: 'Updated', date: new Date('2026-04-03T08:00:00Z'), type: 'expense' }));

    expect(updated.map((item) => item.id)).toEqual([1, 2]);
    expect(updated[0].description).toBe('Updated');
    expect(updated[0].category).toBe('Bills');
  });

  it('removes a transaction by id', () => {
    const initial: ExpenseTransaction[] = [
      tx({ id: 1, amount: 10, category: 'Food', description: 'A', date: new Date('2026-04-01T08:00:00Z'), type: 'expense' }),
      tx({ id: 2, amount: 20, category: 'Food', description: 'B', date: new Date('2026-04-02T08:00:00Z'), type: 'expense' }),
    ];

    const next = removeTransaction(initial, 1);

    expect(next).toHaveLength(1);
    expect(next[0].id).toBe(2);
  });

  it('removes transactions by wallet id', () => {
    const initial: ExpenseTransaction[] = [
      tx({ id: 1, walletId: 10, amount: 10, category: 'Food', description: 'A', date: new Date('2026-04-01T08:00:00Z'), type: 'expense' }),
      tx({ id: 2, walletId: 11, amount: 20, category: 'Food', description: 'B', date: new Date('2026-04-02T08:00:00Z'), type: 'expense' }),
      tx({ id: 3, walletId: 10, amount: 30, category: 'Food', description: 'C', date: new Date('2026-04-03T08:00:00Z'), type: 'expense' }),
    ];

    const next = removeTransactionsByWallet(initial, 10);

    expect(next).toHaveLength(1);
    expect(next[0].id).toBe(2);
  });

  it('clears group references without removing transactions', () => {
    const initial: ExpenseTransaction[] = [
      tx({ id: 1, groupId: 90, groupUuid: 'g-90', amount: 10, category: 'Food', description: 'A', date: new Date('2026-04-01T08:00:00Z'), type: 'expense' }),
      tx({ id: 2, groupId: 91, groupUuid: 'g-91', amount: 20, category: 'Food', description: 'B', date: new Date('2026-04-02T08:00:00Z'), type: 'expense' }),
    ];

    const next = clearGroupFromTransactions(initial, 90);

    expect(next).toHaveLength(2);
    expect(next[0].groupId).toBeNull();
    expect(next[0].groupUuid).toBeNull();
    expect(next[1].groupId).toBe(91);
  });
});
