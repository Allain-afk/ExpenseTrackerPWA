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
  MdMessage,
  MdNotificationsActive,
  MdPalette,
  MdPersonOutline,
  MdWallet,
} from 'react-icons/md';
import { availableCurrencies } from '../lib/constants/settings';
import { getThemePreset, themeOptions } from '../lib/constants/themes';
import { formatMoney } from '../lib/utils/format';
import { showErrorToast, showInfoToast, showSuccessToast } from '../lib/utils/appToast';
import { requestNotificationPermission } from '../lib/utils/notifications';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useSync } from '../hooks/useSync';
import { useTransactions } from '../hooks/useTransactions';
import { SectionList } from '../components/common/SectionList';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SyncStatusIcon } from '../components/common/SyncStatusIcon';
import styles from './SettingsScreen.module.css';

function getSupabaseDisplayName(input: unknown): string {
  if (!input || typeof input !== 'object') {
    return '';
  }

  const metadata = input as Record<string, unknown>;
  const displayName = metadata.display_name;
  const fullName = metadata.full_name;
  const name = metadata.name;

  if (typeof displayName === 'string' && displayName.trim()) {
    return displayName.trim();
  }

  if (typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim();
  }

  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }

  return '';
}

const versionHistory: Array<{
  version: string;
  title: string;
  description: string[];
  accent: string;
  badgeBackground: string;
  surface: string;
  latest?: boolean;
}> = [
  {
    version: '1.3.4',
    title: 'Transaction UI Balance & Small Fixes',
    description: [
      'Softened transaction icons app-wide with a smaller, lower-opacity plus and minus badge style.',
      'Matched the Add Transaction sticky save button more closely to the main bottom navigation height.',
      'Fixed the Transaction date card layout so the calendar section and input stay inside the card cleanly.',
    ],
    accent: '#2563eb',
    badgeBackground: 'rgba(37, 99, 235, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(239, 246, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
    latest: true,
  },
  {
    version: '1.3.3',
    title: 'Transaction Polish & Daily Tips',
    description: [
      'Added Allowance as an income category for easier personal budget tracking.',
      'Updated transaction icons with clearer plus and minus badges across Home and Transactions.',
      'Refined the Add Transaction screen with sectioned cards, a stronger amount input, a lower sticky save action, and cleaner header spacing.',
      'Replaced the Home screen expense groups section with a rotating Tip of the Day card that changes every day.',
    ],
    accent: '#0f766e',
    badgeBackground: 'rgba(15, 118, 110, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(240, 253, 250, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.3.2',
    title: 'Themes, Ordering & Delete Safeguards',
    description: [
      'Added app-wide blue, pink, mint, and dark theme presets in Settings.',
      'Added drag-and-drop card ordering so Home can follow your preferred card order.',
      'Deleting a card now also removes its linked transactions and shows a stronger warning first.',
      'Kept the main combined balance card pinned first while wallet cards can be rearranged.',
    ],
    accent: '#db2777',
    badgeBackground: 'rgba(219, 39, 119, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.3.1',
    title: 'Toast & Card Visibility Update',
    description: [
      'Added custom react-hot-toast notifications with a cleaner in-app alert style.',
      'Added card visibility controls for wallet cards and the default Total Money card.',
      'Improved Manage Cards and mobile card editor layouts for better readability.',
    ],
    accent: '#2563eb',
    badgeBackground: 'rgba(37, 99, 235, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(239, 246, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.3.0',
    title: 'Multi-Wallet & Modern UI',
    description: [
      'Introduced multi-wallet support with dedicated balances for each card.',
      'Upgraded the floating navigation dock and refreshed the dashboard presentation.',
      'Redesigned Settings and Transactions screens with a more modern glassmorphic feel.',
    ],
    accent: '#7c3aed',
    badgeBackground: 'rgba(124, 58, 237, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(245, 243, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.2.0',
    title: 'New user UI/UX functionalities',
    description: [
      'Added a notification system for low-budget thresholds.',
      'Personalized alert messages using the saved user name.',
      'Added customizable notification settings for message and threshold.',
    ],
    accent: '#ea580c',
    badgeBackground: 'rgba(249, 115, 22, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(255, 247, 237, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.0.3',
    title: 'App Animation Feature (Splash Screen) when opened',
    description: [
      'Added a more polished animated splash screen.',
      'Improved opening transitions for a smoother first impression.',
    ],
    accent: '#06b6d4',
    badgeBackground: 'rgba(6, 182, 212, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(236, 254, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.0.2',
    title: 'UI and UX Improvements',
    description: [
      'Enhanced the overall interface design system.',
      'Improved everyday usability across key screens.',
      'Included general performance optimizations.',
    ],
    accent: '#10b981',
    badgeBackground: 'rgba(16, 185, 129, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(236, 253, 245, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.0.1',
    title: 'App Icon Update',
    description: [
      'Updated the app icon with a cleaner visual identity.',
      'Improved recognizability on the home screen.',
    ],
    accent: '#ec4899',
    badgeBackground: 'rgba(236, 72, 153, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(253, 242, 248, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.0.0',
    title: 'Basic Features for Expense Tracking',
    description: [
      'Launched the core expense tracking experience.',
      'Added transaction management essentials.',
      'Included the first set of basic reporting features.',
    ],
    accent: '#475569',
    badgeBackground: 'rgba(71, 85, 105, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
] as const;

export function SettingsScreen() {
  const settings = useSettings();
  const transactions = useTransactions();
  const auth = useAuth();
  const {
    adoptAnonymousRowsForUser,
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
  const [isAuthOpen, setIsAuthOpen] = useState(false);
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
        showSuccessToast('Signed in', 'Cloud backup is now available. Restarting app...');
        setAuthPassword('');
        setIsAuthOpen(false);
        window.setTimeout(() => {
          window.location.replace('/');
        }, 120);
        return;
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

  async function handleForgotPassword(): Promise<void> {
    if (!authEmail.trim()) {
      showErrorToast('Email required', 'Please enter your email address to reset your password.');
      return;
    }

    try {
      await auth.sendPasswordResetEmail(authEmail.trim());
      showSuccessToast('Reset link sent', 'Check your email for instructions to reset your password.');
    } catch (error) {
      showErrorToast('Reset failed', (error as Error).message);
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
          <div className="row-spread" style={{ alignItems: 'flex-start' }}>
            <div>
              <p className="eyebrow">Preferences</p>
              <h1 style={{ margin: '0.35rem 0 0', fontSize: '1.85rem', letterSpacing: '-0.06em' }}>
                Settings
              </h1>
            </div>
            <SyncStatusIcon />
          </div>
        </header>

        <SectionList headerText="Cloud Backup">
          {!auth.isConfigured ? (
            <div className="inset-item">
              <span className="icon-chip" style={{ background: 'rgba(71,85,105,0.12)', color: '#475569' }}>
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
                <span className="icon-chip" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}>
                  <MdCloud size={22} />
                </span>
                <span className="inset-item-content">
                  <span className="inset-title">Sign in for cloud backup</span>
                  <span className="inset-subtitle">Keep offline-first mode and sync with your account.</span>
                </span>
              </button>
              <button className="inset-item" onClick={() => openAuthModal('signup')} type="button">
                <span className="icon-chip" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>
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
                <span className="icon-chip" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>
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
                  <span className="icon-chip" style={{ background: 'rgba(59,130,246,0.12)', color: '#2563eb' }}>
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
                <span className="icon-chip" style={{ background: 'rgba(249,115,22,0.12)', color: '#ea580c' }}>
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
            <span className="icon-chip" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>
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

        <SectionList headerText="Cards & Wallets">
          <Link className="inset-item" to="/wallets">
            <span className="icon-chip accent-chip">
              <MdCreditCard size={22} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title">Manage Cards</span>
              <span className="inset-subtitle">Add, edit, reorder, or remove wallets</span>
            </span>
          </Link>
        </SectionList>

        <SectionList headerText="Notifications">
          <button className="inset-item" onClick={() => void toggleNotifications(!settings.notificationsEnabled)} type="button">
            <span className="icon-chip" style={{ background: 'rgba(249,115,22,0.12)', color: '#ea580c' }}>
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
                <span className="icon-chip" style={{ background: 'rgba(71,85,105,0.12)', color: '#475569' }}>
                  <MdWallet size={22} />
                </span>
                <span className="inset-item-content">
                  <span className="inset-title">Threshold Amount</span>
                  <span className="inset-subtitle">
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
                <span className="icon-chip" style={{ background: 'rgba(99,102,241,0.12)', color: '#4338ca' }}>
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
            <span className="icon-chip" style={{ background: 'rgba(244,63,94,0.12)', color: '#e11d48' }}>
              <MdDeleteForever size={22} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title" style={{ color: '#e11d48' }}>
                Reset All App Data
              </span>
              <span className="inset-subtitle">Delete all transactions and reset settings</span>
            </span>
          </button>
        </SectionList>

        <SectionList headerText="About">
          <button className="inset-item" onClick={() => setIsVersionOpen(true)} type="button">
            <span className="icon-chip accent-chip">
              <MdInfoOutline size={22} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title">Version</span>
              <span className="inset-subtitle">1.3.4</span>
            </span>
          </button>
          <div className="inset-item">
            <span className="icon-chip" style={{ background: 'rgba(168,85,247,0.12)', color: '#7e22ce' }}>
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
              <button 
                className="text-button" 
                onClick={() => void handleForgotPassword()}
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem', fontSize: '0.8em', padding: 0 }}
                type="button"
              >
                Forgot password?
              </button>
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
