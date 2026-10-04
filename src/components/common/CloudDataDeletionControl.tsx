import { useState } from 'react';
import { MdCloudOff, MdDeleteForever, MdWarningAmber } from 'react-icons/md';
import { Modal } from './Modal';

const CONFIRMATION_PHRASE = 'DELETE CLOUD DATA';

interface CloudDataDeletionControlProps {
  accountEmail: string;
  onDelete: () => Promise<void>;
}

export function CloudDataDeletionControl({
  accountEmail,
  onDelete,
}: CloudDataDeletionControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeDialog(): void {
    if (isDeleting) {
      return;
    }
    setIsOpen(false);
    setConfirmation('');
    setError(null);
  }

  async function confirmDeletion(): Promise<void> {
    if (confirmation !== CONFIRMATION_PHRASE || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await onDelete();
      setIsOpen(false);
      setConfirmation('');
    } catch (deletionError) {
      setError(
        deletionError instanceof Error
          ? deletionError.message
          : 'Cloud data could not be deleted.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button aria-label="Delete Cloud Data" className="inset-item" onClick={() => setIsOpen(true)} type="button">
        <span className="icon-chip" style={{ background: 'rgba(190,18,60,0.12)', color: '#be123c' }}>
          <MdCloudOff size={22} />
        </span>
        <span className="inset-item-content">
          <span className="inset-title" style={{ color: '#be123c' }}>Delete Cloud Data</span>
          <span className="inset-subtitle">Permanently erase all data synced to this account</span>
        </span>
      </button>

      <Modal
        description="This is a destructive action and cannot be undone."
        onClose={closeDialog}
        open={isOpen}
        title="Permanently delete cloud data?"
      >
        <div className="stack-form">
          <div
            style={{
              alignItems: 'flex-start',
              background: 'rgba(190,18,60,0.08)',
              border: '1px solid rgba(190,18,60,0.24)',
              borderRadius: '1rem',
              color: '#9f1239',
              display: 'flex',
              gap: '0.75rem',
              padding: '0.9rem',
            }}
          >
            <MdWarningAmber aria-hidden="true" size={24} style={{ flexShrink: 0 }} />
            <div>
              <strong>All synced financial data will be erased.</strong>
              <p style={{ margin: '0.35rem 0 0' }}>
                This removes cloud wallets, transactions, groups, budgets, and planning data for{' '}
                <strong>{accountEmail}</strong>. Matching synced data on this device will also be removed,
                and you will be signed out. This does not delete your account.
              </p>
            </div>
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="cloud-delete-confirmation">
              Type {CONFIRMATION_PHRASE} to confirm
            </label>
            <input
              autoComplete="off"
              className="text-input"
              id="cloud-delete-confirmation"
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={CONFIRMATION_PHRASE}
              value={confirmation}
            />
          </div>

          {error ? <p className="error-text" role="alert">{error}</p> : null}

          <div className="inline-actions">
            <button className="secondary-button" disabled={isDeleting} onClick={closeDialog} type="button">
              Cancel
            </button>
            <button
              className="danger-button"
              disabled={confirmation !== CONFIRMATION_PHRASE || isDeleting}
              onClick={() => void confirmDeletion()}
              type="button"
            >
              <MdDeleteForever aria-hidden="true" size={18} />
              {isDeleting ? 'Deleting...' : 'Permanently Delete Cloud Data'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
