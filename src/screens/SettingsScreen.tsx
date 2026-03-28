import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdAttachMoney,
  MdCreditCard,
  MdDeleteForever,
  MdInfoOutline,
  MdMessage,
  MdNotificationsActive,
  MdPersonOutline,
  MdWallet,
} from 'react-icons/md';
import { availableCurrencies } from '../lib/constants/settings';
import { formatMoney } from '../lib/utils/format';
import { requestNotificationPermission } from '../lib/utils/notifications';
import { useSettings } from '../hooks/useSettings';
import { useTransactions } from '../hooks/useTransactions';
import { SectionList } from '../components/common/SectionList';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import styles from './SettingsScreen.module.css';

const versionHistory: Array<{
  version: string;
  title: string;
  description: string;
  latest?: boolean;
}> = [
  {
    version: '1.3.0',
    title: 'Multi-Wallet & Modern UI',
    description:
      '• Introduced Multi-Wallet System with dedicated balances\n• Premium glassmorphic UI overhaul for Dashboard\n• Upgraded Floating Nav Dock\n• Redesigned Settings & Transaction lists',
    latest: true,
  },
  {
    version: '1.2.0',
    title: 'New user UI/UX functionalities',
    description:
      '• Added a notification system for low budget threshold\n• Personalized notifications with user name\n• Customizable notification settings',
  },
  {
    version: '1.0.3',
    title: 'App Animation Feature (Splash Screen) when opened',
    description: '• Beautiful animated splash screen\n• Smooth transitions and loading animations',
  },
  {
    version: '1.0.2',
    title: 'UI and UX Improvements',
    description:
      '• Enhanced user interface design\n• Better user experience\n• Performance optimizations',
  },
  {
    version: '1.0.1',
    title: 'App Icon Update',
    description: '• New and improved app icon\n• Better visual identity',
  },
  {
    version: '1.0.0',
    title: 'Basic Features for Expense Tracking',
    description:
      '• Core expense tracking functionality\n• Transaction management\n• Basic reporting features',
  },
] as const;

export function SettingsScreen() {
  const settings = useSettings();
  const transactions = useTransactions();

  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isThresholdOpen, setIsThresholdOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [thresholdDraft, setThresholdDraft] = useState(String(settings.lowBalanceThreshold));
  const [messageDraft, setMessageDraft] = useState(settings.notificationMessage);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function toggleNotifications(enabled: boolean) {
    if (enabled) {
      await requestNotificationPermission();
    }

    await settings.updateNotificationSettings({ notificationsEnabled: enabled });
  }

  async function resetAllData() {
    await settings.resetAllAppData();
    await transactions.loadTransactions();
    setStatusMessage('All app data has been reset successfully.');
    setIsResetOpen(false);
  }

  return (
    <main className="app-page">
      <div className="page-content">
        <header>
          <p className="eyebrow">Preferences</p>
          <h1 style={{ margin: '0.35rem 0 0', fontSize: '1.85rem', letterSpacing: '-0.06em' }}>
            Settings
          </h1>
        </header>

        <div className={styles.statusWrap}>
          {statusMessage ? <div className="success-banner">{statusMessage}</div> : null}
          {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        </div>

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
        </SectionList>

        <SectionList headerText="Cards & Wallets">
          <Link className="inset-item" to="/wallets">
            <span className="icon-chip" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}>
              <MdCreditCard size={22} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title">Manage Cards</span>
              <span className="inset-subtitle">Add, edit, or remove wallets</span>
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
              <button className="inset-item" onClick={() => setIsThresholdOpen(true)} type="button">
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
              <button className="inset-item" onClick={() => setIsMessageOpen(true)} type="button">
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
            <span className="icon-chip" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}>
              <MdInfoOutline size={22} />
            </span>
            <span className="inset-item-content">
              <span className="inset-title">Version</span>
              <span className="inset-subtitle">1.3.0</span>
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
                onClick={() => {
                  void settings.updateCurrency(currency.code, currency.symbol);
                  setIsCurrencyOpen(false);
                }}
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
            onClick={() => {
              const parsed = Number.parseFloat(thresholdDraft);
              if (Number.isNaN(parsed) || parsed < 0) {
                setErrorMessage('Please enter a valid amount.');
                return;
              }

              setErrorMessage(null);
              void settings.updateNotificationSettings({ lowBalanceThreshold: parsed });
              setIsThresholdOpen(false);
            }}
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
            onClick={() => {
              if (!messageDraft.trim()) {
                setErrorMessage('Please enter a message.');
                return;
              }

              setErrorMessage(null);
              void settings.updateNotificationSettings({ notificationMessage: messageDraft.trim() });
              setIsMessageOpen(false);
            }}
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
            <details className={styles.versionItem} key={version.version} open={version.latest}>
              <summary className={styles.versionSummary}>
                <div>
                  <h3>{version.title}</h3>
                  <p>
                    v{version.version} {version.latest ? '• LATEST' : ''}
                  </p>
                </div>
              </summary>
              <div className={styles.versionContent}>{version.description}</div>
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
    </main>
  );
}
