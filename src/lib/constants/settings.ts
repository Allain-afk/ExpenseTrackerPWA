import type { CurrencyOption, Settings } from '../../types/models';

export const defaultSettings: Settings = {
  currency: 'PHP',
  currencySymbol: '₱',
  userName: '',
  notificationsEnabled: true,
  lowBalanceThreshold: 1000,
  notificationMessage:
    'Hey {name}! Slow down on spending! You are now low on budget. You dumbass!',
  mainWalletName: 'Total Money',
  mainWalletColor: 0xff1f2937,
};

export const availableCurrencies: CurrencyOption[] = [
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
];

export const walletColors = [
  0xff1f2937,
  0xff2563eb,
  0xff0f766e,
  0xff0284c7,
  0xff059669,
  0xffdc2626,
  0xffe11d48,
  0xffec4899,
  0xffd97706,
  0xfff97316,
  0xff7c3aed,
  0xff6366f1,
  0xffa855f7,
  0xff475569,
];

export const walletTypes = ['Bank', 'E-Wallet', 'Cash'];
