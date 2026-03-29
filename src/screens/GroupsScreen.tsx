import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdAdd, MdDeleteOutline, MdEdit, MdFolder } from 'react-icons/md';
import { useExpenseGroups } from '../hooks/useExpenseGroups';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';
import { formatMoney, formatTransactionCount } from '../lib/utils/format';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import styles from './ListScreen.module.css';

interface GroupsScreenProps {
  currencySymbol: string;
}

export function GroupsScreen({ currencySymbol }: GroupsScreenProps) {
  const { deleteExpenseGroup, getGroupTotal, getGroupTransactions, groups } = useExpenseGroups();
  const [deleteCandidateId, setDeleteCandidateId] = useState<number | null>(null);

  const deleteCandidate = deleteCandidateId
    ? groups.find((group) => group.id === deleteCandidateId)
    : undefined;

  return (
    <main className="app-page">
      <div className="page-content">
        <header className={styles.headerBar}>
          <div>
            <p className="eyebrow">Organization</p>
            <h1>Groups</h1>
          </div>
          <Link className="primary-button" to="/groups/new">
            <MdAdd size={18} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
            Add Group
          </Link>
        </header>

        {groups.length ? (
          <div className="inset-list">
            {groups.map((group) => (
              <div className="inset-item" key={group.id}>
                <Link
                  className="icon-chip"
                  style={{ background: 'rgba(37,99,235,0.1)', color: '#1d4ed8' }}
                  to={`/groups/${group.id}`}
                >
                  <MdFolder size={22} />
                </Link>
                <Link className="inset-item-content" to={`/groups/${group.id}`}>
                  <span className="inset-title">{group.name}</span>
                  <span className="inset-subtitle">
                    {(group.description && `${group.description} • `) || ''}
                    {formatTransactionCount(getGroupTransactions(group.id!).length)}
                  </span>
                  <span className="tag tag-soft" style={{ marginTop: '0.45rem' }}>
                    {formatMoney(getGroupTotal(group.id!), currencySymbol)}
                  </span>
                </Link>
                <div className={styles.tinyActions}>
                  <Link className={styles.iconAction} to={`/transactions/new?groupId=${group.id}`}>
                    <MdAdd size={18} />
                  </Link>
                  <Link className={styles.iconAction} to={`/groups/${group.id}/edit`}>
                    <MdEdit size={18} />
                  </Link>
                  <button
                    className={styles.iconAction}
                    onClick={() => setDeleteCandidateId(group.id ?? null)}
                    type="button"
                  >
                    <MdDeleteOutline size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="app-card empty-state">
            <h3>No expense groups yet</h3>
            <p>Create your first expense group to organize your expenses.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="Delete"
        description={
          deleteCandidate
            ? `Are you sure you want to delete "${deleteCandidate.name}"? Transactions will remain, but they will be removed from this group.`
            : ''
        }
        onClose={() => setDeleteCandidateId(null)}
        onConfirm={async () => {
          try {
            if (deleteCandidateId) {
              await deleteExpenseGroup(deleteCandidateId);
              showSuccessToast('Group deleted', deleteCandidate?.name ?? 'The group was removed.');
            }
            setDeleteCandidateId(null);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'We could not delete the group.';
            showErrorToast('Delete failed', message);
          }
        }}
        open={deleteCandidateId !== null}
        title="Delete Group"
        tone="danger"
      />
    </main>
  );
}
