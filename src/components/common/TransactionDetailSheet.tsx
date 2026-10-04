import { Link } from 'react-router-dom';
import { MdDeleteOutline, MdEdit } from 'react-icons/md';
import type { ExpenseTransaction } from '../../types/models';
import { formatMediumDate } from '../../lib/utils/date';
import { formatMoney } from '../../lib/utils/format';
import { Modal } from './Modal';
import { TransactionTypeIcon } from './TransactionTypeIcon';
import styles from './TransactionList.module.css';

interface TransactionDetailSheetProps {
  transaction: ExpenseTransaction;
  currencySymbol: string;
  editTo: string;
  walletName?: string;
  groupName?: string;
  onClose: () => void;
  onDelete: () => void;
}

export function TransactionDetailSheet({
  transaction,
  currencySymbol,
  editTo,
  walletName,
  groupName,
  onClose,
  onDelete,
}: TransactionDetailSheetProps) {
  const sign = transaction.type === 'income' ? '+' : '-';

  return (
    <Modal
      description={formatMediumDate(transaction.date)}
      onClose={onClose}
      open
      title="Transaction details"
      variant="sheet"
    >
      <div className={styles.detailLayout}>
        <div className={styles.detailHero}>
          <TransactionTypeIcon dimension="3rem" size={22} type={transaction.type} />
          <div>
            <h3>{transaction.description}</h3>
            <strong className={`${styles.detailAmount} ${styles[transaction.type]}`}>
              {sign}{formatMoney(transaction.amount, currencySymbol)}
            </strong>
          </div>
        </div>

        <dl className={styles.detailGrid}>
          <div><dt>Type</dt><dd>{transaction.type === 'income' ? 'Income' : 'Expense'}</dd></div>
          <div><dt>Category</dt><dd>{transaction.category}</dd></div>
          {walletName ? <div><dt>Wallet</dt><dd>{walletName}</dd></div> : null}
          {groupName ? <div><dt>Spending category</dt><dd>{groupName}</dd></div> : null}
          <div><dt>Date</dt><dd>{formatMediumDate(transaction.date)}</dd></div>
        </dl>

        <div className={styles.detailActions}>
          <Link className="secondary-button" onClick={onClose} to={editTo}>
            <MdEdit aria-hidden="true" size={18} />
            Edit transaction
          </Link>
          <button className="danger-button" onClick={onDelete} type="button">
            <MdDeleteOutline aria-hidden="true" size={18} />
            Delete transaction
          </button>
        </div>
      </div>
    </Modal>
  );
}
