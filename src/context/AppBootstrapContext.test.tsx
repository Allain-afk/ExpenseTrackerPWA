import { act, render } from '@testing-library/react';
import { useContext, type ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  AppBootstrapContext,
  AppBootstrapProvider,
  type AppBootstrapContextValue,
} from './AppBootstrapContext';
import { SettingsContext, type SettingsContextValue } from './SettingsContext';
import { TransactionsContext, type TransactionsContextValue } from './TransactionsContext';
import { WalletsContext, type WalletsContextValue } from './WalletsContext';
import {
  ExpenseGroupsContext,
  type ExpenseGroupsContextValue,
} from './ExpenseGroupsContext';
import { BudgetsContext, type BudgetsContextValue } from './BudgetsContext';
import { BudgetingContext, type BudgetingContextValue } from './BudgetingContext';
import { ensureDatabaseReady } from '../lib/db/client';

vi.mock('../lib/db/client', () => ({
  databaseClient: {
    sql: vi.fn(async () => []),
    transaction: vi.fn(),
  },
  ensureDatabaseReady: vi.fn(async () => undefined),
}));

const mockedEnsureDatabaseReady = vi.mocked(ensureDatabaseReady);

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function renderBootstrapProbe(overrides?: {
  loadTransactions?: TransactionsContextValue['loadTransactions'];
}) {
  const current: { value: AppBootstrapContextValue | null } = { value: null };
  const settings = {
    isLoaded: false,
    loadSettings: vi.fn(async () => ({})),
  } as unknown as SettingsContextValue;
  const transactions = {
    isLoaded: false,
    loadTransactions: overrides?.loadTransactions ?? vi.fn(async () => []),
  } as unknown as TransactionsContextValue;
  const wallets = {
    isLoaded: false,
    loadWallets: vi.fn(async () => []),
  } as unknown as WalletsContextValue;
  const expenseGroups = {
    isLoaded: false,
    loadExpenseGroups: vi.fn(async () => []),
  } as unknown as ExpenseGroupsContextValue;
  const budgets = {
    isLoaded: false,
    loadBudgets: vi.fn(async () => []),
  } as unknown as BudgetsContextValue;
  const budgeting = {
    isLoaded: false,
    loadPlans: vi.fn(async () => []),
  } as unknown as BudgetingContextValue;

  function Probe() {
    current.value = useContext(AppBootstrapContext);
    return null;
  }

  function Providers({ children }: { children: ReactNode }) {
    return (
      <SettingsContext.Provider value={settings}>
        <TransactionsContext.Provider value={transactions}>
          <WalletsContext.Provider value={wallets}>
            <ExpenseGroupsContext.Provider value={expenseGroups}>
              <BudgetsContext.Provider value={budgets}>
                <BudgetingContext.Provider value={budgeting}>
                  {children}
                </BudgetingContext.Provider>
              </BudgetsContext.Provider>
            </ExpenseGroupsContext.Provider>
          </WalletsContext.Provider>
        </TransactionsContext.Provider>
      </SettingsContext.Provider>
    );
  }

  render(
    <AppBootstrapProvider>
      <Probe />
    </AppBootstrapProvider>,
    { wrapper: Providers },
  );

  if (!current.value) {
    throw new Error('Bootstrap probe did not receive context.');
  }

  return current as { value: AppBootstrapContextValue };
}

describe('AppBootstrapProvider', () => {
  beforeEach(() => {
    mockedEnsureDatabaseReady.mockReset();
    mockedEnsureDatabaseReady.mockResolvedValue(undefined);
  });

  test('shares active bootstrap work with a concurrent forced request', async () => {
    const databaseReady = deferred<void>();
    mockedEnsureDatabaseReady.mockReturnValue(databaseReady.promise);
    const loadTransactions = vi.fn(async () => []);
    const context = renderBootstrapProbe({ loadTransactions });

    let first!: Promise<void>;
    let forced!: Promise<void>;
    act(() => {
      first = context.value.bootstrap();
      forced = context.value.bootstrap(true);
    });

    expect(forced).toBe(first);

    await act(async () => {
      databaseReady.resolve();
      await first;
    });
    expect(mockedEnsureDatabaseReady).toHaveBeenCalledTimes(1);
    expect(loadTransactions).toHaveBeenCalledTimes(1);
  });

  test('publishes completion before bootstrap resolves', async () => {
    const context = renderBootstrapProbe();

    await act(async () => {
      await context.value.bootstrap();
    });

    expect(context.value.hasBootstrapped).toBe(true);
    expect(context.value.isBootstrapping).toBe(false);
  });

  test('clears loading and exposes a retryable error when bootstrap fails', async () => {
    mockedEnsureDatabaseReady.mockRejectedValueOnce(new Error('Database unavailable'));
    const context = renderBootstrapProbe();

    await act(async () => {
      await expect(context.value.bootstrap()).rejects.toThrow('Database unavailable');
    });

    expect(context.value.isBootstrapping).toBe(false);
    expect(context.value.bootstrapError).toBe('Database unavailable');
  });
});
