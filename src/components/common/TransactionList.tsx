import type { ExpenseTransaction } from '../../types/models';
import { formatGroupedDate } from '../../lib/utils/date';
import { SectionList } from './SectionList';
import { TransactionRow } from './TransactionRow';
import styles from './TransactionList.module.css';

interface TransactionListProps {
  transactions: ExpenseTransaction[];
  currencySymbol: string;
  getGroupName?: (groupId: number) => string | undefined;
  onSelect: (transaction: ExpenseTransaction) => void;
  emptyState?: React.ReactNode;
}

export function TransactionList({
  transactions,
  currencySymbol,
  getGroupName,
  onSelect,
  emptyState,
}: TransactionListProps) {
  if (!transactions.length) {
    return <>{emptyState ?? null}</>;
  }

  const grouped = transactions.reduce<Record<string, ExpenseTransaction[]>>((result, transaction) => {
    const label = formatGroupedDate(transaction.date);
    result[label] ??= [];
    result[label].push(transaction);
    return result;
  }, {});

  return (
    <div className={styles.groupedList}>
      {Object.entries(grouped).map(([label, items]) => (
        <SectionList headerText={label} key={label}>
          {items.map((transaction) => (
            <TransactionRow
              currencySymbol={currencySymbol}
              groupName={typeof transaction.groupId === 'number' ? getGroupName?.(transaction.groupId) : undefined}
              key={transaction.id ?? `${transaction.description}-${transaction.date.toISOString()}`}
              onSelect={onSelect}
              transaction={transaction}
            />
          ))}
        </SectionList>
      ))}
    </div>
  );
}
