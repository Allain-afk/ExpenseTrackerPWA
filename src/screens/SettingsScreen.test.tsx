import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsScreen } from './SettingsScreen';

const hooks = vi.hoisted(() => ({
  updateTheme: vi.fn(),
  loadTransactions: vi.fn(),
  resetAllAppData: vi.fn(),
}));

let currentThemeId: 'blue' | 'pink' | 'mint' = 'blue';

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    currency: 'PHP',
    currencySymbol: '₱',
    lowBalanceThreshold: 1000,
    notificationMessage: 'Stay on budget',
    notificationsEnabled: false,
    themeId: currentThemeId,
    updateTheme: hooks.updateTheme,
    updateCurrency: vi.fn(),
    updateNotificationSettings: vi.fn(),
    resetAllAppData: hooks.resetAllAppData,
  }),
}));

vi.mock('../hooks/useTransactions', () => ({
  useTransactions: () => ({
    loadTransactions: hooks.loadTransactions,
  }),
}));

vi.mock('../lib/utils/appToast', () => ({
  showErrorToast: vi.fn(),
  showInfoToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

describe('SettingsScreen', () => {
  beforeEach(() => {
    currentThemeId = 'blue';
    hooks.updateTheme.mockReset().mockImplementation(async (themeId: 'blue' | 'pink' | 'mint') => {
      currentThemeId = themeId;
    });
    hooks.loadTransactions.mockReset();
    hooks.resetAllAppData.mockReset();
  });

  it('selects a new theme from the theme picker', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <SettingsScreen />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /themes/i }));
    fireEvent.click(screen.getByRole('button', { name: /blush pink/i }));

    await waitFor(() => {
      expect(hooks.updateTheme).toHaveBeenCalledWith('pink');
    });

    rerender(
      <MemoryRouter>
        <SettingsScreen />
      </MemoryRouter>,
    );

    expect(screen.getByText('Blush Pink')).toBeInTheDocument();
  });
});
