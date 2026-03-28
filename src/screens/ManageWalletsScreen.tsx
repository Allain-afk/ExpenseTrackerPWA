import { Link } from 'react-router-dom';
import { MdAdd, MdChevronRight, MdCreditCard } from 'react-icons/md';
import { useWallets } from '../hooks/useWallets';
import { useTransactions } from '../hooks/useTransactions';
import { useSettings } from '../hooks/useSettings';
import { PageHeader } from '../components/common/PageHeader';
import { formatMoney, numberToColorHex } from '../lib/utils/format';
import styles from './ManageWalletsScreen.module.css';

export function ManageWalletsScreen() {
  const wallets = useWallets();
  const transactions = useTransactions();
  const settings = useSettings();

  const totalBalance = wallets.wallets.reduce((sum, wallet) => {
    return sum + transactions.getWalletBalance(wallet.id!);
  }, 0);

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

        {wallets.wallets.length ? (
          <>
            <section className={`app-card ${styles.summaryCard}`}>
              <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.76)' }}>
                Total Across Cards
              </p>
              <h2 style={{ marginTop: '0.3rem', fontSize: '2rem', letterSpacing: '-0.06em' }}>
                {formatMoney(totalBalance, settings.currencySymbol)}
              </h2>
              <p style={{ marginTop: '0.35rem', color: 'rgba(255,255,255,0.76)' }}>
                {wallets.wallets.length} card{wallets.wallets.length === 1 ? '' : 's'}
              </p>
            </section>

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
          </>
        ) : (
          <div className="app-card empty-state">
            <h3>No cards set up yet</h3>
            <p>Create your first card to organize transactions by account.</p>
            <Link className="primary-button" style={{ marginTop: '1rem', display: 'inline-flex' }} to="/wallets/new">
              <MdAdd size={18} style={{ marginRight: '0.35rem' }} />
              Add Card
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
