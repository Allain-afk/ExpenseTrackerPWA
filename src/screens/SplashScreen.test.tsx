import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SplashScreen } from './SplashScreen';

const bootstrap = vi.fn();
let isSetupComplete = false;

vi.mock('../hooks/useAppBootstrap', () => ({
  useAppBootstrap: () => ({
    bootstrap,
    bootstrapError: null,
    hasBootstrapped: true,
    isBootstrapping: false,
  }),
}));

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    isSetupComplete,
  }),
}));

describe('SplashScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    bootstrap.mockReset();
    isSetupComplete = false;
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('routes to setup after the splash delay when onboarding is incomplete', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/setup" element={<div>Setup Route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(screen.getByText('Setup Route')).toBeInTheDocument();
  });

  it('routes to the home tab after the splash delay when onboarding is complete', async () => {
    isSetupComplete = true;

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/app/home" element={<div>Home Route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(screen.getByText('Home Route')).toBeInTheDocument();
  });
});
