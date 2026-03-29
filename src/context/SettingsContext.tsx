import { createContext, useState, type ReactNode } from 'react';
import { createSettingsStorage } from '../lib/db/settingsStorage';
import { defaultSettings } from '../lib/constants/settings';
import { createTransactionsRepository } from '../lib/db/repositories/transactionsRepository';
import { databaseClient } from '../lib/db/client';
import type { Settings, ThemeId } from '../types/models';

const settingsStorage = createSettingsStorage(window.localStorage);
const transactionsRepository = createTransactionsRepository(databaseClient);

export interface SettingsContextValue {
  settings: Settings;
  currencySymbol: string;
  currency: string;
  userName: string;
  notificationsEnabled: boolean;
  lowBalanceThreshold: number;
  notificationMessage: string;
  mainWalletName: string;
  mainWalletColor: number;
  mainWalletHidden: boolean;
  themeId: ThemeId;
  isSetupComplete: boolean;
  isLoaded: boolean;
  loadSettings: () => Promise<Settings>;
  updateCurrency: (currency: string, currencySymbol: string) => Promise<void>;
  updateTheme: (themeId: ThemeId) => Promise<void>;
  resetSettings: () => Promise<void>;
  updateMainWallet: (input: {
    mainWalletName?: string;
    mainWalletColor?: number;
    mainWalletHidden?: boolean;
  }) => Promise<void>;
  updateUserSettings: (input: {
    userName: string;
    notificationsEnabled: boolean;
    lowBalanceThreshold: number;
    notificationMessage: string;
  }) => Promise<void>;
  updateNotificationSettings: (input: {
    notificationsEnabled?: boolean;
    lowBalanceThreshold?: number;
    notificationMessage?: string;
  }) => Promise<void>;
  markSetupComplete: () => Promise<void>;
  resetAllAppData: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  async function loadSettings(): Promise<Settings> {
    const loadedSettings = settingsStorage.loadSettings();
    const loadedSetup = settingsStorage.loadSetupComplete();

    setSettings(loadedSettings);
    setIsSetupComplete(loadedSetup);
    setIsLoaded(true);

    return loadedSettings;
  }

  async function persistSettings(nextSettings: Settings): Promise<void> {
    settingsStorage.saveSettings(nextSettings);
    setSettings(nextSettings);
  }

  async function updateCurrency(currency: string, currencySymbol: string): Promise<void> {
    await persistSettings({
      ...settings,
      currency,
      currencySymbol,
    });
  }

  async function resetSettings(): Promise<void> {
    settingsStorage.saveSettings(defaultSettings);
    setSettings(defaultSettings);
  }

  async function updateTheme(themeId: ThemeId): Promise<void> {
    await persistSettings({
      ...settings,
      themeId,
    });
  }

  async function updateMainWallet(input: {
    mainWalletName?: string;
    mainWalletColor?: number;
    mainWalletHidden?: boolean;
  }): Promise<void> {
    await persistSettings({
      ...settings,
      mainWalletName: input.mainWalletName ?? settings.mainWalletName,
      mainWalletColor: input.mainWalletColor ?? settings.mainWalletColor,
      mainWalletHidden: input.mainWalletHidden ?? settings.mainWalletHidden,
    });
  }

  async function updateUserSettings(input: {
    userName: string;
    notificationsEnabled: boolean;
    lowBalanceThreshold: number;
    notificationMessage: string;
  }): Promise<void> {
    await persistSettings({
      ...settings,
      userName: input.userName,
      notificationsEnabled: input.notificationsEnabled,
      lowBalanceThreshold: input.lowBalanceThreshold,
      notificationMessage: input.notificationMessage,
    });
  }

  async function updateNotificationSettings(input: {
    notificationsEnabled?: boolean;
    lowBalanceThreshold?: number;
    notificationMessage?: string;
  }): Promise<void> {
    await persistSettings({
      ...settings,
      notificationsEnabled: input.notificationsEnabled ?? settings.notificationsEnabled,
      lowBalanceThreshold: input.lowBalanceThreshold ?? settings.lowBalanceThreshold,
      notificationMessage: input.notificationMessage ?? settings.notificationMessage,
    });
  }

  async function markSetupComplete(): Promise<void> {
    settingsStorage.saveSetupComplete(true);
    setIsSetupComplete(true);
  }

  async function resetAllAppData(): Promise<void> {
    settingsStorage.clearAll();
    await transactionsRepository.clearTransactions();
    setSettings(defaultSettings);
    setIsSetupComplete(false);
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        currencySymbol: settings.currencySymbol,
        currency: settings.currency,
        userName: settings.userName,
        notificationsEnabled: settings.notificationsEnabled,
        lowBalanceThreshold: settings.lowBalanceThreshold,
        notificationMessage: settings.notificationMessage,
        mainWalletName: settings.mainWalletName,
        mainWalletColor: settings.mainWalletColor,
        mainWalletHidden: settings.mainWalletHidden,
        themeId: settings.themeId,
        isSetupComplete,
        isLoaded,
        loadSettings,
        updateCurrency,
        updateTheme,
        resetSettings,
        updateMainWallet,
        updateUserSettings,
        updateNotificationSettings,
        markSetupComplete,
        resetAllAppData,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
