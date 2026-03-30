import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdDeleteOutline, MdEdit, MdFilterList, MdFolder } from 'react-icons/md';
import { useTransactions } from '../hooks/useTransactions';
import { useExpenseGroups } from '../hooks/useExpenseGroups';
import { TransactionTypeIcon } from '../components/common/TransactionTypeIcon';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';
import { formatGroupedDate } from '../lib/utils/date';
import { formatMoney } from '../lib/utils/format';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SectionList } from '../components/common/SectionList';
import { SyncStatusIcon } from '../components/common/SyncStatusIcon';
import styles from './ListScreen.module.css';

interface TransactionsScreenProps {
  currencySymbol: string;
}

export function TransactionsScreen({ currencySymbol }: TransactionsScreenProps) {
  const { deleteTransaction, transactions } = useTransactions();
  const { getGroupById } = useExpenseGroups();
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Income' | 'Expense'>('All');
  const [deleteCandidateId, setDeleteCandidateId] = useState<number | null>(null);
  const deferredFilter = useDeferredValue(selectedFilter);
  const deleteCandidate = deleteCandidateId
    ? transactions.find((transaction) => transaction.id === deleteCandidateId)
    : undefined;

  const filteredTransactions = transactions.filter((transaction) => {
    if (deferredFilter === 'All') {
      return true;
    }

    return transaction.type === deferredFilter.toLowerCase();
  });

  const groupedTransactions = filteredTransactions.reduce<Record<string, typeof transactions>>(
    (groups, transaction) => {
      const key = formatGroupedDate(transaction.date);
      groups[key] ??= [];
      groups[key].push(transaction);
      return groups;
    },
    {},
  );

  return (
    <main className="app-page">
      <div className="page-content">
        <header className={styles.headerBar}>
          <div>
            <p className="eyebrow">History</p>
            <h1>Transactions</h1>
          </div>
          <div className="inline-actions" style={{ gap: '0.6rem' }}>
            <SyncStatusIcon />
            <span className="icon-chip accent-chip">
              <MdFilterList size={24} />
            </span>
          </div>
        </header>

        <div className="pill-row">
          {(['All', 'Income', 'Expense'] as const).map((filter) => (
            <button
              className={`filter-pill ${selectedFilter === filter ? 'active' : ''}`}
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>

        {filteredTransactions.length ? (
          <div className={styles.groupedStack}>
            {Object.entries(groupedTransactions).map(([groupLabel, items]) => (
              <SectionList headerText={groupLabel} key={groupLabel}>
                {items.map((transaction) => {
                  const group = transaction.groupId ? getGroupById(transaction.groupId) : undefined;
                  return (
                    <div className="inset-item" key={transaction.id}>
                      <TransactionTypeIcon type={transaction.type} />
                      <span className="inset-item-content">
                        <span className="inset-title">{transaction.description}</span>
                        <span className="inset-subtitle">{transaction.category}</span>
                        {group ? (
                          <span className="tag tag-blue" style={{ marginTop: '0.45rem' }}>
                            <MdFolder size={13} />
                            {group.name}
                          </span>
                        ) : null}
                      </span>
                      <div className={styles.amountCell}>
                        <strong>{formatMoney(transaction.amount, currencySymbol)}</strong>
                        <div className={styles.tinyActions}>
                          <Link className={styles.iconAction} to={`/transactions/${transaction.id}/edit`}>
                            <MdEdit size={18} />
                          </Link>
                          <button
                            className={styles.iconAction}
                            onClick={() => setDeleteCandidateId(transaction.id ?? null)}
                            type="button"
                          >
                            <MdDeleteOutline size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </SectionList>
            ))}
          </div>
        ) : (
          <div className="app-card empty-state">
            <h3>No transactions found</h3>
            <p>
              {selectedFilter === 'All'
                ? 'Start by adding your first transaction.'
                : `No ${selectedFilter.toLowerCase()} transactions found.`}
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this transaction?"
        onClose={() => setDeleteCandidateId(null)}
        onConfirm={async () => {
          try {
            if (deleteCandidateId) {
              await deleteTransaction(deleteCandidateId);
              showSuccessToast(
                'Transaction deleted',
                deleteCandidate?.description ?? 'The transaction was removed.',
              );
            }
            setDeleteCandidateId(null);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'We could not delete the transaction.';
            showErrorToast('Delete failed', message);
          }
        }}
        open={deleteCandidateId !== null}
        title="Delete Transaction"
        tone="danger"
      />
    </main>
  );
}
