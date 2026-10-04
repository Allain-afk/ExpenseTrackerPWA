import { useContext, useEffect, useRef, type ReactNode } from 'react';
import { SettingsProvider, SettingsContext } from './SettingsContext';
import { TransactionsProvider, TransactionsContext } from './TransactionsContext';
import { WalletsProvider } from './WalletsContext';
import { ExpenseGroupsProvider } from './ExpenseGroupsContext';
import { BudgetsProvider } from './BudgetsContext';
import { BudgetingProvider } from './BudgetingContext';
import { AppBootstrapProvider } from './AppBootstrapContext';
import { AuthProvider } from './AuthContext';
import { SyncProvider } from './SyncContext';
import { maybeShowLowBalanceNotification } from '../lib/utils/notifications';
import { defaultThemeId } from '../lib/constants/themes';
import { applyThemeToDocument } from '../lib/utils/theme';
import { useAppBootstrap } from '../hooks/useAppBootstrap';

export function BootstrapCoordinator() {
  const { bootstrap } = useAppBootstrap();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    void bootstrap().catch(() => undefined);
  }, [bootstrap]);

  return null;
}

export function NotificationCoordinator() {
  const settingsContext = useContext(SettingsContext);
  const transactionsContext = useContext(TransactionsContext);
  const currencySymbol = settingsContext?.currencySymbol;
  const lowBalanceThreshold = settingsContext?.lowBalanceThreshold;
  const notificationMessage = settingsContext?.notificationMessage;
  const notificationsEnabled = settingsContext?.notificationsEnabled;
  const userName = settingsContext?.userName;
  const balance = transactionsContext?.balance;

  useEffect(() => {
    if (
      !currencySymbol ||
      typeof lowBalanceThreshold !== 'number' ||
      typeof balance !== 'number' ||
      !notificationsEnabled
    ) {
      return;
    }

    const sharedArgs = {
      currencySymbol,
      notificationsEnabled,
      userName: userName ?? '',
      message: notificationMessage ?? '',
    };

    // Low-balance alerts are based only on the combined balance.
    void maybeShowLowBalanceNotification({
      ...sharedArgs,
      balance,
      threshold: lowBalanceThreshold,
    });
  }, [
    balance,
    currencySymbol,
    lowBalanceThreshold,
    notificationMessage,
    notificationsEnabled,
    userName,
  ]);

  return null;
}

function ThemeCoordinator() {
  const settingsContext = useContext(SettingsContext);
  const themeId = settingsContext?.themeId ?? defaultThemeId;

  useEffect(() => {
    applyThemeToDocument(themeId);
  }, [themeId]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ThemeCoordinator />
        <TransactionsProvider>
          <WalletsProvider>
            <ExpenseGroupsProvider>
              <BudgetsProvider>
                <BudgetingProvider>
                  <AppBootstrapProvider>
                    <BootstrapCoordinator />
                    <SyncProvider>
                      <NotificationCoordinator />
                      {children}
                    </SyncProvider>
                  </AppBootstrapProvider>
                </BudgetingProvider>
              </BudgetsProvider>
            </ExpenseGroupsProvider>
          </WalletsProvider>
        </TransactionsProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
