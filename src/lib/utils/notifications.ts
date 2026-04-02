import { formatMoney } from './format';
import { dismissAppToast, showWarningToast } from './appToast';

// Tracks which wallet IDs (or 'global') have already fired a low-balance alert this session.
const shownAlerts = new Set<string>();

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  return 'granted';
}

export function resetLowBalanceNotificationSession(): void {
  shownAlerts.clear();
}

export interface LowBalanceNotificationInput {
  balance: number;
  currencySymbol: string;
  threshold: number;
  notificationsEnabled: boolean;
  userName: string;
  message: string;
  /** When supplied the toast is scoped to this wallet; otherwise it's the global combined check. */
  walletName?: string;
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
    walletName,
  } = input;

  const alertKey = walletName ?? 'global';
  const toastId = `low-balance-${alertKey}`;

  if (!notificationsEnabled || !userName.trim() || typeof window === 'undefined') {
    dismissAppToast(toastId);
    return;
  }

  if (balance > threshold) {
    shownAlerts.delete(alertKey);
    dismissAppToast(toastId);
    return;
  }

  if (shownAlerts.has(alertKey)) {
    return;
  }

  const personalizedMessage = message.replaceAll('{name}', userName);
  const title = walletName ? `Low balance — ${walletName}` : 'Low balance alert';

  showWarningToast(
    title,
    `${personalizedMessage} Current balance: ${formatMoney(balance, currencySymbol)}`,
    {
      duration: 5200,
      id: toastId,
    },
  );

  shownAlerts.add(alertKey);
}
