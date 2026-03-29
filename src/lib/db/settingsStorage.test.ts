import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../constants/settings';
import { createSettingsStorage, settingsStorageKeys } from './settingsStorage';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('settings storage', () => {
  it('returns the normalized default settings when storage is empty', () => {
    const storage = createSettingsStorage(new MemoryStorage());
    expect(storage.loadSettings()).toEqual(defaultSettings);
    expect(storage.loadSetupComplete()).toBe(false);
  });

  it('persists settings and setup completion values', () => {
    const backingStore = new MemoryStorage();
    const storage = createSettingsStorage(backingStore);

    storage.saveSettings({ ...defaultSettings, currency: 'USD', currencySymbol: '$' });
    storage.saveSetupComplete(true);

    expect(storage.loadSettings().currency).toBe('USD');
    expect(storage.loadSettings().currencySymbol).toBe('$');
    expect(storage.loadSetupComplete()).toBe(true);
  });

  it('fills in new settings fields when loading older saved settings', () => {
    const backingStore = new MemoryStorage();
    backingStore.setItem(
      settingsStorageKeys.settings,
      JSON.stringify({
        currency: 'USD',
        currencySymbol: '$',
        mainWalletName: 'Pocket Money',
      }),
    );

    const storage = createSettingsStorage(backingStore);
    expect(storage.loadSettings()).toMatchObject({
      currency: 'USD',
      currencySymbol: '$',
      mainWalletName: 'Pocket Money',
      mainWalletHidden: false,
      themeId: defaultSettings.themeId,
    });
  });
});
