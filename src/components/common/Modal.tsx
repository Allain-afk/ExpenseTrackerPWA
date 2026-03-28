import { useEffect, type ReactNode } from 'react';
import { MdClose } from 'react-icons/md';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  variant?: 'center' | 'sheet';
  children: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  variant = 'center',
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="overlay-backdrop"
      onClick={onClose}
      role="dialog"
    >
      <div
        className={`overlay-panel ${variant === 'sheet' ? 'sheet-panel' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        {(title || description) && (
          <div className="overlay-header">
            <div>
              {title ? <h2>{title}</h2> : null}
              {description ? <p>{description}</p> : null}
            </div>
            <button
              aria-label="Close modal"
              className="overlay-close"
              onClick={onClose}
              type="button"
            >
              <MdClose size={20} />
            </button>
          </div>
        )}
        <div className="overlay-content">{children}</div>
      </div>
    </div>
  );
}
