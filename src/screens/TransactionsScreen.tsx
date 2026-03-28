import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router-dom';
import { MdDeleteOutline, MdEdit, MdFilterList, MdFolder } from 'react-icons/md';
import { useTransactions } from '../hooks/useTransactions';
import { useExpenseGroups } from '../hooks/useExpenseGroups';
import { formatGroupedDate } from '../lib/utils/date';
import { formatMoney } from '../lib/utils/format';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SectionList } from '../components/common/SectionList';
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
          <span className="icon-chip" style={{ background: 'rgba(37,99,235,0.12)', color: '#1d4ed8' }}>
            <MdFilterList size={24} />
          </span>
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
                  const isIncome = transaction.type === 'income';
                  return (
                    <div className="inset-item" key={transaction.id}>
                      <span
                        className="icon-chip"
                        style={{
                          background: isIncome ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                          color: isIncome ? '#059669' : '#e11d48',
                        }}
                      >
                        ₱
                      </span>
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
          if (deleteCandidateId) {
            await deleteTransaction(deleteCandidateId);
          }
          setDeleteCandidateId(null);
        }}
        open={deleteCandidateId !== null}
        title="Delete Transaction"
        tone="danger"
      />
    </main>
  );
}
