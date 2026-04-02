import { useContext, useEffect, type ReactNode } from 'react';
import { SettingsProvider, SettingsContext } from './SettingsContext';
import { TransactionsProvider, TransactionsContext } from './TransactionsContext';
import { WalletsProvider, WalletsContext } from './WalletsContext';
import { ExpenseGroupsProvider } from './ExpenseGroupsContext';
import { BudgetsProvider } from './BudgetsContext';
import { AppBootstrapProvider } from './AppBootstrapContext';
import { AuthProvider } from './AuthContext';
import { SyncProvider } from './SyncContext';
import { maybeShowLowBalanceNotification } from '../lib/utils/notifications';
import { defaultThemeId } from '../lib/constants/themes';
import { applyThemeToDocument } from '../lib/utils/theme';

function NotificationCoordinator() {
  const settingsContext = useContext(SettingsContext);
  const transactionsContext = useContext(TransactionsContext);
  const walletsContext = useContext(WalletsContext);
  const currencySymbol = settingsContext?.currencySymbol;
  const lowBalanceThreshold = settingsContext?.lowBalanceThreshold;
  const notificationMessage = settingsContext?.notificationMessage;
  const notificationsEnabled = settingsContext?.notificationsEnabled;
  const userName = settingsContext?.userName;
  const balance = transactionsContext?.balance;
  const wallets = walletsContext?.wallets;
  const getWalletBalance = transactionsContext?.getWalletBalance;

  // Stable primitive for the dependency array — serialise wallet thresholds so React
  // can compare them without a new array reference on every render.
  const walletThresholdKey = wallets
    ?.map((w) => `${w.id}:${w.lowBalanceThreshold ?? ''}`)
    .join(',') ?? '';

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

    // 1. Global check — combined balance vs. the global threshold.
    void maybeShowLowBalanceNotification({
      ...sharedArgs,
      balance,
      threshold: lowBalanceThreshold,
    });

    // 2. Per-wallet check — each wallet uses its own threshold (or global as fallback).
    if (wallets && getWalletBalance) {
      for (const wallet of wallets) {
        const effectiveThreshold = wallet.lowBalanceThreshold ?? lowBalanceThreshold;
        const walletBalance = getWalletBalance(wallet.id!);
        void maybeShowLowBalanceNotification({
          ...sharedArgs,
          balance: walletBalance,
          threshold: effectiveThreshold,
          walletName: wallet.name,
        });
      }
    }
  }, [
    balance,
    currencySymbol,
    lowBalanceThreshold,
    notificationMessage,
    notificationsEnabled,
    userName,
    wallets,
    walletThresholdKey,
    getWalletBalance,
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
                <AppBootstrapProvider>
                  <SyncProvider>
                    <NotificationCoordinator />
                    {children}
                  </SyncProvider>
                </AppBootstrapProvider>
              </BudgetsProvider>
            </ExpenseGroupsProvider>
          </WalletsProvider>
        </TransactionsProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
