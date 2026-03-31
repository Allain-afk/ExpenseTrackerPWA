import { createContext, useContext, useState, type ReactNode } from 'react';
import { createTransactionsRepository } from '../lib/db/repositories/transactionsRepository';
import { createBudgetsRepository } from '../lib/db/repositories/budgetsRepository';
import { createAnalyticsRepository } from '../lib/db/repositories/analyticsRepository';
import { databaseClient } from '../lib/db/client';
import type { ExpenseTransaction, TransactionType } from '../types/models';
import { AuthContext } from './AuthContext';
import { useSettings } from '../hooks/useSettings';
import { formatMoney } from '../lib/utils/format';
import { showWarningToast } from '../lib/utils/appToast';

const transactionsRepository = createTransactionsRepository(databaseClient);
const budgetsRepository = createBudgetsRepository(databaseClient);
const analyticsRepository = createAnalyticsRepository(databaseClient);

export interface TransactionsContextValue {
  transactions: ExpenseTransaction[];
  totalIncome: number;
  totalExpense: number;
  categoryTotals: Record<string, number>;
  balance: number;
  isLoaded: boolean;
  loadTransactions: () => Promise<ExpenseTransaction[]>;
  addTransaction: (transaction: ExpenseTransaction) => Promise<number>;
  updateTransaction: (transaction: ExpenseTransaction) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  getTransactionsByDateRange: (start: Date, end: Date) => Promise<ExpenseTransaction[]>;
  getTransactionsByType: (type: TransactionType) => Promise<ExpenseTransaction[]>;
  getWalletBalance: (walletId: number) => number;
  getWalletTransactions: (walletId: number) => ExpenseTransaction[];
  getTransactionById: (transactionId: number) => ExpenseTransaction | undefined;
}

export const TransactionsContext = createContext<TransactionsContextValue | null>(null);

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const authContext = useContext(AuthContext);
  const settings = useSettings();
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  async function loadTransactions(): Promise<ExpenseTransaction[]> {
    const [loadedTransactions, income, expense, categories] = await Promise.all([
      transactionsRepository.getAllTransactions(),
      transactionsRepository.getTotalByType('income'),
      transactionsRepository.getTotalByType('expense'),
      transactionsRepository.getCategoryTotals('expense'),
    ]);

    setTransactions(loadedTransactions);
    setTotalIncome(income);
    setTotalExpense(expense);
    setCategoryTotals(categories);
    setIsLoaded(true);

    return loadedTransactions;
  }

  async function addTransaction(transaction: ExpenseTransaction): Promise<number> {
    const effectiveUserId = authContext?.user?.id ?? transaction.userId ?? null;
    const ownedTransaction: ExpenseTransaction = {
      ...transaction,
      userId: effectiveUserId,
    };

    const previousMonthlySpend =
      transaction.type === 'expense'
        ? await analyticsRepository.getMonthlyCategorySpend(transaction.category, {
          referenceDate: transaction.date,
          userId: effectiveUserId,
        })
        : 0;

    const id = await transactionsRepository.insertTransaction(ownedTransaction);

    if (transaction.type === 'expense') {
      const matchingBudget = await budgetsRepository.getBudgetByCategory(
        transaction.category,
        effectiveUserId,
      );

      if (matchingBudget && matchingBudget.limitAmount > 0) {
        const currentMonthlySpend = await analyticsRepository.getMonthlyCategorySpend(
          transaction.category,
          {
            referenceDate: transaction.date,
            userId: effectiveUserId,
          },
        );

        const hadBudgetHeadroom = previousMonthlySpend <= matchingBudget.limitAmount;
        const nowExceededBudget = currentMonthlySpend > matchingBudget.limitAmount;

        if (hadBudgetHeadroom && nowExceededBudget) {
          const percentage = Math.round((currentMonthlySpend / matchingBudget.limitAmount) * 100);
          showWarningToast(
            `Budget exceeded: ${transaction.category}`,
            `${formatMoney(currentMonthlySpend, settings.currencySymbol)} spent of ${formatMoney(matchingBudget.limitAmount, settings.currencySymbol)} (${percentage}%).`,
            { duration: 5200 },
          );
        }
      }
    }

    await loadTransactions();
    return id;
  }

  async function updateTransaction(transaction: ExpenseTransaction): Promise<void> {
    await transactionsRepository.updateTransaction(transaction);
    await loadTransactions();
  }

  async function deleteTransaction(id: number): Promise<void> {
    await transactionsRepository.deleteTransaction(id);
    await loadTransactions();
  }

  function getWalletBalance(walletId: number): number {
    let income = 0;
    let expense = 0;

    for (const transaction of transactions.filter((item) => item.walletId === walletId)) {
      if (transaction.type === 'income') {
        income += transaction.amount;
      } else {
        expense += transaction.amount;
      }
    }

    return income - expense;
  }

  function getWalletTransactions(walletId: number): ExpenseTransaction[] {
    return transactions.filter((transaction) => transaction.walletId === walletId);
  }

  function getTransactionById(transactionId: number): ExpenseTransaction | undefined {
    return transactions.find((transaction) => transaction.id === transactionId);
  }

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        totalIncome,
        totalExpense,
        categoryTotals,
        balance: totalIncome - totalExpense,
        isLoaded,
        loadTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getTransactionsByDateRange: transactionsRepository.getTransactionsByDateRange,
        getTransactionsByType: transactionsRepository.getTransactionsByType,
        getWalletBalance,
        getWalletTransactions,
        getTransactionById,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}
