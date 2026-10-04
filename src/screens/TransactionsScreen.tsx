import { useDeferredValue, useMemo, useState } from 'react';
import { MdSearch } from 'react-icons/md';
import { useTransactions } from '../hooks/useTransactions';
import { useExpenseGroups } from '../hooks/useExpenseGroups';
import { useWallets } from '../hooks/useWallets';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';
import { filterTransactions } from '../lib/utils/transactionSearch';
import type { ExpenseTransaction } from '../types/models';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SyncStatusIcon } from '../components/common/SyncStatusIcon';
import { TransactionDetailSheet } from '../components/common/TransactionDetailSheet';
import { TransactionList } from '../components/common/TransactionList';
import styles from './ListScreen.module.css';

interface TransactionsScreenProps {
  currencySymbol: string;
}

type TransactionFilter = 'All' | 'Income' | 'Expense';

export function TransactionsScreen({ currencySymbol }: TransactionsScreenProps) {
  const { deleteTransaction, transactions } = useTransactions();
  const { getGroupById } = useExpenseGroups();
  const { getWalletById } = useWallets();
  const [selectedFilter, setSelectedFilter] = useState<TransactionFilter>('All');
  const [query, setQuery] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<number | null>(null);
  const deferredFilter = useDeferredValue(selectedFilter);
  const deferredQuery = useDeferredValue(query);

  const filteredTransactions = useMemo(
    () => filterTransactions({
      transactions,
      type: deferredFilter,
      query: deferredQuery,
      getWalletName: (walletId) => getWalletById(walletId)?.name,
      getGroupName: (groupId) => getGroupById(groupId)?.name,
    }),
    [deferredFilter, deferredQuery, getGroupById, getWalletById, transactions],
  );

  const selectedTransaction = selectedTransactionId === null
    ? undefined
    : transactions.find((transaction) => transaction.id === selectedTransactionId);
  const deleteCandidate = deleteCandidateId === null
    ? undefined
    : transactions.find((transaction) => transaction.id === deleteCandidateId);

  function selectTransaction(transaction: ExpenseTransaction) {
    if (typeof transaction.id === 'number') {
      setSelectedTransactionId(transaction.id);
    }
  }

  function clearSearchAndFilters() {
    setQuery('');
    setSelectedFilter('All');
  }

  return (
    <main className="app-page">
      <div className="page-content">
        <header className={styles.headerBar}>
          <div>
            <p className="eyebrow">History</p>
            <h1>Transactions</h1>
          </div>
          <SyncStatusIcon />
        </header>

        <section aria-label="Search and filter transactions" className={styles.searchPanel}>
          <label className={styles.searchField}>
            <MdSearch aria-hidden="true" size={21} />
            <input
              aria-label="Search transactions"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search transactions"
              type="search"
              value={query}
            />
          </label>

          <div aria-label="Transaction type" className="pill-row" role="group">
            {(['All', 'Income', 'Expense'] as const).map((filter) => (
              <button
                aria-pressed={selectedFilter === filter}
                className={`filter-pill ${selectedFilter === filter ? 'active' : ''}`}
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        <TransactionList
          currencySymbol={currencySymbol}
          emptyState={(
            <div className="app-card empty-state">
              <h3>{transactions.length ? 'No matching transactions' : 'No transactions yet'}</h3>
              <p>
                {transactions.length
                  ? 'Try a different search or clear the active filters.'
                  : 'Add income or an expense to start your history.'}
              </p>
              {transactions.length ? (
                <button className="secondary-button" onClick={clearSearchAndFilters} type="button">
                  Clear search and filters
                </button>
              ) : null}
            </div>
          )}
          getGroupName={(groupId) => getGroupById(groupId)?.name}
          onSelect={selectTransaction}
          transactions={filteredTransactions}
        />
      </div>

      {selectedTransaction && typeof selectedTransaction.id === 'number' ? (
        <TransactionDetailSheet
          currencySymbol={currencySymbol}
          editTo={`/transactions/${selectedTransaction.id}/edit`}
          groupName={typeof selectedTransaction.groupId === 'number'
            ? getGroupById(selectedTransaction.groupId)?.name
            : undefined}
          onClose={() => setSelectedTransactionId(null)}
          onDelete={() => setDeleteCandidateId(selectedTransaction.id ?? null)}
          transaction={selectedTransaction}
          walletName={typeof selectedTransaction.walletId === 'number'
            ? getWalletById(selectedTransaction.walletId)?.name
            : undefined}
        />
      ) : null}

      <ConfirmDialog
        confirmLabel="Delete"
        description="This transaction will be permanently removed."
        onClose={() => setDeleteCandidateId(null)}
        onConfirm={async () => {
          if (deleteCandidateId === null) {
            return;
          }

          try {
            await deleteTransaction(deleteCandidateId);
            showSuccessToast(
              'Transaction deleted',
              deleteCandidate?.description ?? 'The transaction was removed.',
            );
            setDeleteCandidateId(null);
            setSelectedTransactionId(null);
          } catch (error) {
            const message = error instanceof Error
              ? error.message
              : 'We could not delete the transaction.';
            showErrorToast('Delete failed', message);
          }
        }}
        open={deleteCandidateId !== null}
        title="Delete transaction"
        tone="danger"
      />
    </main>
  );
}
