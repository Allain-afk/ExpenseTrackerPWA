import { MdChevronRight } from 'react-icons/md';
import type { ExpenseTransaction } from '../../types/models';
import { formatMoney } from '../../lib/utils/format';
import { TransactionTypeIcon } from './TransactionTypeIcon';
import styles from './TransactionList.module.css';

interface TransactionRowProps {
  transaction: ExpenseTransaction;
  currencySymbol: string;
  groupName?: string;
  onSelect: (transaction: ExpenseTransaction) => void;
}

export function TransactionRow({ transaction, currencySymbol, groupName, onSelect }: TransactionRowProps) {
  const sign = transaction.type === 'income' ? '+' : '-';
  const amount = `${sign}${formatMoney(transaction.amount, currencySymbol)}`;

  return (
    <button
      aria-label={`${transaction.description}, ${transaction.category}, ${amount}`}
      className={`${styles.row} interactive-row`}
      onClick={() => onSelect(transaction)}
      type="button"
    >
      <TransactionTypeIcon type={transaction.type} />
      <span className={styles.rowCopy}>
        <span className={styles.rowTitle}>{transaction.description}</span>
        <span className={styles.rowMeta}>
          {transaction.category}{groupName ? ` · ${groupName}` : ''}
        </span>
      </span>
      <strong className={`${styles.amount} ${styles[transaction.type]}`}>{amount}</strong>
      <MdChevronRight aria-hidden="true" className={styles.chevron} size={20} />
    </button>
  );
}
