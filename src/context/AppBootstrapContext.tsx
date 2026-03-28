import {
  createContext,
  startTransition,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ensureDatabaseReady } from '../lib/db/client';
import { SettingsContext } from './SettingsContext';
import { TransactionsContext } from './TransactionsContext';
import { WalletsContext } from './WalletsContext';
import { ExpenseGroupsContext } from './ExpenseGroupsContext';

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
  const bootstrapPromiseRef = useRef<Promise<void> | null>(null);

  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  async function runBootstrap(force = false): Promise<void> {
    if (hasBootstrapped && !force) {
      return;
    }

    if (bootstrapPromiseRef.current && !force) {
      return bootstrapPromiseRef.current;
    }

    const work = (async () => {
      setIsBootstrapping(true);
      setBootstrapError(null);

      try {
        await ensureDatabaseReady();
        await Promise.all([
          settingsContext?.loadSettings(),
          transactionsContext?.loadTransactions(),
          walletsContext?.loadWallets(),
          expenseGroupsContext?.loadExpenseGroups(),
        ]);

        startTransition(() => {
          setHasBootstrapped(true);
        });
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
  }

  return (
    <AppBootstrapContext.Provider
      value={{
        isBootstrapping,
        hasBootstrapped,
        bootstrapError,
        bootstrap: runBootstrap,
      }}
    >
      {children}
    </AppBootstrapContext.Provider>
  );
}
