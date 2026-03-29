import { formatMoney } from './format';
import { dismissAppToast, showWarningToast } from './appToast';

let hasShownLowBalanceNotification = false;
const LOW_BALANCE_TOAST_ID = 'low-balance-alert';

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  return 'granted';
}

export function resetLowBalanceNotificationSession(): void {
  hasShownLowBalanceNotification = false;
  dismissAppToast(LOW_BALANCE_TOAST_ID);
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
    dismissAppToast(LOW_BALANCE_TOAST_ID);
    return;
  }

  if (balance > threshold) {
    hasShownLowBalanceNotification = false;
    dismissAppToast(LOW_BALANCE_TOAST_ID);
    return;
  }

  if (hasShownLowBalanceNotification) {
    return;
  }

  const personalizedMessage = message.replaceAll('{name}', userName);

  showWarningToast('Low balance alert', `${personalizedMessage} Current balance: ${formatMoney(balance, currencySymbol)}`, {
    duration: 5200,
    id: LOW_BALANCE_TOAST_ID,
  });

  hasShownLowBalanceNotification = true;
}
