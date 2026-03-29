import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdAccountBalanceWallet, MdAdd, MdChevronRight, MdCreditCard, MdVisibilityOff } from 'react-icons/md';
import { useWallets } from '../hooks/useWallets';
import { useTransactions } from '../hooks/useTransactions';
import { useSettings } from '../hooks/useSettings';
import { PageHeader } from '../components/common/PageHeader';
import { Modal } from '../components/common/Modal';
import { MainWalletForm } from '../components/forms/MainWalletForm';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';
import { formatMoney, numberToColorHex } from '../lib/utils/format';
import styles from './ManageWalletsScreen.module.css';

export function ManageWalletsScreen() {
  const wallets = useWallets();
  const transactions = useTransactions();
  const settings = useSettings();
  const [isMainWalletOpen, setIsMainWalletOpen] = useState(false);

  const totalBalance = wallets.wallets.reduce((sum, wallet) => {
    return sum + transactions.getWalletBalance(wallet.id!);
  }, 0);
  const mainWalletBalance =
    wallets.wallets.length === 0 ? transactions.balance : totalBalance;
  const cardCount = wallets.wallets.length + 1;
  const hiddenCount =
    wallets.wallets.filter((wallet) => wallet.isHidden).length +
    (settings.mainWalletHidden ? 1 : 0);
  const mainCardGradient = `linear-gradient(135deg, ${numberToColorHex(settings.mainWalletColor)} 0%, rgba(255,255,255,0.24) 180%)`;

  return (
    <main className="app-page">
      <div className="page-content">
        <PageHeader
          action={
            <Link className="primary-button" to="/wallets/new">
              <MdAdd size={18} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
              Add Card
            </Link>
          }
          backTo="/app/settings"
          title="Manage Cards"
        />

        <button
          className={`app-card ${styles.summaryCard}`}
          onClick={() => setIsMainWalletOpen(true)}
          style={{ background: mainCardGradient, textAlign: 'left', width: '100%' }}
          type="button"
        >
          <div className={styles.summaryHeader}>
            <span className={styles.summaryBadge}>
              <MdAccountBalanceWallet size={16} />
              Main Card
            </span>
            <span className={styles.summaryChevron}>
              <MdChevronRight size={22} />
            </span>
          </div>

          <p className={styles.summaryLabel}>Combined balance card</p>
          <h2>{formatMoney(mainWalletBalance, settings.currencySymbol)}</h2>

          <div className={styles.summaryFooter}>
            <div>
              <p className={styles.summaryName}>{settings.mainWalletName}</p>
              <p className={styles.summaryMeta}>
                {cardCount} card{cardCount === 1 ? '' : 's'}
                {hiddenCount ? ` | ${hiddenCount} hidden on Home` : ''}
              </p>
            </div>
            {settings.mainWalletHidden ? (
              <span className={`tag ${styles.summaryTag}`}>
                <MdVisibilityOff size={13} />
                Hidden on Home
              </span>
            ) : null}
          </div>
        </button>

        <div className={styles.walletList}>
          {wallets.wallets.map((wallet) => (
            <Link className={`app-card ${styles.walletCard}`} key={wallet.id} to={`/wallets/${wallet.id}/edit`}>
              <div className="row-spread">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span
                    className="icon-chip"
                    style={{ background: numberToColorHex(wallet.colorValue), color: 'white' }}
                  >
                    <MdCreditCard size={22} />
                  </span>
                  <div>
                    <h3 style={{ margin: 0 }}>{wallet.name}</h3>
                    <p className="helper-text" style={{ marginTop: '0.35rem' }}>
                      {wallet.type}
                    </p>
                    {wallet.isHidden ? (
                      <span className={`tag ${styles.hiddenTag}`}>
                        <MdVisibilityOff size={13} />
                        Hidden on Home
                      </span>
                    ) : null}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <strong>{formatMoney(transactions.getWalletBalance(wallet.id!), settings.currencySymbol)}</strong>
                  <MdChevronRight className="muted" size={22} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {wallets.wallets.length === 0 ? (
          <div className="app-card empty-state">
            <h3>No additional cards yet</h3>
            <p>Your main card is ready. Add another card to separate balances by account.</p>
            <Link className="primary-button" style={{ marginTop: '1rem', display: 'inline-flex' }} to="/wallets/new">
              <MdAdd size={18} style={{ marginRight: '0.35rem' }} />
              Add Card
            </Link>
          </div>
        ) : null}
      </div>

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
