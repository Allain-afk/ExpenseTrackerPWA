import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MdAccountBalanceWallet,
  MdAddCard,
  MdArrowOutward,
  MdCreditCard,
  MdRefresh,
  MdSavings,
} from 'react-icons/md';
import { useTransactions } from '../hooks/useTransactions';
import { useWallets } from '../hooks/useWallets';
import { useSettings } from '../hooks/useSettings';
import { MainWalletForm } from '../components/forms/MainWalletForm';
import { TransactionTypeIcon } from '../components/common/TransactionTypeIcon';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';
import { numberToColorHex, formatMoney } from '../lib/utils/format';
import { formatShortDate } from '../lib/utils/date';
import { moneySavingTips } from '../lib/constants/moneySavingTips';
import { SectionList } from '../components/common/SectionList';
import { Modal } from '../components/common/Modal';
import { SyncStatusIcon } from '../components/common/SyncStatusIcon';
import styles from './HomeScreen.module.css';

interface HomeScreenProps {
  currencySymbol: string;
}

function gradientForColor(colorValue: number): string {
  const base = numberToColorHex(colorValue);
  return `linear-gradient(135deg, ${base} 0%, rgba(255,255,255,0.18) 180%)`;
}

function getDailyTipIndex(date: Date, tipCount: number): number {
  const localDayAsUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(localDayAsUtc / 86400000) % tipCount;
}

export function HomeScreen({ currencySymbol }: HomeScreenProps) {
  const navigate = useNavigate();
  const transactions = useTransactions();
  const wallets = useWallets();
  const settings = useSettings();

  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [isMainWalletOpen, setIsMainWalletOpen] = useState(false);
  const visibleWallets = wallets.wallets.filter((wallet) => !wallet.isHidden);
  const hiddenWalletCount = wallets.wallets.length - visibleWallets.length;

  const totalWalletBalance = wallets.wallets.reduce((sum, wallet) => {
    return sum + transactions.getWalletBalance(wallet.id!);
  }, 0);

  const mainWalletBalance =
    wallets.wallets.length === 0 ? transactions.balance : totalWalletBalance;

  const selectedWallet = selectedWalletId
    ? wallets.getWalletById(selectedWalletId)
    : undefined;
  const dailyTipIndex = getDailyTipIndex(new Date(), moneySavingTips.length);
  const dailyTip = moneySavingTips[dailyTipIndex];
  const recentTransactions = transactions.transactions.slice(0, 5);

  async function refreshHome(): Promise<void> {
    await Promise.all([transactions.loadTransactions(), wallets.loadWallets()]);
  }

  function openMainWalletEditor() {
    setIsMainWalletOpen(true);
  }

  return (
    <main className="app-page">
      <div className="page-content">
        <header className={styles.header}>
          <div className={styles.greeting}>
            <p className="muted">Welcome back,</p>
            <h1>{settings.userName || 'User'}</h1>
          </div>
          <div className="inline-actions" style={{ gap: '0.55rem' }}>
            <SyncStatusIcon />
            <button className="overlay-close" onClick={() => void refreshHome()} type="button">
              <MdRefresh size={20} />
            </button>
          </div>
        </header>

        <div className="scroll-row">
          {!settings.mainWalletHidden ? (
            <button
              className={`${styles.walletCard} app-card`}
              onClick={openMainWalletEditor}
              style={{ background: gradientForColor(settings.mainWalletColor), border: 'none' }}
              type="button"
            >
              <div className={styles.walletCardInner}>
                <div className={styles.walletTopRow}>
                  <span className={styles.walletBadge}>
                    <MdAccountBalanceWallet size={16} />
                    All Wallets
                  </span>
                  <span className="overlay-close" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                    <MdArrowOutward size={18} />
                  </span>
                </div>
                <p className={styles.walletBalanceLabel}>Available Balance</p>
                <h2 className={styles.walletBalance}>{formatMoney(mainWalletBalance, currencySymbol)}</h2>
                <div className={styles.walletFooter}>
                  <div>
                    <p className={styles.walletName}>{settings.mainWalletName}</p>
                    <p className={styles.walletHint}>
                      {hiddenWalletCount > 0 ? `${hiddenWalletCount} hidden on Home` : 'Tap to manage'}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          ) : null}

          {visibleWallets.map((wallet) => (
            <button
              className={`${styles.walletCard} app-card`}
              key={wallet.id}
              onClick={() => setSelectedWalletId(wallet.id ?? null)}
              style={{ background: gradientForColor(wallet.colorValue), border: 'none' }}
              type="button"
            >
              <div className={styles.walletCardInner}>
                <div className={styles.walletTopRow}>
                  <span className={styles.walletBadge}>
                    <MdCreditCard size={16} />
                    {wallet.type.toUpperCase()}
                  </span>
                  <span className="overlay-close" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                    <MdArrowOutward size={18} />
                  </span>
                </div>
                <p className={styles.walletBalanceLabel}>Available Balance</p>
                <h2 className={styles.walletBalance}>
                  {formatMoney(transactions.getWalletBalance(wallet.id!), currencySymbol)}
                </h2>
                <div className={styles.walletFooter}>
                  <div>
                    <p className={styles.walletName}>{wallet.name}</p>
                    <p className={styles.walletHint}>Tap to manage</p>
                  </div>
                </div>
              </div>
            </button>
          ))}

          <Link className={`app-card ${styles.addTile}`} to="/wallets/new">
            <span
              className="icon-chip accent-chip-solid"
              style={{ width: '3.4rem', height: '3.4rem' }}
            >
              <MdAddCard size={28} />
            </span>
            <div>
              <h2 style={{ margin: 0 }}>Add Card</h2>
              <p className="helper-text" style={{ marginTop: '0.45rem' }}>
                Create another wallet with its own balance and color theme.
              </p>
            </div>
          </Link>
        </div>

        <SectionList
          footerText="A new money-saving tip appears every day."
          headerText="Money Saving Tip"
        >
          <div className={`inset-item ${styles.tipItem}`}>
            <span className={`icon-chip ${styles.tipIcon}`}>
              <MdSavings size={22} />
            </span>
            <div className={styles.tipCopy}>
              <div className={styles.tipHeader}>
                <span className="inset-title">{dailyTip.title}</span>
                <span className={`tag ${styles.tipTag}`}>Tip of the Day</span>
              </div>
              <p className={styles.tipDescription}>{dailyTip.description}</p>
            </div>
          </div>
        </SectionList>

        <SectionList headerText="Recent Transactions">
          {recentTransactions.length ? (
            recentTransactions.map((transaction) => {
              return (
                <div className="inset-item" key={transaction.id}>
                  <TransactionTypeIcon
                    dimension="2.35rem"
                    size={17}
                    type={transaction.type}
                    variant="subtle"
                  />
                  <span className="inset-item-content">
                    <span className="inset-title">{transaction.description}</span>
                    <span className="inset-subtitle">
                      {transaction.category} • {formatShortDate(transaction.date)}
                    </span>
                  </span>
                  <strong className={styles.sectionValue}>
                    {formatMoney(transaction.amount, currencySymbol)}
                  </strong>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <h3>No transactions yet</h3>
              <p>Start by adding your first transaction.</p>
            </div>
          )}
        </SectionList>
      </div>

      <Modal
        description={selectedWallet ? selectedWallet.type : undefined}
        onClose={() => setSelectedWalletId(null)}
        open={Boolean(selectedWallet)}
        title={selectedWallet?.name ?? ''}
        variant="sheet"
      >
        {selectedWallet ? (
          <div className="stack-form">
            <button
              className="inset-item"
              onClick={() => {
                setSelectedWalletId(null);
                navigate(`/transactions/new?walletId=${selectedWallet.id}&type=income`);
              }}
              type="button"
            >
              <TransactionTypeIcon dimension="2.9rem" size={22} type="income" />
              <span className="inset-item-content">
                <span className="inset-title">Add Income</span>
                <span className="inset-subtitle">Record money coming into this card</span>
              </span>
            </button>
            <button
              className="inset-item"
              onClick={() => {
                setSelectedWalletId(null);
                navigate(`/transactions/new?walletId=${selectedWallet.id}&type=expense`);
              }}
              type="button"
            >
              <TransactionTypeIcon dimension="2.9rem" size={22} type="expense" />
              <span className="inset-item-content">
                <span className="inset-title">Deduct Money</span>
                <span className="inset-subtitle">Record an expense for this card</span>
              </span>
            </button>
            <button
              className="inset-item"
              onClick={() => {
                setSelectedWalletId(null);
                navigate(`/wallets/${selectedWallet.id}/edit`);
              }}
              type="button"
            >
              <span className="icon-chip accent-chip">
                <MdCreditCard size={24} />
              </span>
              <span className="inset-item-content">
                <span className="inset-title">Manage Card</span>
                <span className="inset-subtitle">Edit the name, type, color, and visibility</span>
              </span>
            </button>
          </div>
        ) : null}
      </Modal>

      <Modal
        description="Update the label, accent color, and visibility for your combined balance card."
        onClose={() => setIsMainWalletOpen(false)}
        open={isMainWalletOpen}
        title="Edit Main Card"
      >
        <MainWalletForm
          initialColor={settings.mainWalletColor}
          initialHidden={settings.mainWalletHidden}
          initialName={settings.mainWalletName}
          onSubmit={async ({ mainWalletColor, mainWalletHidden, mainWalletName }) => {
            try {
              await settings.updateMainWallet({
                mainWalletName,
                mainWalletColor,
                mainWalletHidden,
              });
              setIsMainWalletOpen(false);
              showSuccessToast(
                'Main card updated',
                mainWalletHidden
                  ? `${mainWalletName} is now hidden on Home.`
                  : `${mainWalletName} is visible on Home.`,
              );
            } catch (error) {
              const message = error instanceof Error ? error.message : 'We could not update the main card.';
              showErrorToast('Main card update failed', message);
            }
          }}
        />
      </Modal>
    </main>
  );
}
