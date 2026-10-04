import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ensureDatabaseReady } from '../lib/db/client';
import { SettingsContext } from './SettingsContext';
import { TransactionsContext } from './TransactionsContext';
import { WalletsContext } from './WalletsContext';
import { ExpenseGroupsContext } from './ExpenseGroupsContext';
import { BudgetsContext } from './BudgetsContext';
import { BudgetingContext } from './BudgetingContext';

const BOOTSTRAP_TIMEOUT_MS = 15000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: number | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle !== null) {
      window.clearTimeout(timeoutHandle);
    }
  }
}

export interface AppBootstrapContextValue {
  isBootstrapping: boolean;
  hasBootstrapped: boolean;
  bootstrapError: string | null;
  bootstrap: (force?: boolean) => Promise<void>;
}

export const AppBootstrapContext = createContext<AppBootstrapContextValue | null>(null);

export function AppBootstrapProvider({ children }: { children: ReactNode }) {
  const settingsContext = useContext(SettingsContext);
  const transactionsContext = useContext(TransactionsContext);
  const walletsContext = useContext(WalletsContext);
  const expenseGroupsContext = useContext(ExpenseGroupsContext);
  const budgetsContext = useContext(BudgetsContext);
  const budgetingContext = useContext(BudgetingContext);
  const bootstrapPromiseRef = useRef<Promise<void> | null>(null);
  const hasBootstrappedRef = useRef(false);
  const bootstrapSourcesRef = useRef({
    settings: settingsContext,
    transactions: transactionsContext,
    wallets: walletsContext,
    expenseGroups: expenseGroupsContext,
    budgets: budgetsContext,
    budgeting: budgetingContext,
  });
  useEffect(() => {
    bootstrapSourcesRef.current = {
      settings: settingsContext,
      transactions: transactionsContext,
      wallets: walletsContext,
      expenseGroups: expenseGroupsContext,
      budgets: budgetsContext,
      budgeting: budgetingContext,
    };
  }, [
    budgetingContext,
    budgetsContext,
    expenseGroupsContext,
    settingsContext,
    transactionsContext,
    walletsContext,
  ]);

  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const runBootstrap = useCallback((force = false): Promise<void> => {
    if (bootstrapPromiseRef.current) {
      return bootstrapPromiseRef.current;
    }

    if (hasBootstrappedRef.current && !force) {
      return Promise.resolve();
    }

    const work = (async () => {
      setIsBootstrapping(true);
      setBootstrapError(null);

      try {
        await ensureDatabaseReady();
        const {
          settings,
          transactions,
          wallets,
          expenseGroups,
          budgets,
          budgeting,
        } = bootstrapSourcesRef.current;
        const bootstrapTasks: Array<Promise<unknown> | undefined> = [
          force || !settings?.isLoaded ? settings?.loadSettings() : undefined,
          force || !transactions?.isLoaded ? transactions?.loadTransactions() : undefined,
          force || !wallets?.isLoaded ? wallets?.loadWallets() : undefined,
          force || !expenseGroups?.isLoaded ? expenseGroups?.loadExpenseGroups() : undefined,
          force || !budgets?.isLoaded ? budgets?.loadBudgets() : undefined,
          force || !budgeting?.isLoaded ? budgeting?.loadPlans() : undefined,
        ];

        await withTimeout(
          Promise.all(bootstrapTasks.filter((task): task is Promise<unknown> => Boolean(task))),
          BOOTSTRAP_TIMEOUT_MS,
          'App bootstrap',
        );

        hasBootstrappedRef.current = true;
        setHasBootstrapped(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to initialize the app.';
        setBootstrapError(message);
        throw error;
      } finally {
        setIsBootstrapping(false);
        bootstrapPromiseRef.current = null;
      }
    })();

    bootstrapPromiseRef.current = work;
    return work;
  }, []);

  const value = useMemo<AppBootstrapContextValue>(() => ({
    isBootstrapping,
    hasBootstrapped,
    bootstrapError,
    bootstrap: runBootstrap,
  }), [bootstrapError, hasBootstrapped, isBootstrapping, runBootstrap]);

  return (
    <AppBootstrapContext.Provider
      value={value}
    >
      {children}
    </AppBootstrapContext.Provider>
  );
}
