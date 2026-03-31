export type TransactionType = 'income' | 'expense';
export type ThemeId = 'blue' | 'pink' | 'mint' | 'dark';

export interface SyncMetadata {
  uuid?: string;
  userId?: string | null;
  isSynced?: boolean;
  lastModified?: Date | null;
}

export interface ExpenseTransaction extends SyncMetadata {
  id?: number;
  amount: number;
  category: string;
  description: string;
  date: Date;
  type: TransactionType;
  imagePath?: string | null;
  groupId?: number | null;
  groupUuid?: string | null;
  walletId?: number | null;
  walletUuid?: string | null;
}

export interface ExpenseGroup extends SyncMetadata {
  id?: number;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet extends SyncMetadata {
  id?: number;
  name: string;
  type: string;
  colorValue: number;
  isHidden: boolean;
  sortOrder?: number;
}

export interface Budget extends SyncMetadata {
  id?: string;
  category: string;
  limitAmount: number;
}

export interface AnalyticsCategoryTotal {
  category: string;
  amount: number;
}

export interface BudgetVsActualSummary {
  category: string;
  actual: number;
  budget: number;
  percentage: number;
}

export interface DailySpendPoint {
  date: Date;
  total: number;
}

export interface AnalyticsSummary {
  monthlyTotal: number;
  monthlyBudgetLimit: number;
  monthlyBudgetPercentage: number;
  topCategories: AnalyticsCategoryTotal[];
  topCategoryBudgetVsActual: BudgetVsActualSummary | null;
  weeklySpend: DailySpendPoint[];
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
