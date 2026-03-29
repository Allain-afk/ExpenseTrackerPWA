import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { MdNotificationsActive, MdPerson, MdWarning } from 'react-icons/md';
import { useSettings } from '../hooks/useSettings';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';
import { requestNotificationPermission } from '../lib/utils/notifications';
import styles from './SetupScreen.module.css';

export function SetupScreen() {
  const navigate = useNavigate();
  const {
    isSetupComplete,
    markSetupComplete,
    updateUserSettings,
  } = useSettings();

  const [name, setName] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [threshold, setThreshold] = useState('1000');
  const [message, setMessage] = useState(
    'Hey {name}! Slow down on spending! You are now low on budget. You dumbass!',
  );
  const [isSaving, setIsSaving] = useState(false);

  if (isSetupComplete) {
    return <Navigate replace to="/app/home" />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedThreshold = Number.parseFloat(threshold);

    if (!name.trim()) {
      showErrorToast('Name required', 'Please enter your name before finishing setup.');
      return;
    }

    if (notificationsEnabled && (!threshold.trim() || Number.isNaN(parsedThreshold) || parsedThreshold < 0)) {
      showErrorToast('Invalid threshold', 'Please enter a valid low-balance amount.');
      return;
    }

    if (notificationsEnabled && !message.trim()) {
      showErrorToast('Message required', 'Please enter a notification message.');
      return;
    }

    setIsSaving(true);

    try {
      if (notificationsEnabled) {
        await requestNotificationPermission();
      }

      await updateUserSettings({
        userName: name.trim(),
        notificationsEnabled,
        lowBalanceThreshold: parsedThreshold,
        notificationMessage: message.trim(),
      });
      await markSetupComplete();
      showSuccessToast(
        'Setup complete',
        notificationsEnabled
          ? 'Low-balance alerts are ready to keep an eye on your budget.'
          : 'You can turn alerts on later from Settings.',
      );
      navigate('/app/home', { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'We could not save your setup right now.';
      showErrorToast('Setup failed', message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className={styles.screen}>
      <div className={styles.panel}>
        <section className={`app-card ${styles.hero}`}>
          <p className="eyebrow">Welcome</p>
          <h1>Let&apos;s set up your expense tracker.</h1>
          <p>
            We&apos;ll save your name, preferred low-balance alert settings, and notification message
            locally on this device.
          </p>
        </section>

        <form className="stack-form" onSubmit={(event) => void handleSubmit(event)}>
          <section className="app-card" style={{ padding: '1rem' }}>
            <div className="form-field">
              <label className="field-label" htmlFor="setup-name">
                Your Name
              </label>
              <div className="row-spread" style={{ gap: '0.75rem' }}>
                <span className="icon-chip accent-chip">
                  <MdPerson size={22} />
                </span>
                <input
                  className="text-input"
                  id="setup-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your name for personalized notifications"
                  value={name}
                />
              </div>
            </div>
          </section>

          <section className="app-card" style={{ padding: '1rem' }}>
            <div className="row-spread" style={{ alignItems: 'flex-start' }}>
              <div>
                <p className="eyebrow">Notifications</p>
                <h2 style={{ margin: '0.35rem 0 0' }}>Enable low balance alerts</h2>
                <p className="helper-text" style={{ marginTop: '0.35rem' }}>
                  Get notified when your balance falls below the threshold you choose.
                </p>
              </div>
              <button
                className={`segment-button ${notificationsEnabled ? 'active' : ''}`}
                onClick={() => setNotificationsEnabled((current) => !current)}
                type="button"
              >
                <MdNotificationsActive size={20} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
                {notificationsEnabled ? 'On' : 'Off'}
              </button>
            </div>

            {notificationsEnabled ? (
              <div className="stack-form" style={{ marginTop: '1rem' }}>
                <div className="form-field">
                  <label className="field-label" htmlFor="setup-threshold">
                    Low Balance Threshold
                  </label>
                  <div className="row-spread" style={{ gap: '0.75rem' }}>
                    <span className="icon-chip" style={{ background: 'rgba(245,158,11,0.14)', color: '#d97706' }}>
                      <MdWarning size={22} />
                    </span>
                    <input
                      className="text-input"
                      id="setup-threshold"
                      inputMode="decimal"
                      onChange={(event) => setThreshold(event.target.value)}
                      placeholder="Amount that triggers notification"
                      value={threshold}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="field-label" htmlFor="setup-message">
                    Custom Notification Message
                  </label>
                  <textarea
                    className="text-area"
                    id="setup-message"
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Use {name} as a placeholder for your name"
                    value={message}
                  />
                  <p className="helper-text">Tip: Use {'{name}'} to include your name in the alert.</p>
                </div>
              </div>
            ) : null}
          </section>
          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </main>
  );
}
