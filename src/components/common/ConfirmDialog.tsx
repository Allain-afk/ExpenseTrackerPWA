import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  tone?: 'danger' | 'default';
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  tone = 'default',
}: ConfirmDialogProps) {
  return (
    <Modal description={description} onClose={onClose} open={open} title={title}>
      <div className="inline-actions">
        <button className="secondary-button" onClick={onClose} type="button">
          Cancel
        </button>
        <button
          className={tone === 'danger' ? 'danger-button' : 'primary-button'}
          onClick={() => void onConfirm()}
          type="button"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
