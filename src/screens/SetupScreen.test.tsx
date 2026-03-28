import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SetupScreen } from './SetupScreen';

const hooks = vi.hoisted(() => ({
  updateUserSettings: vi.fn(),
  markSetupComplete: vi.fn(),
  requestNotificationPermission: vi.fn(),
}));

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    isSetupComplete: false,
    updateUserSettings: hooks.updateUserSettings,
    markSetupComplete: hooks.markSetupComplete,
  }),
}));

vi.mock('../lib/utils/notifications', () => ({
  requestNotificationPermission: hooks.requestNotificationPermission,
}));

describe('SetupScreen', () => {
  beforeEach(() => {
    hooks.updateUserSettings.mockReset().mockResolvedValue(undefined);
    hooks.markSetupComplete.mockReset().mockResolvedValue(undefined);
    hooks.requestNotificationPermission.mockReset().mockResolvedValue('granted');
  });

  it('saves onboarding settings and routes to the app shell', async () => {
    render(
      <MemoryRouter initialEntries={['/setup']}>
        <Routes>
          <Route path="/setup" element={<SetupScreen />} />
          <Route path="/app/home" element={<div>Home Screen</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Allain' } });
    fireEvent.change(screen.getByLabelText(/low balance threshold/i), {
      target: { value: '2500' },
    });
    fireEvent.click(screen.getByRole('button', { name: /complete setup/i }));

    await waitFor(() => {
      expect(hooks.updateUserSettings).toHaveBeenCalledWith({
        userName: 'Allain',
        notificationsEnabled: true,
        lowBalanceThreshold: 2500,
        notificationMessage:
          'Hey {name}! Slow down on spending! You are now low on budget. You dumbass!',
      });
    });

    expect(hooks.markSetupComplete).toHaveBeenCalled();
    expect(hooks.requestNotificationPermission).toHaveBeenCalled();
    await screen.findByText('Home Screen');
  });
});
