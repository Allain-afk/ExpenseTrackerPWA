import { formatMoney } from './format';

let hasShownLowBalanceNotification = false;

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  return Notification.requestPermission();
}

export function resetLowBalanceNotificationSession(): void {
  hasShownLowBalanceNotification = false;
}

interface LowBalanceNotificationInput {
  balance: number;
  currencySymbol: string;
  threshold: number;
  notificationsEnabled: boolean;
  userName: string;
  message: string;
}

export async function maybeShowLowBalanceNotification(
  input: LowBalanceNotificationInput,
): Promise<void> {
  const {
    balance,
    currencySymbol,
    threshold,
    notificationsEnabled,
    userName,
    message,
  } = input;

  if (!notificationsEnabled || !userName.trim() || typeof window === 'undefined') {
    return;
  }

  if (!('Notification' in window)) {
    return;
  }

  if (balance > threshold) {
    hasShownLowBalanceNotification = false;
    return;
  }

  if (hasShownLowBalanceNotification || Notification.permission !== 'granted') {
    return;
  }

  const personalizedMessage = message.replaceAll('{name}', userName);

  new Notification('Low Balance Alert!', {
    body: `${personalizedMessage}\nCurrent balance: ${formatMoney(balance, currencySymbol)}`,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
  });

  hasShownLowBalanceNotification = true;
}
