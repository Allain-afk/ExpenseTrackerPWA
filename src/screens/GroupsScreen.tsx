import { Link } from 'react-router-dom';
import { MdAdd, MdChevronRight, MdFolder } from 'react-icons/md';
import { useExpenseGroups } from '../hooks/useExpenseGroups';
import { formatMoney, formatTransactionCount } from '../lib/utils/format';
import { SyncStatusIcon } from '../components/common/SyncStatusIcon';
import styles from './ListScreen.module.css';

interface GroupsScreenProps {
  currencySymbol: string;
}

export function GroupsScreen({ currencySymbol }: GroupsScreenProps) {
  const { getGroupTotal, getGroupTransactions, groups } = useExpenseGroups();

  return (
    <main className="app-page">
      <div className="page-content">
        <header className={styles.headerBar}>
          <div>
            <p className="eyebrow">Spending</p>
            <h1>Categories</h1>
          </div>
          <div className={styles.headerActions}>
            <SyncStatusIcon />
            <Link className="primary-button" to="/groups/new">
              <MdAdd aria-hidden="true" size={18} />
              Add category
            </Link>
          </div>
        </header>

        {groups.length ? (
          <div className="inset-list">
            {groups.map((group) => {
              if (typeof group.id !== 'number') {
                return null;
              }

              const count = getGroupTransactions(group.id).length;
              return (
                <Link className={styles.groupRow} key={group.id} to={`/groups/${group.id}`}>
                  <span className="icon-chip accent-chip">
                    <MdFolder aria-hidden="true" size={22} />
                  </span>
                  <span className="inset-item-content">
                    <span className="inset-title">{group.name}</span>
                    <span className="inset-subtitle">
                      {group.description ? `${group.description} · ` : ''}
                      {formatTransactionCount(count)}
                    </span>
                  </span>
                  <span className={styles.groupValue}>
                    <strong className="numeric-strong">
                      {formatMoney(getGroupTotal(group.id), currencySymbol)}
                    </strong>
                    <MdChevronRight aria-hidden="true" size={22} />
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="app-card empty-state">
            <h3>No spending categories yet</h3>
            <p>Create your first spending category to organize your expenses.</p>
          </div>
        )}
      </div>
    </main>
  );
}
