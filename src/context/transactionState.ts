import type { ExpenseTransaction } from '../types/models';

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  categoryTotals: Record<string, number>;
}

function timeValue(date: Date): number {
  const value = date.getTime();
  return Number.isFinite(value) ? value : 0;
}

export function sortTransactionsByDateDesc(transactions: ExpenseTransaction[]): ExpenseTransaction[] {
  return [...transactions].sort((left, right) => {
    const dateDiff = timeValue(right.date) - timeValue(left.date);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    const leftId = typeof left.id === 'number' ? left.id : -1;
    const rightId = typeof right.id === 'number' ? right.id : -1;
    return rightId - leftId;
  });
}

export function summarizeTransactions(transactions: ExpenseTransaction[]): TransactionSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals: Record<string, number> = {};

  for (const transaction of transactions) {
    if (transaction.type === 'income') {
      totalIncome += transaction.amount;
      continue;
    }

    totalExpense += transaction.amount;
    categoryTotals[transaction.category] = (categoryTotals[transaction.category] ?? 0) + transaction.amount;
  }

  return {
    totalIncome,
    totalExpense,
    categoryTotals,
  };
}

export function upsertTransaction(
  transactions: ExpenseTransaction[],
  transaction: ExpenseTransaction,
): ExpenseTransaction[] {
  if (typeof transaction.id !== 'number') {
    return sortTransactionsByDateDesc([...transactions, transaction]);
  }

  const index = transactions.findIndex((item) => item.id === transaction.id);
  if (index < 0) {
    return sortTransactionsByDateDesc([...transactions, transaction]);
  }

  const next = [...transactions];
  next[index] = transaction;
  return sortTransactionsByDateDesc(next);
}

export function removeTransaction(transactions: ExpenseTransaction[], id: number): ExpenseTransaction[] {
  return transactions.filter((transaction) => transaction.id !== id);
}

export function removeTransactionsByWallet(
  transactions: ExpenseTransaction[],
  walletId: number,
): ExpenseTransaction[] {
  return transactions.filter((transaction) => transaction.walletId !== walletId);
}

export function clearGroupFromTransactions(
  transactions: ExpenseTransaction[],
  groupId: number,
): ExpenseTransaction[] {
  return transactions.map((transaction) => {
    if (transaction.groupId !== groupId) {
      return transaction;
    }

    return {
      ...transaction,
      groupId: null,
      groupUuid: null,
    };
  });
}
