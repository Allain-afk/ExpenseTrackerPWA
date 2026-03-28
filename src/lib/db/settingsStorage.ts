import { defaultSettings } from '../constants/settings';
import type { Settings } from '../../types/models';

export const settingsStorageKeys = {
  settings: 'settings',
  setupComplete: 'setup_complete',
} as const;

export function createSettingsStorage(storage: Storage) {
  return {
    loadSettings(): Settings {
      const rawValue = storage.getItem(settingsStorageKeys.settings);
      if (!rawValue) {
        return defaultSettings;
      }

      try {
        const parsed = JSON.parse(rawValue) as Partial<Settings>;
        return {
          ...defaultSettings,
          ...parsed,
        };
      } catch {
        return defaultSettings;
      }
    },

    saveSettings(settings: Settings): void {
      storage.setItem(settingsStorageKeys.settings, JSON.stringify(settings));
    },

    loadSetupComplete(): boolean {
      return storage.getItem(settingsStorageKeys.setupComplete) === 'true';
    },

    saveSetupComplete(value: boolean): void {
      storage.setItem(settingsStorageKeys.setupComplete, String(value));
    },

    clearAll(): void {
      storage.clear();
    },
  };
}
