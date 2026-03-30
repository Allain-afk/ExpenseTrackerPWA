import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../../hooks/useAuth';
import { useSync } from '../../hooks/useSync';
import { useAppBootstrap } from '../../hooks/useAppBootstrap';
import { showErrorToast, showInfoToast, showSuccessToast } from '../../lib/utils/appToast';

const adoptionStorageKeyPrefix = 'expense-tracker-sync-adoption';

function getDecisionKey(userId: string): string {
  return `${adoptionStorageKeyPrefix}:${userId}`;
}

export function SyncAdoptionModal() {
  const { hasBootstrapped } = useAppBootstrap();
  const { user } = useAuth();
  const { adoptAnonymousRowsForUser, getAnonymousLocalRowsCount, syncNow } = useSync();

  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const decisionKey = useMemo(() => {
    if (!user?.id) {
      return null;
    }

    return getDecisionKey(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!hasBootstrapped || !user?.id || !decisionKey) {
      setIsOpen(false);
      return;
    }

    const existingDecision = window.localStorage.getItem(decisionKey);
    if (existingDecision) {
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    setIsChecking(true);

    void getAnonymousLocalRowsCount()
      .then((count) => {
        if (cancelled) {
          return;
        }

        setIsOpen(count > 0);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unable to check local ownership.';
        showErrorToast('Adoption check failed', message);
      })
      .finally(() => {
        if (!cancelled) {
          setIsChecking(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [decisionKey, getAnonymousLocalRowsCount, hasBootstrapped, user?.id]);

  async function handleSyncAdoption(): Promise<void> {
    if (!user?.id || !decisionKey) {
      return;
    }

    setIsSubmitting(true);

    try {
      await adoptAnonymousRowsForUser(user.id);
      window.localStorage.setItem(decisionKey, 'accepted');
      setIsOpen(false);
      showSuccessToast('Cloud backup enabled', 'Local data was assigned to your account.');
      await syncNow();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not adopt local rows.';
      showErrorToast('Cloud backup failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeepLocalOnly() {
    if (decisionKey) {
      window.localStorage.setItem(decisionKey, 'declined');
    }

    setIsOpen(false);
    showInfoToast('Keeping local-only mode', 'You can connect and sync later from Settings.');
  }

  if (!user || isChecking) {
    return null;
  }

  return (
    <Modal
      description="Sync your existing local data to your new account for cloud backup?"
      onClose={handleKeepLocalOnly}
      open={isOpen}
      title="Enable Cloud Backup"
    >
      <div className="stack-form">
        <div className="app-card" style={{ padding: '0.95rem 1rem', borderRadius: '1rem' }}>
          <p className="helper-text" style={{ margin: 0 }}>
            Local-first mode stays enabled. Sync only uploads your current device data after consent.
          </p>
        </div>

        <div className="inline-actions">
          <button className="secondary-button" disabled={isSubmitting} onClick={handleKeepLocalOnly} type="button">
            Keep Local Only
          </button>
          <button className="primary-button" disabled={isSubmitting} onClick={() => void handleSyncAdoption()} type="button">
            {isSubmitting ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
