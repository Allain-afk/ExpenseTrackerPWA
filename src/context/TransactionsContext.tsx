import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createTransactionsRepository } from '../lib/db/repositories/transactionsRepository';
import { createBudgetsRepository } from '../lib/db/repositories/budgetsRepository';
import { createAnalyticsRepository } from '../lib/db/repositories/analyticsRepository';
import { databaseClient } from '../lib/db/client';
import type { ExpenseTransaction, TransactionType } from '../types/models';
import { AuthContext } from './AuthContext';
import { useSettings } from '../hooks/useSettings';
import { formatMoney } from '../lib/utils/format';
import { showWarningToast } from '../lib/utils/appToast';
import {
  clearGroupFromTransactions,
  removeTransaction,
  removeTransactionsByWallet,
  sortTransactionsByDateDesc,
  summarizeTransactions,
  upsertTransaction,
} from './transactionState';

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
  clearTransactionsForWallet: (walletId: number) => void;
  clearTransactionGroup: (groupId: number) => void;
}

export const TransactionsContext = createContext<TransactionsContextValue | null>(null);

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const authContext = useContext(AuthContext);
  const settings = useSettings();
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const summary = useMemo(() => {
    return summarizeTransactions(transactions);
  }, [transactions]);

  const walletBalancesById = useMemo(() => {
    const balances = new Map<number, number>();

    for (const transaction of transactions) {
      if (typeof transaction.walletId !== 'number') {
        continue;
      }

      const current = balances.get(transaction.walletId) ?? 0;
      const next =
        transaction.type === 'income'
          ? current + transaction.amount
          : current - transaction.amount;

      balances.set(transaction.walletId, next);
    }

    return balances;
  }, [transactions]);

  const walletTransactionsById = useMemo(() => {
    const grouped = new Map<number, ExpenseTransaction[]>();

    for (const transaction of transactions) {
      if (typeof transaction.walletId !== 'number') {
        continue;
      }

      const current = grouped.get(transaction.walletId);
      if (current) {
        current.push(transaction);
      } else {
        grouped.set(transaction.walletId, [transaction]);
      }
    }

    return grouped;
  }, [transactions]);

  const transactionsById = useMemo(() => {
    const byId = new Map<number, ExpenseTransaction>();

    for (const transaction of transactions) {
      if (typeof transaction.id === 'number') {
        byId.set(transaction.id, transaction);
      }
    }

    return byId;
  }, [transactions]);

  async function loadTransactions(): Promise<ExpenseTransaction[]> {
    const loadedTransactions = await transactionsRepository.getAllTransactions();
    const sortedTransactions = sortTransactionsByDateDesc(loadedTransactions);

    setTransactions(sortedTransactions);
    setIsLoaded(true);

    return sortedTransactions;
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
    const persistedTransaction: ExpenseTransaction = {
      ...ownedTransaction,
      id,
    };

    setTransactions((previousTransactions) => {
      return upsertTransaction(previousTransactions, persistedTransaction);
    });

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

    return id;
  }

  async function updateTransaction(transaction: ExpenseTransaction): Promise<void> {
    await transactionsRepository.updateTransaction(transaction);

    setTransactions((previousTransactions) => {
      return upsertTransaction(previousTransactions, transaction);
    });
  }

  async function deleteTransaction(id: number): Promise<void> {
    await transactionsRepository.deleteTransaction(id);

    setTransactions((previousTransactions) => {
      return removeTransaction(previousTransactions, id);
    });
  }

  const clearTransactionsForWallet = useCallback((walletId: number): void => {
    setTransactions((previousTransactions) => {
      return removeTransactionsByWallet(previousTransactions, walletId);
    });
  }, []);

  const clearTransactionGroup = useCallback((groupId: number): void => {
    setTransactions((previousTransactions) => {
      return clearGroupFromTransactions(previousTransactions, groupId);
    });
  }, []);

  const getWalletBalance = useCallback((walletId: number): number => {
    return walletBalancesById.get(walletId) ?? 0;
  }, [walletBalancesById]);

  const getWalletTransactions = useCallback((walletId: number): ExpenseTransaction[] => {
    return walletTransactionsById.get(walletId) ?? [];
  }, [walletTransactionsById]);

  const getTransactionById = useCallback((transactionId: number): ExpenseTransaction | undefined => {
    return transactionsById.get(transactionId);
  }, [transactionsById]);

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpense,
        categoryTotals: summary.categoryTotals,
        balance: summary.totalIncome - summary.totalExpense,
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
        clearTransactionsForWallet,
        clearTransactionGroup,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}
