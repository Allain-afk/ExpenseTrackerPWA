import { render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BootstrapCoordinator, NotificationCoordinator } from './AppProviders';
import {
  AppBootstrapContext,
  type AppBootstrapContextValue,
} from './AppBootstrapContext';
import { SettingsContext, type SettingsContextValue } from './SettingsContext';
import {
  TransactionsContext,
  type TransactionsContextValue,
} from './TransactionsContext';
import { WalletsContext, type WalletsContextValue } from './WalletsContext';
import { maybeShowLowBalanceNotification } from '../lib/utils/notifications';

vi.mock('../lib/utils/notifications', () => ({
  maybeShowLowBalanceNotification: vi.fn(),
}));

const mockedMaybeShowLowBalanceNotification = vi.mocked(
  maybeShowLowBalanceNotification,
);

function renderCoordinator({
  balance,
  walletBalance,
}: {
  balance: number;
  walletBalance: number;
}) {
  const settings = {
    currencySymbol: '₱',
    lowBalanceThreshold: 1_000,
    notificationMessage: 'Hi {name}, your balance is low.',
    notificationsEnabled: true,
    userName: 'Allain',
  } as SettingsContextValue;
  const transactions = {
    balance,
    getWalletBalance: vi.fn(() => walletBalance),
  } as unknown as TransactionsContextValue;
  const wallets = {
    wallets: [
      {
        id: 1,
        name: 'Daily card',
        lowBalanceThreshold: 1_000,
      },
    ],
  } as unknown as WalletsContextValue;

  function Providers({ children }: { children: ReactNode }) {
    return (
      <SettingsContext.Provider value={settings}>
        <TransactionsContext.Provider value={transactions}>
          <WalletsContext.Provider value={wallets}>
            {children}
          </WalletsContext.Provider>
        </TransactionsContext.Provider>
      </SettingsContext.Provider>
    );
  }

  render(<NotificationCoordinator />, { wrapper: Providers });
}

function renderBootstrapCoordinator(bootstrap: () => Promise<void>, isBootstrapping: boolean) {
  const value: AppBootstrapContextValue = {
    bootstrap,
    bootstrapError: null,
    hasBootstrapped: false,
    isBootstrapping,
  };

  return render(
    <AppBootstrapContext.Provider value={value}>
      <BootstrapCoordinator />
    </AppBootstrapContext.Provider>,
  );
}

describe('NotificationCoordinator', () => {
  beforeEach(() => {
    mockedMaybeShowLowBalanceNotification.mockReset();
  });

  it('checks only the overall balance when one wallet is below the threshold', async () => {
    renderCoordinator({ balance: 5_000, walletBalance: 100 });

    await waitFor(() => {
      expect(mockedMaybeShowLowBalanceNotification).toHaveBeenCalledTimes(1);
    });
    expect(mockedMaybeShowLowBalanceNotification).toHaveBeenCalledWith({
      balance: 5_000,
      currencySymbol: '₱',
      threshold: 1_000,
      notificationsEnabled: true,
      userName: 'Allain',
      message: 'Hi {name}, your balance is low.',
    });
  });

  it('checks the overall balance when it is below the threshold', async () => {
    renderCoordinator({ balance: 900, walletBalance: 5_000 });

    await waitFor(() => {
      expect(mockedMaybeShowLowBalanceNotification).toHaveBeenCalledTimes(1);
    });
    expect(mockedMaybeShowLowBalanceNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        balance: 900,
        threshold: 1_000,
      }),
    );
  });
});

describe('BootstrapCoordinator', () => {
  it('starts bootstrap once across context rerenders', async () => {
    const bootstrap = vi.fn(async () => undefined);
    const view = renderBootstrapCoordinator(bootstrap, false);

    await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(1));

    view.rerender(
      <AppBootstrapContext.Provider
        value={{
          bootstrap,
          bootstrapError: null,
          hasBootstrapped: false,
          isBootstrapping: true,
        }}
      >
        <BootstrapCoordinator />
      </AppBootstrapContext.Provider>,
    );

    expect(bootstrap).toHaveBeenCalledTimes(1);
  });
});
