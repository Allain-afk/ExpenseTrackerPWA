import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/common/PageHeader';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';

export function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
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
    <div className="screen-container">
      <PageHeader backTo="/" title="Reset Password" />

      <main className="screen-content padding-b-safe">
        <section className="section-block">
          <div className="section-header">
            <h2 className="section-title">Setup New Password</h2>
            <p className="section-subtitle">
              Please enter your new password below.
            </p>
          </div>

          <form className="app-card form-container" onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="field-label" htmlFor="new-password">
                New Password
              </label>
              <input
                autoComplete="new-password"
                className="text-input"
                id="new-password"
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                type="password"
                value={newPassword}
              />
            </div>

            {auth.authError ? <p className="error-text">{auth.authError}</p> : null}

            <div className="form-actions">
              <button className="primary-button" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
