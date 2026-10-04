import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ResetPasswordScreen } from './ResetPasswordScreen';

const requestPasswordResetOtp = vi.fn(async () => undefined);
const verifyPasswordResetOtp = vi.fn(async () => undefined);
const updatePassword = vi.fn(async () => undefined);
const signOut = vi.fn(async () => undefined);
const authState = vi.hoisted(() => ({
  isConfigured: true,
  isPasswordRecoverySession: false,
  session: null as null | { user: { email: string } },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    isConfigured: authState.isConfigured,
    authError: null,
    isPasswordRecoverySession: authState.isPasswordRecoverySession,
    session: authState.session,
    requestPasswordResetOtp,
    verifyPasswordResetOtp,
    updatePassword,
    signOut,
  }),
}));

vi.mock('../lib/utils/appToast', () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

afterEach(cleanup);

beforeEach(() => {
  window.sessionStorage.clear();
  requestPasswordResetOtp.mockClear();
  verifyPasswordResetOtp.mockClear();
  updatePassword.mockClear();
  signOut.mockClear();
  authState.isConfigured = true;
  authState.isPasswordRecoverySession = false;
  authState.session = null;
});

function renderScreen(initialEntry = '/reset-password') {
  window.history.replaceState({}, '', initialEntry);
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ResetPasswordScreen />} path="/reset-password" />
        <Route element={<p>Sign-in destination</p>} path="/app/settings" />
      </Routes>
    </MemoryRouter>,
  );
}

async function reachPasswordStep() {
  const user = userEvent.setup();
  renderScreen();

  await user.type(screen.getByLabelText('Email address'), ' User@Example.com ');
  await user.click(screen.getByRole('button', { name: 'Send code' }));
  await user.type(screen.getByLabelText('Verification code'), '12a3456');
  await user.click(screen.getByRole('button', { name: 'Verify code' }));

  return user;
}

describe('ResetPasswordScreen recovery flow', () => {
  test('prefills an email from Settings without skipping the request step', () => {
    window.sessionStorage.setItem('password_recovery_email', 'saved@example.com');

    renderScreen();

    expect(screen.getByLabelText('Email address')).toHaveValue('saved@example.com');
    expect(screen.getByRole('button', { name: 'Send code' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument();
  });

  test('shows one recovery section at a time and verifies a normalized six-digit OTP', async () => {
    const user = userEvent.setup();
    renderScreen();

    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Email address'), ' User@Example.com ');
    await user.click(screen.getByRole('button', { name: 'Send code' }));

    expect(requestPasswordResetOtp).toHaveBeenCalledWith('user@example.com');
    expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Verification code')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Verification code'), '12a3456');
    expect(screen.getByLabelText('Verification code')).toHaveValue('123456');
    await user.click(screen.getByRole('button', { name: 'Verify code' }));

    expect(verifyPasswordResetOtp).toHaveBeenCalledWith('user@example.com', '123456');
    expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
  });

  test('uses the same generic verification step when the reset request returns an error', async () => {
    requestPasswordResetOtp.mockRejectedValueOnce(new Error('User not found'));
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText('Email address'), 'missing@example.com');
    await user.click(screen.getByRole('button', { name: 'Send code' }));

    expect(screen.getByLabelText('Verification code')).toBeInTheDocument();
    expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
    expect(screen.queryByText('User not found')).not.toBeInTheDocument();
  });

  test('does not trust callback parameters with an unrelated signed-in session', () => {
    authState.session = { user: { email: 'signed-in@example.com' } };

    renderScreen('/reset-password?code=invalid');

    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });

  test('requires matching passwords and provides visibility toggles', async () => {
    const user = await reachPasswordStep();
    const passwordInput = screen.getByLabelText('New password');
    const confirmationInput = screen.getByLabelText('Confirm new password');

    expect(passwordInput).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show new password' }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.type(passwordInput, 'Password123');
    await user.type(confirmationInput, 'Password321');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();

    await user.clear(confirmationInput);
    await user.type(confirmationInput, 'Password123');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(updatePassword).toHaveBeenCalledWith('Password123');
    expect(signOut).toHaveBeenCalledOnce();
    expect(await screen.findByText('Sign-in destination')).toBeInTheDocument();
    expect(window.sessionStorage.getItem('open_auth_modal')).toBe('signin');
  });
});
