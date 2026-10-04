import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { SettingsScreen } from './SettingsScreen';
import { showSuccessToast } from '../lib/utils/appToast';

const bootstrap = vi.fn<(force?: boolean) => Promise<void>>(async () => undefined);
const signInWithPassword = vi.fn(async (email: string) => {
  authState.user = {
    email,
    id: 'user-1',
    user_metadata: {},
  };
});
const signOut = vi.fn(async () => {
  authState.user = null;
});
const deleteCloudDataForCurrentUser = vi.fn(async () => undefined);

const authState = vi.hoisted(() => ({
  user: null as null | {
    email: string;
    id: string;
    user_metadata: Record<string, unknown>;
  },
}));

vi.mock('../hooks/useAppBootstrap', () => ({
  useAppBootstrap: () => ({
    bootstrap,
    bootstrapError: null,
    hasBootstrapped: true,
    isBootstrapping: false,
  }),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    authError: null,
    clearAuthError: vi.fn(),
    isConfigured: true,
    isLoading: false,
    isPasswordRecoverySession: false,
    requestPasswordResetOtp: vi.fn(),
    session: null,
    signInWithPassword,
    signOut,
    signUpWithPassword: vi.fn(),
    syncDisplayName: vi.fn(async () => undefined),
    updatePassword: vi.fn(),
    user: authState.user,
    verifyPasswordResetOtp: vi.fn(),
  }),
}));

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    currency: 'PHP',
    currencySymbol: '₱',
    isLoaded: true,
    isSetupComplete: true,
    lowBalanceThreshold: 1_000,
    mainWalletColor: 0,
    mainWalletHidden: false,
    mainWalletName: 'Total Money',
    notificationMessage: 'Hi {name}',
    notificationsEnabled: true,
    resetAllAppData: vi.fn(async () => undefined),
    themeId: 'blue',
    updateCurrency: vi.fn(async () => undefined),
    updateHiddenBalanceKeys: vi.fn(async () => undefined),
    updateMainWallet: vi.fn(async () => undefined),
    updateNotificationSettings: vi.fn(async () => undefined),
    updateTheme: vi.fn(async () => undefined),
    updateUserSettings: vi.fn(async () => undefined),
    userName: '',
  }),
}));

vi.mock('../hooks/useTransactions', () => ({
  useTransactions: () => ({
    balance: 0,
    loadTransactions: vi.fn(async () => []),
  }),
}));

vi.mock('../hooks/useSync', () => ({
  useSync: () => ({
    adoptAnonymousRowsForUser: vi.fn(async () => undefined),
    deleteCloudDataForCurrentUser,
    getAnonymousLocalRowsCount: vi.fn(async () => 0),
    isOnline: true,
    status: 'idle',
    syncNow: vi.fn(async () => undefined),
  }),
}));

vi.mock('../lib/utils/appToast', () => ({
  showErrorToast: vi.fn(),
  showInfoToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsScreen />
    </MemoryRouter>,
  );
}

describe('Settings authentication transitions', () => {
  beforeEach(() => {
    authState.user = null;
    bootstrap.mockClear();
    signInWithPassword.mockClear();
    signOut.mockClear();
    deleteCloudDataForCurrentUser.mockReset();
    deleteCloudDataForCurrentUser.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  test('signs in without restarting the application', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('button', { name: /sign in for cloud backup/i }));
    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'Password123');
    const originalSetTimeout = window.setTimeout.bind(window);
    const timeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation((handler, timeout, ...args) => {
      if (timeout === 120) {
        return 1;
      }
      return originalSetTimeout(handler, timeout, ...args);
    });
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(signInWithPassword).toHaveBeenCalledWith('user@example.com', 'Password123');
    expect(showSuccessToast).toHaveBeenCalledWith('Signed in', 'Cloud backup is now available.');
    expect(screen.getByText('Connected as user@example.com')).toBeInTheDocument();

    timeoutSpy.mockRestore();
  });

  test('signs out to local mode without invoking bootstrap', async () => {
    authState.user = {
      email: 'user@example.com',
      id: 'user-1',
      user_metadata: {},
    };
    const user = userEvent.setup();
    const view = renderSettings();

    await user.click(screen.getByRole('button', { name: /sign out cloud account/i }));
    view.rerender(
      <MemoryRouter>
        <SettingsScreen />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Sign in for cloud backup')).toBeInTheDocument());
    expect(signOut).toHaveBeenCalledOnce();
    expect(bootstrap).not.toHaveBeenCalled();
    expect(screen.queryByText('Loading your offline data...')).not.toBeInTheDocument();
  });

  test('refreshes local contexts after cloud deletion without reloading', async () => {
    authState.user = {
      email: 'user@example.com',
      id: 'user-1',
      user_metadata: {},
    };
    const order: string[] = [];
    deleteCloudDataForCurrentUser.mockImplementation(async () => {
      order.push('delete');
    });
    bootstrap.mockImplementation(async (force) => {
      order.push(`bootstrap:${String(force)}`);
    });
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Delete Cloud Data' }));
    await user.type(screen.getByLabelText(/type delete cloud data/i), 'DELETE CLOUD DATA');
    const originalSetTimeout = window.setTimeout.bind(window);
    const timeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation((handler, timeout, ...args) => {
      if (timeout === 120) {
        return 1;
      }
      return originalSetTimeout(handler, timeout, ...args);
    });
    await user.click(screen.getByRole('button', { name: /permanently delete cloud data/i }));

    await waitFor(() => expect(order).toEqual(['delete', 'bootstrap:true']));
    timeoutSpy.mockRestore();
  });

  test('presents version 1.3.9 as the single latest release', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('button', { name: /^version/i }));

    const dialog = screen.getByRole('dialog', { name: 'Version History' });
    expect(within(dialog).getByText('v1.3.9')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Latest')).toHaveLength(1);
  });
});
