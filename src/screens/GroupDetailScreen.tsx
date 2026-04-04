import { Link, Navigate, useParams } from 'react-router-dom';
import { MdAdd, MdRefresh } from 'react-icons/md';
import { useExpenseGroups } from '../hooks/useExpenseGroups';
import { useTransactions } from '../hooks/useTransactions';
import { useSettings } from '../hooks/useSettings';
import { PageHeader } from '../components/common/PageHeader';
import { formatMediumDate } from '../lib/utils/date';
import { formatMoney } from '../lib/utils/format';
import styles from './ListScreen.module.css';

export function GroupDetailScreen() {
  const params = useParams();
  const groupId = Number(params.groupId);
  const groups = useExpenseGroups();
  const transactions = useTransactions();
  const settings = useSettings();

  const group = groups.getGroupById(groupId);

  if (!Number.isFinite(groupId)) {
    return <Navigate replace to="/app/groups" />;
  }

  if (!group) {
    return (
      <main className="app-page">
        <div className="app-card empty-state">
          <h3>Category not found</h3>
          <p>The selected category could not be found.</p>
          <Link className="ghost-button" to="/app/groups">
            Back to categories
          </Link>
        </div>
      </main>
    );
  }

  const groupTransactions = groups.getGroupTransactions(groupId);
  const income = groupTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expense = groupTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const balance = income - expense;

  return (
    <main className="app-page">
      <div className="page-content">
        <PageHeader
          action={
            <button className="overlay-close" onClick={() => void transactions.loadTransactions()} type="button">
              <MdRefresh size={18} />
            </button>
          }
          backTo="/app/groups"
          subtitle={group.description || 'No description'}
          title={group.name}
        />

        <section className={`app-card ${styles.heroCard}`}>
          <div className="row-spread">
            <div>
              <p className="eyebrow">Category Total</p>
              <h2 className="numeric-strong" style={{ margin: '0.35rem 0 0', fontSize: '2.2rem' }}>
                {formatMoney(groups.getGroupTotal(groupId), settings.currencySymbol)}
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="eyebrow">Created</p>
              <p style={{ margin: '0.35rem 0 0' }}>{formatMediumDate(group.createdAt)}</p>
            </div>
          </div>
          <div className={styles.heroNumbers}>
            <div>
              <p className="eyebrow">Balance</p>
              <h2>{formatMoney(balance, settings.currencySymbol)}</h2>
            </div>
            <div>
              <p className="eyebrow">Income</p>
              <h2 style={{ color: '#059669' }}>{formatMoney(income, settings.currencySymbol)}</h2>
            </div>
            <div>
              <p className="eyebrow">Expenses</p>
              <h2 style={{ color: '#e11d48' }}>{formatMoney(expense, settings.currencySymbol)}</h2>
            </div>
          </div>
        </section>

        <section className="section-shell">
          <div className="section-header">
            <h2>Transactions ({groupTransactions.length})</h2>
            <p>All income and expense records linked to this category.</p>
          </div>
          {groupTransactions.length ? (
            <div className={styles.transactionList}>
              {groupTransactions.map((transaction) => (
                <Link className={`app-card ${styles.transactionCard}`} key={transaction.id} to={`/transactions/${transaction.id}/edit`}>
                  <div className="row-spread">
                    <div>
                      <h3 style={{ margin: 0 }}>{transaction.description}</h3>
                      <p className="helper-text" style={{ marginTop: '0.3rem' }}>
                        {transaction.category} • {formatMediumDate(transaction.date)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>{formatMoney(transaction.amount, settings.currencySymbol)}</strong>
                      <p className="helper-text" style={{ marginTop: '0.3rem' }}>
                        {transaction.type.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="app-card empty-state">
              <h3>No transactions yet</h3>
              <p>Add your first transaction to this category.</p>
            </div>
          )}
        </section>
      </div>

      <Link className="floating-action" to={`/transactions/new?groupId=${groupId}`}>
        <MdAdd size={28} />
      </Link>
    </main>
  );
}
