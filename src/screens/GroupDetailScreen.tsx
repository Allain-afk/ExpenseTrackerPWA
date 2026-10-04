import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { MdAdd, MdDeleteOutline, MdEdit, MdRefresh } from 'react-icons/md';
import { useExpenseGroups } from '../hooks/useExpenseGroups';
import { useTransactions } from '../hooks/useTransactions';
import { useSettings } from '../hooks/useSettings';
import { useWallets } from '../hooks/useWallets';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { TransactionDetailSheet } from '../components/common/TransactionDetailSheet';
import { TransactionList } from '../components/common/TransactionList';
import { formatMediumDate } from '../lib/utils/date';
import { formatMoney } from '../lib/utils/format';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';
import type { ExpenseTransaction } from '../types/models';
import styles from './ListScreen.module.css';

export function GroupDetailScreen() {
  const navigate = useNavigate();
  const params = useParams();
  const groupId = Number(params.groupId);
  const groups = useExpenseGroups();
  const transactions = useTransactions();
  const settings = useSettings();
  const wallets = useWallets();
  const [deleteCategoryOpen, setDeleteCategoryOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [deleteTransactionId, setDeleteTransactionId] = useState<number | null>(null);

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
          <Link className="ghost-button" to="/app/groups">Back to categories</Link>
        </div>
      </main>
    );
  }

  const groupTransactions = groups.getGroupTransactions(groupId);
  const selectedTransaction = selectedTransactionId === null
    ? undefined
    : groupTransactions.find((transaction) => transaction.id === selectedTransactionId);
  const transactionToDelete = deleteTransactionId === null
    ? undefined
    : groupTransactions.find((transaction) => transaction.id === deleteTransactionId);
  const income = groupTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expense = groupTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const balance = income - expense;

  function selectTransaction(transaction: ExpenseTransaction) {
    if (typeof transaction.id === 'number') {
      setSelectedTransactionId(transaction.id);
    }
  }

  return (
    <main className="app-page">
      <div className="page-content">
        <PageHeader
          action={(
            <button
              aria-label="Refresh transactions"
              className="overlay-close"
              onClick={() => void transactions.loadTransactions()}
              type="button"
            >
              <MdRefresh aria-hidden="true" size={18} />
            </button>
          )}
          backTo="/app/groups"
          subtitle={group.description || 'No description'}
          title={group.name}
        />

        <div className={styles.detailActions}>
          <Link className="primary-button" to={`/transactions/new?groupId=${groupId}`}>
            <MdAdd aria-hidden="true" size={18} />
            Add transaction
          </Link>
          <Link className="secondary-button" to={`/groups/${groupId}/edit`}>
            <MdEdit aria-hidden="true" size={18} />
            Edit category
          </Link>
          <button className="danger-button" onClick={() => setDeleteCategoryOpen(true)} type="button">
            <MdDeleteOutline aria-hidden="true" size={18} />
            Delete category
          </button>
        </div>

        <section className={`app-card ${styles.heroCard}`}>
          <div className="row-spread">
            <div>
              <p className="eyebrow">Category total</p>
              <h2 className={`${styles.categoryTotal} numeric-strong`}>
                {formatMoney(groups.getGroupTotal(groupId), settings.currencySymbol)}
              </h2>
            </div>
            <div className={styles.alignEnd}>
              <p className="eyebrow">Created</p>
              <p className={styles.summaryValue}>{formatMediumDate(group.createdAt)}</p>
            </div>
          </div>
          <div className={styles.heroNumbers}>
            <div><p className="eyebrow">Balance</p><h2>{formatMoney(balance, settings.currencySymbol)}</h2></div>
            <div><p className="eyebrow">Income</p><h2 className={styles.incomeValue}>{formatMoney(income, settings.currencySymbol)}</h2></div>
            <div><p className="eyebrow">Expenses</p><h2 className={styles.expenseValue}>{formatMoney(expense, settings.currencySymbol)}</h2></div>
          </div>
        </section>

        <section className="section-shell">
          <div className="section-header">
            <div>
              <h2>Transactions ({groupTransactions.length})</h2>
              <p>Income and expenses assigned to this category.</p>
            </div>
          </div>
          <TransactionList
            currencySymbol={settings.currencySymbol}
            emptyState={(
              <div className="app-card empty-state">
                <h3>No transactions yet</h3>
                <p>Add your first transaction to this category.</p>
              </div>
            )}
            getGroupName={() => group.name}
            onSelect={selectTransaction}
            transactions={groupTransactions}
          />
        </section>
      </div>

      {selectedTransaction && typeof selectedTransaction.id === 'number' ? (
        <TransactionDetailSheet
          currencySymbol={settings.currencySymbol}
          editTo={`/transactions/${selectedTransaction.id}/edit`}
          groupName={group.name}
          onClose={() => setSelectedTransactionId(null)}
          onDelete={() => setDeleteTransactionId(selectedTransaction.id ?? null)}
          transaction={selectedTransaction}
          walletName={typeof selectedTransaction.walletId === 'number'
            ? wallets.getWalletById(selectedTransaction.walletId)?.name
            : undefined}
        />
      ) : null}

      <ConfirmDialog
        confirmLabel="Delete"
        description={`Delete "${group.name}"? Transactions will remain but will no longer belong to this category.`}
        onClose={() => setDeleteCategoryOpen(false)}
        onConfirm={async () => {
          try {
            await groups.deleteExpenseGroup(groupId);
            showSuccessToast('Category deleted', group.name);
            setDeleteCategoryOpen(false);
            navigate('/app/groups', { replace: true });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'We could not delete the category.';
            showErrorToast('Delete failed', message);
          }
        }}
        open={deleteCategoryOpen}
        title="Delete category"
        tone="danger"
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="This transaction will be permanently removed."
        onClose={() => setDeleteTransactionId(null)}
        onConfirm={async () => {
          if (deleteTransactionId === null) return;
          try {
            await transactions.deleteTransaction(deleteTransactionId);
            showSuccessToast('Transaction deleted', transactionToDelete?.description ?? 'Transaction removed.');
            setDeleteTransactionId(null);
            setSelectedTransactionId(null);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'We could not delete the transaction.';
            showErrorToast('Delete failed', message);
          }
        }}
        open={deleteTransactionId !== null}
        title="Delete transaction"
        tone="danger"
      />
    </main>
  );
}
