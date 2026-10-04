import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdCheckCircle,
  MdEmail,
  MdLockReset,
  MdPassword,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';
import { PageHeader } from '../components/common/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { useAppBootstrap } from '../hooks/useAppBootstrap';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';
import styles from './ResetPasswordScreen.module.css';

type RecoveryStep = 'request' | 'verify' | 'reset';

const RECOVERY_EMAIL_KEY = 'password_recovery_email';
const RECOVERY_SENT_KEY = 'password_recovery_code_sent';
const RECOVERY_VERIFIED_KEY = 'password_recovery_verified';
const RESEND_AVAILABLE_AT_KEY = 'password_recovery_resend_at';
const RESEND_COOLDOWN_SECONDS = 60;

function getStoredEmail(): string {
  return typeof window === 'undefined'
    ? ''
    : window.sessionStorage.getItem(RECOVERY_EMAIL_KEY) ?? '';
}

function hasRequestedCode(): boolean {
  return typeof window !== 'undefined'
    && window.sessionStorage.getItem(RECOVERY_SENT_KEY) === 'true';
}

function getCooldownSeconds(): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  const availableAt = Number(window.sessionStorage.getItem(RESEND_AVAILABLE_AT_KEY));
  return Number.isFinite(availableAt)
    ? Math.max(0, Math.ceil((availableAt - Date.now()) / 1000))
    : 0;
}

export function ResetPasswordScreen() {
  const [{ storedEmail, requestedCode, verifiedRecovery, initialCooldown }] = useState(() => ({
    storedEmail: getStoredEmail(),
    requestedCode: hasRequestedCode(),
    verifiedRecovery: window.sessionStorage.getItem(RECOVERY_VERIFIED_KEY) === 'true',
    initialCooldown: getCooldownSeconds(),
  }));
  const [step, setStep] = useState<RecoveryStep>(storedEmail && requestedCode ? 'verify' : 'request');
  const [email, setEmail] = useState(storedEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const navigate = useNavigate();
  const auth = useAuth();
  const { bootstrap } = useAppBootstrap();

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function requestCode(targetEmail: string): Promise<boolean> {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setFormError('Enter your email address.');
      return false;
    }
    if (auth.isConfigured === false) {
      setFormError('Cloud password recovery is unavailable on this installation.');
      return false;
    }

    const remainingCooldown = getCooldownSeconds();
    const storedRecoveryEmail = getStoredEmail().trim().toLowerCase();
    if (storedRecoveryEmail === normalizedEmail && remainingCooldown > 0) {
      setEmail(normalizedEmail);
      setCooldown(remainingCooldown);
      setFormError(null);
      return true;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await auth.requestPasswordResetOtp(normalizedEmail);
    } catch {
      // Recovery requests intentionally return the same UI result so registered
      // addresses cannot be discovered through provider or rate-limit errors.
    } finally {
      setEmail(normalizedEmail);
      window.sessionStorage.setItem(RECOVERY_EMAIL_KEY, normalizedEmail);
      window.sessionStorage.setItem(RECOVERY_SENT_KEY, 'true');
      window.sessionStorage.removeItem(RECOVERY_VERIFIED_KEY);
      window.sessionStorage.setItem(
        RESEND_AVAILABLE_AT_KEY,
        String(Date.now() + RESEND_COOLDOWN_SECONDS * 1000),
      );
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setIsSubmitting(false);
    }
    return true;
  }

  async function handleRequest(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (await requestCode(email)) {
      setStep('verify');
    }
  }

  async function handleVerify(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (otp.length !== 6) {
      setFormError('Enter the complete six-digit code.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await auth.verifyPasswordResetOtp(email, otp);
      window.sessionStorage.setItem(RECOVERY_VERIFIED_KEY, 'true');
      setOtp('');
      setStep('reset');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'That code is invalid or expired.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReset(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (newPassword.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await auth.updatePassword(newPassword);
      await auth.signOut();
      await bootstrap();
      window.sessionStorage.removeItem(RECOVERY_EMAIL_KEY);
      window.sessionStorage.removeItem(RECOVERY_SENT_KEY);
      window.sessionStorage.removeItem(RECOVERY_VERIFIED_KEY);
      window.sessionStorage.removeItem(RESEND_AVAILABLE_AT_KEY);
      window.sessionStorage.setItem('bypass_setup_once', 'true');
      window.sessionStorage.setItem('open_auth_modal', 'signin');
      showSuccessToast('Password reset', 'Sign in again using your new password.');
      navigate('/app/settings?auth=signin', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not reset your password.';
      setFormError(message);
      showErrorToast('Reset failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeEmail(): void {
    window.sessionStorage.removeItem(RECOVERY_SENT_KEY);
    window.sessionStorage.removeItem(RECOVERY_VERIFIED_KEY);
    setOtp('');
    setFormError(null);
    setStep('request');
  }

  const sessionEmail = auth.session?.user.email?.trim().toLowerCase();
  const canResumeVerifiedRecovery = verifiedRecovery
    && Boolean(email)
    && sessionEmail === email.trim().toLowerCase();
  const activeStep: RecoveryStep = step === 'reset' || canResumeVerifiedRecovery ? 'reset' : step;
  const content = {
    request: {
      title: 'Forgot your password?',
      subtitle: 'Enter the email connected to your account and we will send a six-digit code.',
      icon: <MdEmail size={22} />,
    },
    verify: {
      title: 'Check your email',
      subtitle: `Enter the six-digit code sent to ${email}.`,
      icon: <MdPassword size={22} />,
    },
    reset: {
      title: 'Create a new password',
      subtitle: 'Choose a strong password you have not used for this account before.',
      icon: <MdLockReset size={22} />,
    },
  }[activeStep];

  const stepNumber = activeStep === 'request' ? 1 : activeStep === 'verify' ? 2 : 3;

  return (
    <main className={styles.screen}>
      <div className={styles.panel}>
        <PageHeader backTo="/" title="Reset Password" />

        <section className={`app-card ${styles.hero}`}>
          <div className={styles.heroRow}>
            <span className={`icon-chip ${styles.heroIcon}`}>{content.icon}</span>
            <div>
              <p className="eyebrow">Security</p>
              <h2 className={styles.heroTitle}>{content.title}</h2>
            </div>
          </div>
          <p className={styles.heroSubtitle}>{content.subtitle}</p>
          <div className={styles.progress} aria-label={`Step ${stepNumber} of 3`}>
            {(['request', 'verify', 'reset'] as RecoveryStep[]).map((item) => (
              <span className={item === activeStep ? styles.progressActive : styles.progressItem} key={item} />
            ))}
          </div>
        </section>

        {activeStep === 'request' ? (
          <form className={`app-card ${styles.formCard}`} onSubmit={handleRequest}>
            <div className="form-field">
              <label className="field-label" htmlFor="recovery-email">Email address</label>
              <input
                autoComplete="email"
                autoFocus
                className="text-input"
                id="recovery-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
            </div>
            {formError ? <p className="error-text" role="alert">{formError}</p> : null}
            <button className={`primary-button ${styles.fullWidthButton}`} disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Sending...' : 'Send code'}
            </button>
          </form>
        ) : null}

        {activeStep === 'verify' ? (
          <form className={`app-card ${styles.formCard}`} onSubmit={handleVerify}>
            <p className={styles.notice}>
              If an account exists for this email, we sent a six-digit code.
            </p>
            <div className="form-field">
              <label className="field-label" htmlFor="recovery-code">Verification code</label>
              <input
                autoComplete="one-time-code"
                autoFocus
                className={`text-input ${styles.otpInput}`}
                id="recovery-code"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                value={otp}
              />
            </div>
            {formError ? <p className="error-text" role="alert">{formError}</p> : null}
            <button className={`primary-button ${styles.fullWidthButton}`} disabled={isSubmitting || otp.length !== 6} type="submit">
              {isSubmitting ? 'Verifying...' : 'Verify code'}
            </button>
            <div className={styles.secondaryActions}>
              <button className="text-button" disabled={isSubmitting || cooldown > 0} onClick={() => void requestCode(email)} type="button">
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
              <button className="text-button" disabled={isSubmitting} onClick={changeEmail} type="button">
                Change email
              </button>
            </div>
          </form>
        ) : null}

        {activeStep === 'reset' ? (
          <form className={`app-card ${styles.formCard}`} onSubmit={handleReset}>
            <div className="form-field">
              <label className="field-label" htmlFor="new-password">New password</label>
              <div className={styles.passwordRow}>
                <input
                  autoComplete="new-password"
                  autoFocus
                  className="text-input"
                  id="new-password"
                  onChange={(event) => setNewPassword(event.target.value)}
                  type={isNewPasswordVisible ? 'text' : 'password'}
                  value={newPassword}
                />
                <button
                  aria-label={isNewPasswordVisible ? 'Hide new password' : 'Show new password'}
                  aria-pressed={isNewPasswordVisible}
                  className={styles.toggleButton}
                  onClick={() => setIsNewPasswordVisible((visible) => !visible)}
                  type="button"
                >
                  {isNewPasswordVisible ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>
            </div>
            <div className="form-field">
              <label className="field-label" htmlFor="confirm-password">Confirm new password</label>
              <div className={styles.passwordRow}>
                <input
                  autoComplete="new-password"
                  className="text-input"
                  id="confirm-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type={isConfirmPasswordVisible ? 'text' : 'password'}
                  value={confirmPassword}
                />
                <button
                  aria-label={isConfirmPasswordVisible ? 'Hide confirmed password' : 'Show confirmed password'}
                  aria-pressed={isConfirmPasswordVisible}
                  className={styles.toggleButton}
                  onClick={() => setIsConfirmPasswordVisible((visible) => !visible)}
                  type="button"
                >
                  {isConfirmPasswordVisible ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>
            </div>
            <ul className={styles.helperList}>
              <li className={styles.helperItem}><MdCheckCircle size={16} />At least 8 characters</li>
              <li className={styles.helperItem}><MdCheckCircle size={16} />Use a mix of letters and numbers</li>
            </ul>
            {formError ? <p className="error-text" role="alert">{formError}</p> : null}
            <button className={`primary-button ${styles.fullWidthButton}`} disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
