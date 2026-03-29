import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastHooks = vi.hoisted(() => ({
  dismissAppToast: vi.fn(),
  showWarningToast: vi.fn(),
}));

vi.mock('./appToast', () => ({
  dismissAppToast: toastHooks.dismissAppToast,
  showWarningToast: toastHooks.showWarningToast,
}));

import {
  maybeShowLowBalanceNotification,
  resetLowBalanceNotificationSession,
} from './notifications';

describe('notification helpers', () => {
  beforeEach(() => {
    resetLowBalanceNotificationSession();
    toastHooks.dismissAppToast.mockClear();
    toastHooks.showWarningToast.mockClear();
  });

  it('shows a low-balance toast once until the balance rises above the threshold again', async () => {
    await maybeShowLowBalanceNotification({
      balance: 500,
      currencySymbol: 'PHP',
      threshold: 1000,
      notificationsEnabled: true,
      userName: 'Allain',
      message: 'Hey {name}!',
    });
    await maybeShowLowBalanceNotification({
      balance: 500,
      currencySymbol: 'PHP',
      threshold: 1000,
      notificationsEnabled: true,
      userName: 'Allain',
      message: 'Hey {name}!',
    });
    await maybeShowLowBalanceNotification({
      balance: 1500,
      currencySymbol: 'PHP',
      threshold: 1000,
      notificationsEnabled: true,
      userName: 'Allain',
      message: 'Hey {name}!',
    });
    await maybeShowLowBalanceNotification({
      balance: 400,
      currencySymbol: 'PHP',
      threshold: 1000,
      notificationsEnabled: true,
      userName: 'Allain',
      message: 'Hey {name}!',
    });

    expect(toastHooks.showWarningToast).toHaveBeenCalledTimes(2);
    expect(toastHooks.showWarningToast).toHaveBeenNthCalledWith(
      1,
      'Low balance alert',
      expect.stringContaining('Hey Allain!'),
      {
        duration: 5200,
        id: 'low-balance-alert',
      },
    );
  });
});
