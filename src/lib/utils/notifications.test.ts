import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  maybeShowLowBalanceNotification,
  resetLowBalanceNotificationSession,
} from './notifications';

const notifications: Array<{ title: string; options: NotificationOptions }> = [];

class MockNotification {
  static permission: NotificationPermission = 'granted';

  constructor(title: string, options: NotificationOptions) {
    notifications.push({ title, options });
  }
}

describe('notification helpers', () => {
  beforeEach(() => {
    notifications.length = 0;
    resetLowBalanceNotificationSession();
    vi.stubGlobal('Notification', MockNotification);
  });

  it('shows a low-balance alert once until the balance rises above the threshold again', async () => {
    await maybeShowLowBalanceNotification({
      balance: 500,
      currencySymbol: '₱',
      threshold: 1000,
      notificationsEnabled: true,
      userName: 'Allain',
      message: 'Hey {name}!',
    });
    await maybeShowLowBalanceNotification({
      balance: 500,
      currencySymbol: '₱',
      threshold: 1000,
      notificationsEnabled: true,
      userName: 'Allain',
      message: 'Hey {name}!',
    });
    await maybeShowLowBalanceNotification({
      balance: 1500,
      currencySymbol: '₱',
      threshold: 1000,
      notificationsEnabled: true,
      userName: 'Allain',
      message: 'Hey {name}!',
    });
    await maybeShowLowBalanceNotification({
      balance: 400,
      currencySymbol: '₱',
      threshold: 1000,
      notificationsEnabled: true,
      userName: 'Allain',
      message: 'Hey {name}!',
    });

    expect(notifications).toHaveLength(2);
    expect(notifications[0].title).toBe('Low Balance Alert!');
    expect(notifications[0].options.body).toContain('Hey Allain!');
  });
});
