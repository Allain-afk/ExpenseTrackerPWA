import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdCheckCircle, MdLockReset, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/common/PageHeader';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';
import styles from './ResetPasswordScreen.module.css';

export function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword.trim()) {
      showErrorToast('Missing password', 'Please enter a new password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await auth.updatePassword(newPassword);
      showSuccessToast('Password updated', 'Your password has been successfully changed.');
      navigate('/app/settings');
    } catch (error) {
      showErrorToast('Update failed', (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.screen}>
      <div className={styles.panel}>
        <PageHeader backTo="/" title="Reset Password" />

        <section className={`app-card ${styles.hero}`}>
          <div className={styles.heroRow}>
            <span className={`icon-chip ${styles.heroIcon}`}>
              <MdLockReset size={22} />
            </span>
            <div>
              <p className="eyebrow">Security</p>
              <h2 className={styles.heroTitle}>Set up a new password</h2>
            </div>
          </div>
          <p className={styles.heroSubtitle}>
            Use a strong password to protect your synced data across devices.
          </p>
        </section>

        <form className={`app-card ${styles.formCard}`} onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="field-label" htmlFor="new-password">
              New Password
            </label>
            <div className={styles.inputRow}>
              <span className={`icon-chip ${styles.inputIcon}`}>
                <MdLockReset size={18} />
              </span>
              <input
                autoComplete="new-password"
                className="text-input"
                id="new-password"
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                type={isPasswordVisible ? 'text' : 'password'}
                value={newPassword}
              />
              <button
                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                aria-pressed={isPasswordVisible}
                className={styles.toggleButton}
                onClick={() => setIsPasswordVisible((current) => !current)}
                type="button"
              >
                {isPasswordVisible ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
              </button>
            </div>
            <ul className={styles.helperList}>
              <li className={styles.helperItem}>
                <MdCheckCircle size={16} />
                At least 8 characters
              </li>
              <li className={styles.helperItem}>
                <MdCheckCircle size={16} />
                Mix letters and numbers for strength
              </li>
            </ul>
          </div>

          {auth.authError ? <p className="error-text">{auth.authError}</p> : null}

          <div className={styles.actionRow}>
            <button
              className={`primary-button ${styles.fullWidthButton}`}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
