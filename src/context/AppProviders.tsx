import { useContext, useEffect, type ReactNode } from 'react';
import { SettingsProvider, SettingsContext } from './SettingsContext';
import { TransactionsProvider, TransactionsContext } from './TransactionsContext';
import { WalletsProvider } from './WalletsContext';
import { ExpenseGroupsProvider } from './ExpenseGroupsContext';
import { AppBootstrapProvider } from './AppBootstrapContext';
import { maybeShowLowBalanceNotification } from '../lib/utils/notifications';
import { defaultThemeId } from '../lib/constants/themes';
import { applyThemeToDocument } from '../lib/utils/theme';

function NotificationCoordinator() {
  const settingsContext = useContext(SettingsContext);
  const transactionsContext = useContext(TransactionsContext);
  const currencySymbol = settingsContext?.currencySymbol;
  const lowBalanceThreshold = settingsContext?.lowBalanceThreshold;
  const notificationMessage = settingsContext?.notificationMessage;
  const notificationsEnabled = settingsContext?.notificationsEnabled;
  const userName = settingsContext?.userName;
  const balance = transactionsContext?.balance;

  useEffect(() => {
    if (!currencySymbol || typeof lowBalanceThreshold !== 'number' || typeof balance !== 'number') {
      return;
    }

    void maybeShowLowBalanceNotification({
      balance,
      currencySymbol,
      threshold: lowBalanceThreshold,
      notificationsEnabled: notificationsEnabled ?? false,
      userName: userName ?? '',
      message: notificationMessage ?? '',
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
    <SettingsProvider>
      <ThemeCoordinator />
      <TransactionsProvider>
        <WalletsProvider>
          <ExpenseGroupsProvider>
            <AppBootstrapProvider>
              <NotificationCoordinator />
              {children}
            </AppBootstrapProvider>
          </ExpenseGroupsProvider>
        </WalletsProvider>
      </TransactionsProvider>
    </SettingsProvider>
  );
}
