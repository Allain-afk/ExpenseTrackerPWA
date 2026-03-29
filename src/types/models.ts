export type TransactionType = 'income' | 'expense';
export type ThemeId = 'blue' | 'pink' | 'mint' | 'dark';

export interface ExpenseTransaction {
  id?: number;
  amount: number;
  category: string;
  description: string;
  date: Date;
  type: TransactionType;
  imagePath?: string | null;
  groupId?: number | null;
  walletId?: number | null;
}

export interface ExpenseGroup {
  id?: number;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet {
  id?: number;
  name: string;
  type: string;
  colorValue: number;
  isHidden: boolean;
  sortOrder?: number;
}

export interface Settings {
  currency: string;
  currencySymbol: string;
  userName: string;
  notificationsEnabled: boolean;
  lowBalanceThreshold: number;
  notificationMessage: string;
  mainWalletName: string;
  mainWalletColor: number;
  mainWalletHidden: boolean;
  themeId: ThemeId;
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

export type AppTab = 'home' | 'transactions' | 'groups' | 'settings';
