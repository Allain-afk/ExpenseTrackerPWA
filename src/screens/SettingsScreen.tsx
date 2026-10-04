import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  MdAttachMoney,
  MdCloud,
  MdCloudOff,
  MdCloudSync,
  MdCreditCard,
  MdDeleteForever,
  MdInfoOutline,
  MdLockReset,
  MdMessage,
  MdNotificationsActive,
  MdPalette,
  MdPersonOutline,
  MdSavings,
  MdWallet,
} from 'react-icons/md';
import { availableCurrencies } from '../lib/constants/settings';
import { getThemePreset, themeOptions } from '../lib/constants/themes';
import { versionHistory } from '../lib/constants/versionHistory';
import { formatMoney } from '../lib/utils/format';
import { showErrorToast, showInfoToast, showSuccessToast } from '../lib/utils/appToast';
import { requestNotificationPermission } from '../lib/utils/notifications';
import { useAuth } from '../hooks/useAuth';
import { useAppBootstrap } from '../hooks/useAppBootstrap';
import { useSettings } from '../hooks/useSettings';
import { useSync } from '../hooks/useSync';
import { useTransactions } from '../hooks/useTransactions';
import { SectionList } from '../components/common/SectionList';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SyncStatusIcon } from '../components/common/SyncStatusIcon';
import { CloudDataDeletionControl } from '../components/common/CloudDataDeletionControl';
import { getSupabaseDisplayName } from '../lib/utils/supabaseUser';
import styles from './SettingsScreen.module.css';


export function SettingsScreen() {
  const settings = useSettings();
  const transactions = useTransactions();
  const auth = useAuth();
  const { bootstrap } = useAppBootstrap();
  const shouldOpenAuthModal = typeof window !== 'undefined'
    && window.sessionStorage.getItem('open_auth_modal') === 'signin';
  const {
    adoptAnonymousRowsForUser,
    deleteCloudDataForCurrentUser,
    getAnonymousLocalRowsCount,
    isOnline,
    status,
    syncNow,
  } = useSync();

  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isThresholdOpen, setIsThresholdOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(shouldOpenAuthModal);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [anonymousRowsCount, setAnonymousRowsCount] = useState(0);
  const [isAdoptingRows, setIsAdoptingRows] = useState(false);
  const [thresholdDraft, setThresholdDraft] = useState(String(settings.lowBalanceThreshold));
  const [messageDraft, setMessageDraft] = useState(settings.notificationMessage);
  const activeTheme = getThemePreset(settings.themeId);
  const currentUserId = auth.user?.id ?? null;
  const onboardingName = settings.userName.trim();

  useEffect(() => {
    if (shouldOpenAuthModal) {
      window.sessionStorage.removeItem('open_auth_modal');
    }
  }, [shouldOpenAuthModal]);

  useEffect(() => {
    if (!auth.user || !onboardingName) {
      return;
    }

    const currentDisplayName = getSupabaseDisplayName(auth.user.user_metadata);
    if (currentDisplayName === onboardingName) {
      return;
    }

    void auth.syncDisplayName(onboardingName).catch(() => {
      // Keep this silent to avoid noisy toasts on app load.
    });
  }, [auth, onboardingName]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let cancelled = false;

    void getAnonymousLocalRowsCount()
      .then((count) => {
        if (!cancelled) {
          setAnonymousRowsCount(count);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAnonymousRowsCount(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserId, getAnonymousLocalRowsCount]);

  async function toggleNotifications(enabled: boolean) {
    try {
      if (enabled) {
        await requestNotificationPermission();
      }

      await settings.updateNotificationSettings({ notificationsEnabled: enabled });
      showInfoToast(
        enabled ? 'Low-balance alerts on' : 'Low-balance alerts off',
        enabled
          ? 'You will see an in-app toast when your balance drops below the threshold.'
          : 'You can re-enable alerts anytime from Settings.',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'We could not update notification settings.';
      showErrorToast('Notification update failed', message);
    }
  }

  async function resetAllData() {
    try {
      await settings.resetAllAppData();
      await transactions.loadTransactions();
      setIsResetOpen(false);
      showSuccessToast('All app data reset', 'Your local settings and transactions were cleared.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not reset the app data.';
      showErrorToast('Reset failed', message);
    }
  }

  async function updateCurrencyPreference(currency: (typeof availableCurrencies)[number]) {
    try {
      if (currency.code === settings.currency) {
        setIsCurrencyOpen(false);
        return;
      }

      await settings.updateCurrency(currency.code, currency.symbol);
      setIsCurrencyOpen(false);
      showSuccessToast('Currency updated', `Now using ${currency.name} (${currency.symbol}).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not update the currency.';
      showErrorToast('Currency update failed', message);
    }
  }

  async function updateThemePreference(themeId: (typeof themeOptions)[number]['id']) {
    try {
      if (themeId === settings.themeId) {
        setIsThemeOpen(false);
        return;
      }

      const theme = getThemePreset(themeId);
      await settings.updateTheme(themeId);
      setIsThemeOpen(false);
      showSuccessToast('Theme updated', `${theme.label} is now active.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not update the theme.';
      showErrorToast('Theme update failed', message);
    }
  }

  async function saveThreshold() {
    const parsed = Number.parseFloat(thresholdDraft);
    if (Number.isNaN(parsed) || parsed < 0) {
      showErrorToast('Invalid threshold', 'Please enter a valid amount.');
      return;
    }

    try {
      await settings.updateNotificationSettings({ lowBalanceThreshold: parsed });
      setIsThresholdOpen(false);
      showSuccessToast(
        'Threshold updated',
        `Alerts will trigger below ${formatMoney(parsed, settings.currencySymbol)}.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not save the threshold.';
      showErrorToast('Threshold update failed', message);
    }
  }

  async function saveNotificationMessage() {
    if (!messageDraft.trim()) {
      showErrorToast('Message required', 'Please enter a message.');
      return;
    }

    try {
      await settings.updateNotificationSettings({ notificationMessage: messageDraft.trim() });
      setIsMessageOpen(false);
      showSuccessToast('Alert message updated', 'Low-balance toasts will use your new message.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not save the message.';
      showErrorToast('Message update failed', message);
    }
  }

  function openAuthModal(mode: 'signin' | 'signup') {
    setAuthMode(mode);
    setIsAuthOpen(true);
    auth.clearAuthError();
  }

  async function submitAuth(): Promise<void> {
    if (!authEmail.trim() || !authPassword.trim()) {
      showErrorToast('Missing credentials', 'Email and password are required.');
      return;
    }

    setIsAuthSubmitting(true);

    try {
      if (authMode === 'signin') {
        await auth.signInWithPassword(authEmail.trim(), authPassword);
        if (onboardingName) {
          void auth.syncDisplayName(onboardingName).catch(() => {
            // Do not block sign-in success if profile metadata sync fails.
          });
        }
        showSuccessToast('Signed in', 'Cloud backup is now available.');
        setAuthPassword('');
        setIsAuthOpen(false);
      } else {
        await auth.signUpWithPassword(authEmail.trim(), authPassword, onboardingName || undefined);
        showSuccessToast('Account created', 'Check your inbox if email confirmation is required.');
      }

      setAuthPassword('');
      setIsAuthOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed.';
      showErrorToast('Authentication failed', message);
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  function rememberRecoveryEmail(value: string | undefined): void {
    const email = value?.trim().toLowerCase();
    if (email) {
      const previousEmail = window.sessionStorage.getItem('password_recovery_email');
      if (previousEmail !== email) {
        window.sessionStorage.removeItem('password_recovery_code_sent');
        window.sessionStorage.removeItem('password_recovery_verified');
        window.sessionStorage.removeItem('password_recovery_resend_at');
      }
      window.sessionStorage.setItem('password_recovery_email', email);
    } else {
      window.sessionStorage.removeItem('password_recovery_email');
      window.sessionStorage.removeItem('password_recovery_code_sent');
      window.sessionStorage.removeItem('password_recovery_verified');
      window.sessionStorage.removeItem('password_recovery_resend_at');
    }
  }

  async function deleteAllCloudData(): Promise<void> {
    try {
      await deleteCloudDataForCurrentUser();
      await bootstrap(true);
      showSuccessToast('Cloud data deleted', 'Your synced data was erased and you have been signed out.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cloud data deletion failed.';
      showErrorToast('Cloud deletion needs attention', message);
      throw error;
    }
  }

  async function signOutCloud(): Promise<void> {
    try {
      await auth.signOut();
      setAnonymousRowsCount(0);
      showInfoToast('Signed out', 'Local mode is still active on this device.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not sign out.';
      showErrorToast('Sign out failed', message);
    }
  }

  async function linkLocalRowsToAccount(): Promise<void> {
    if (!auth.user) {
      return;
    }

    setIsAdoptingRows(true);

    try {
      await adoptAnonymousRowsForUser(auth.user.id);
      const remainingRows = await getAnonymousLocalRowsCount();
      setAnonymousRowsCount(remainingRows);
      showSuccessToast('Local rows linked', 'Existing local data is now attached to your account.');
      await syncNow();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to link local rows.';
      showErrorToast('Link local rows failed', message);
    } finally {
      setIsAdoptingRows(false);
    }
  }

  return (
    <main className="app-page">
      <div className="page-content">
        <header>
          <div className={`row-spread ${styles.settingsHeader}`}>
            <div>
              <p className="eyebrow">Preferences</p>
              <h1 className={styles.settingsTitle}>
                Settings
              </h1>
            </div>
            <SyncStatusIcon />
          </div>
        </header>

        <SectionList headerText="Cloud Backup">
          {!auth.isConfigured ? (
            <div className="inset-item">
              <span className={`icon-chip ${styles.neutralIcon}`}>
                <MdCloudOff size={22} />
              </span>
              <span className="inset-item-content">
                <span className="inset-title">Cloud sync unavailable</span>
                <span className="inset-subtitle">
                  Add VITE_SUPABASE_URL and either VITE_SUPABASE_PUBLISHABLE_KEY or
                  VITE_SUPABASE_ANON_KEY to enable account backup.
                </span>
              </span>
            </div>
          ) : null}

          {auth.isConfigured && !auth.user ? (
            <>
              <button className="inset-item" onClick={() => openAuthModal('signin')} type="button">
                <span className={`icon-chip ${styles.statusIcon}`}>
                  <MdCloud size={22} />
                </span>
                <span className="inset-item-content">
                  <span className="inset-title">Sign in for cloud backup</span>
                  <span className="inset-subtitle">Keep offline-first mode and sync with your account.</span>
                </span>
              </button>
              <button className="inset-item" onClick={() => openAuthModal('signup')} type="button">
                <span className={`icon-chip ${styles.successIcon}`}>
                  <MdCloudSync size={22} />
                </span>
                <span className="inset-item-content">
                  <span className="inset-title">Create cloud account</span>
                  <span className="inset-subtitle">Use email + password to secure cloud backup.</span>
                </span>
              </button>
            </>
          ) : null}

          {auth.isConfigured && auth.user ? (
            <>
              <div className="inset-item">
                <span className={`icon-chip ${styles.successIcon}`}>
                  <MdCloud size={22} />
                </span>
                <span className="inset-item-content">
                  <span className="inset-title">Connected as {auth.user.email ?? 'account user'}</span>
                  <span className="inset-subtitle">
                    {isOnline
                      ? status === 'syncing'
                        ? 'Syncing changes now...'
                        : 'Online and ready to sync.'
                      : 'Offline. Changes are queued locally.'}
                  </span>
                </span>
              </div>

              {anonymousRowsCount > 0 ? (
                <button className="inset-item" disabled={isAdoptingRows} onClick={() => void linkLocalRowsToAccount()} type="button">
                  <span className={`icon-chip ${styles.statusIcon}`}>
                    <MdCloudSync size={22} />
                  </span>
                  <span className="inset-item-content">
                    <span className="inset-title">
                      {isAdoptingRows
                        ? 'Linking local rows...'
                        : `Link ${anonymousRowsCount} local row${anonymousRowsCount > 1 ? 's' : ''}`}
                    </span>
                    <span className="inset-subtitle">
                      Assign existing local data to this account, then sync to cloud backup.
                    </span>
                  </span>
                </button>
              ) : null}

              <button className="inset-item" onClick={() => void syncNow()} type="button">
                <span className="icon-chip accent-chip">
                  <MdCloudSync size={22} />
                </span>
                <span className="inset-item-content">
                  <span className="inset-title">Sync now</span>
                  <span className="inset-subtitle">Push unsynced local changes to your account.</span>
                </span>
              </button>

              <button className="inset-item" onClick={() => void signOutCloud()} type="button">
                <span className={`icon-chip ${styles.warningIcon}`}>
                  <MdPersonOutline size={22} />
                </span>
                <span className="inset-item-content">
                  <span className="inset-title">Sign out cloud account</span>
                  <span className="inset-subtitle">Local data remains available on this device.</span>
                </span>
              </button>
            </>
          ) : null}
        </SectionList>
        <SectionList headerText="Preferences">
          <button className="inset-item" onClick={() => setIsCurrencyOpen(true)} type="button">
            <span className={`icon-chip ${styles.successIcon}`}>
              <MdAttachMoney size={22} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title">Currency</span>
              <span className="inset-subtitle">
                {settings.currency} ({settings.currencySymbol})
              </span>
            </span>
          </button>
          <button className="inset-item" onClick={() => setIsThemeOpen(true)} type="button">
            <span className="icon-chip accent-chip">
              <MdPalette size={22} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title">Themes</span>
              <span className="inset-subtitle">{activeTheme.label}</span>
            </span>
          </button>
        </SectionList>

        <SectionList headerText="Cards, Wallets & Budgeting">
          <Link className="inset-item" to="/wallets">
            <span className="icon-chip accent-chip">
              <MdCreditCard size={22} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title">Manage Cards</span>
              <span className="inset-subtitle">Add, edit, reorder, or remove wallets</span>
            </span>
          </Link>
          <Link className="inset-item" to="/budgeting">
            <span className={`icon-chip ${styles.successIcon}`}>
              <MdSavings size={22} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title">Budgeting</span>
              <span className="inset-subtitle">Plan allocations without changing your balances</span>
            </span>
          </Link>
        </SectionList>

        <SectionList headerText="Notifications">
          <button className="inset-item" onClick={() => void toggleNotifications(!settings.notificationsEnabled)} type="button">
            <span className={`icon-chip ${styles.warningIcon}`}>
              <MdNotificationsActive size={22} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title">Low Balance Alerts</span>
              <span className="inset-subtitle">
                {settings.notificationsEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </span>
          </button>
          {settings.notificationsEnabled ? (
            <>
              <button
                className="inset-item"
                onClick={() => {
                  setThresholdDraft(String(settings.lowBalanceThreshold));
                  setIsThresholdOpen(true);
                }}
                type="button"
              >
                <span className={`icon-chip ${styles.neutralIcon}`}>
                  <MdWallet size={22} />
                </span>
                <span className="inset-item-content">
                  <span className="inset-title">Global Threshold Amount</span>
                  <span className="inset-subtitle">
                    Fallback for wallets without a custom limit —{' '}
                    {formatMoney(settings.lowBalanceThreshold, settings.currencySymbol)}
                  </span>
                </span>
              </button>
              <button
                className="inset-item"
                onClick={() => {
                  setMessageDraft(settings.notificationMessage);
                  setIsMessageOpen(true);
                }}
                type="button"
              >
                <span className={`icon-chip ${styles.infoIcon}`}>
                  <MdMessage size={22} />
                </span>
                <span className="inset-item-content">
                  <span className="inset-title">Alert Message</span>
                  <span className="inset-subtitle">{settings.notificationMessage}</span>
                </span>
              </button>
            </>
          ) : null}
        </SectionList>

        <SectionList headerText="Data Management">
          <button className="inset-item" onClick={() => setIsResetOpen(true)} type="button">
            <span className={`icon-chip ${styles.dangerIcon}`}>
              <MdDeleteForever size={22} />
            </span>
            <span className="inset-item-content">
              <span className={`inset-title ${styles.dangerText}`}>
                Reset All App Data
              </span>
              <span className="inset-subtitle">Delete all transactions and reset settings</span>
            </span>
          </button>
          {auth.isConfigured && auth.user?.email ? (
            <CloudDataDeletionControl
              accountEmail={auth.user.email}
              onDelete={deleteAllCloudData}
            />
          ) : null}
        </SectionList>

        <SectionList headerText="Security">
          <Link
            className="inset-item"
            onClick={() => {
              rememberRecoveryEmail(auth.user?.email);
            }}
            to="/reset-password"
          >
            <span className={`icon-chip ${styles.statusIcon}`}>
              <MdLockReset size={22} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title">Reset Password</span>
              <span className="inset-subtitle">
                Verify your email with a six-digit recovery code
              </span>
            </span>
          </Link>
        </SectionList>

        <SectionList headerText="About">
          <button className="inset-item" onClick={() => setIsVersionOpen(true)} type="button">
            <span className="icon-chip accent-chip">
              <MdInfoOutline size={22} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title">Version</span>
              <span className="inset-subtitle">v{versionHistory[0].version}</span>
            </span>
          </button>
          <div className="inset-item">
            <span className={`icon-chip ${styles.purpleIcon}`}>
              <MdPersonOutline size={22} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title">Developer</span>
              <span className="inset-subtitle">Allain Ralph Legaspi</span>
            </span>
          </div>
        </SectionList>
      </div>

      <Modal
        description="Choose the currency shown throughout the app."
        onClose={() => setIsCurrencyOpen(false)}
        open={isCurrencyOpen}
        title="Select Currency"
      >
        <div className="inset-list">
          {availableCurrencies.map((currency) => {
            const isSelected = currency.code === settings.currency;
            return (
              <button
                className="inset-item"
                key={currency.code}
                onClick={() => void updateCurrencyPreference(currency)}
                type="button"
              >
                <span className="inset-item-content">
                  <span className="inset-title">{currency.name}</span>
                  <span className="inset-subtitle">
                    {currency.code} ({currency.symbol})
                  </span>
                </span>
                {isSelected ? <span className="tag tag-blue">Selected</span> : null}
              </button>
            );
          })}
        </div>
      </Modal>

      <Modal
        description="Pick the visual style used across the app."
        onClose={() => setIsThemeOpen(false)}
        open={isThemeOpen}
        title="Choose Theme"
      >
        <div className={styles.themeGrid}>
          {themeOptions.map((theme) => {
            const isSelected = theme.id === settings.themeId;

            return (
              <button
                className={`${styles.themeCard} ${isSelected ? styles.themeCardSelected : ''}`}
                key={theme.id}
                onClick={() => void updateThemePreference(theme.id)}
                type="button"
              >
                <div className={styles.themePreview} aria-hidden="true">
                  {theme.preview.map((color) => (
                    <span className={styles.themeSwatch} key={color} style={{ background: color }} />
                  ))}
                </div>
                <div className={styles.themeCardBody}>
                  <div className={styles.themeCardHeader}>
                    <strong>{theme.label}</strong>
                    {isSelected ? <span className="tag tag-blue">Active</span> : null}
                  </div>
                  <p>{theme.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Modal>

      <Modal
        description={`Current symbol: ${settings.currencySymbol}`}
        onClose={() => setIsThresholdOpen(false)}
        open={isThresholdOpen}
        title="Edit Low Balance Threshold"
      >
        <div className="stack-form">
          <div className="form-field">
            <label className="field-label" htmlFor="threshold-input">
              Threshold Amount
            </label>
            <input
              className="text-input"
              id="threshold-input"
              inputMode="decimal"
              onChange={(event) => setThresholdDraft(event.target.value)}
              value={thresholdDraft}
            />
          </div>
          <button
            className="primary-button"
            onClick={() => void saveThreshold()}
            type="button"
          >
            Save
          </button>
        </div>
      </Modal>

      <Modal
        description="Use {name} to include the saved user name in the alert."
        onClose={() => setIsMessageOpen(false)}
        open={isMessageOpen}
        title="Edit Notification Message"
      >
        <div className="stack-form">
          <div className="form-field">
            <label className="field-label" htmlFor="message-input">
              Custom Message
            </label>
            <textarea
              className="text-area"
              id="message-input"
              onChange={(event) => setMessageDraft(event.target.value)}
              value={messageDraft}
            />
          </div>
          <button
            className="primary-button"
            onClick={() => void saveNotificationMessage()}
            type="button"
          >
            Save
          </button>
        </div>
      </Modal>

      <Modal
        onClose={() => setIsVersionOpen(false)}
        open={isVersionOpen}
        title="Version History"
      >
        <div className={styles.versionList}>
          {versionHistory.map((version) => (
            <details
              className={`${styles.versionItem} ${version.latest ? styles.versionItemLatest : ''}`}
              key={version.version}
              open={version.latest}
              style={
                {
                  '--version-accent': version.accent,
                  '--version-badge-bg': version.badgeBackground,
                  '--version-surface': version.surface,
                } as CSSProperties
              }
            >
              <summary className={styles.versionSummary}>
                <div className={styles.versionSummaryCopy}>
                  <span className={styles.versionPill}>v{version.version}</span>
                  <h3>{version.title}</h3>
                  <p>{version.latest ? 'Latest release' : 'Release notes'}</p>
                </div>
                {version.latest ? <span className={styles.latestPill}>Latest</span> : null}
              </summary>
              <div className={styles.versionContent}>
                <ul className={styles.versionBulletList}>
                  {version.description.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        confirmLabel="Reset All Data"
        description="This will permanently delete all transactions and reset your stored settings. This action cannot be undone."
        onClose={() => setIsResetOpen(false)}
        onConfirm={() => void resetAllData()}
        open={isResetOpen}
        title="Reset All App Data"
        tone="danger"
      />

      <Modal
        description={
          authMode === 'signin'
            ? 'Sign in to link this device and enable optional cloud backup.'
            : 'Create your account to enable optional cloud backup.'
        }
        onClose={() => setIsAuthOpen(false)}
        open={isAuthOpen}
        title={authMode === 'signin' ? 'Sign In' : 'Create Account'}
      >
        <div className="stack-form">
          <div className="form-field">
            <label className="field-label" htmlFor="auth-email-input">
              Email
            </label>
            <input
              autoComplete="email"
              className="text-input"
              id="auth-email-input"
              onChange={(event) => setAuthEmail(event.target.value)}
              type="email"
              value={authEmail}
            />
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="auth-password-input">
              Password
            </label>
            <input
              autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
              className="text-input"
              id="auth-password-input"
              onChange={(event) => setAuthPassword(event.target.value)}
              type="password"
              value={authPassword}
            />
            {authMode === 'signin' && (
              <Link
                className="text-button"
                onClick={() => {
                  rememberRecoveryEmail(authEmail);
                  setIsAuthOpen(false);
                }}
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem', fontSize: '0.8em', padding: 0 }}
                to="/reset-password"
              >
                Forgot password?
              </Link>
            )}
          </div>

          {auth.authError ? <p className="error-text">{auth.authError}</p> : null}

          <div className="inline-actions">
            <button className="secondary-button" onClick={() => setIsAuthOpen(false)} type="button">
              Cancel
            </button>
            <button
              className="primary-button"
              disabled={isAuthSubmitting}
              onClick={() => void submitAuth()}
              type="button"
            >
              {isAuthSubmitting
                ? authMode === 'signin'
                  ? 'Signing in...'
                  : 'Creating...'
                : authMode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
