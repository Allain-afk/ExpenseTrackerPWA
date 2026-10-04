import { describe, expect, test } from 'vitest';
import type { ExpenseTransaction } from '../../types/models';
import { filterTransactions } from './transactionSearch';

const transactions: ExpenseTransaction[] = [
  { id: 1, amount: 150, category: 'Groceries', description: 'Market', date: new Date(2026, 9, 5), type: 'expense', walletId: 2, groupId: 3 },
  { id: 2, amount: 5000, category: 'Salary', description: 'Client pay', date: new Date(2026, 9, 4), type: 'income' },
];

const names = {
  getWalletName: (id: number) => id === 2 ? 'Cash Wallet' : undefined,
  getGroupName: (id: number) => id === 3 ? 'Household' : undefined,
};

describe('filterTransactions', () => {
  test.each(['market', 'GROCERIES', '  CASH WALLET ', 'houseHOLD'])(
    'matches normalized query %s across searchable fields',
    (query) => {
      expect(filterTransactions({ transactions, type: 'All', query, ...names })).toEqual([transactions[0]]);
    },
  );

  test('combines the type filter and query', () => {
    expect(filterTransactions({ transactions, type: 'Expense', query: 'market', ...names }))
      .toEqual([transactions[0]]);
    expect(filterTransactions({ transactions, type: 'Income', query: 'market', ...names }))
      .toEqual([]);
  });

  test('handles missing wallet and group relationships', () => {
    expect(filterTransactions({ transactions, type: 'All', query: 'client', ...names }))
      .toEqual([transactions[1]]);
    expect(filterTransactions({ transactions, type: 'All', query: '', ...names }))
      .toEqual(transactions);
  });
});
