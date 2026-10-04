import { useEffect, useId, useRef, type ReactNode } from 'react';
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
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) {
        return;
      }

      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
      returnFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby={title ? titleId : undefined}
      aria-modal="true"
      className="overlay-backdrop"
      onClick={onClose}
      role="dialog"
    >
      <div
        className={`overlay-panel ${variant === 'sheet' ? 'sheet-panel' : ''}`}
        onClick={(event) => event.stopPropagation()}
        ref={panelRef}
      >
        {(title || description) && (
          <div className="overlay-header">
            <div>
              {title ? <h2 id={titleId}>{title}</h2> : null}
              {description ? <p>{description}</p> : null}
            </div>
            <button
              aria-label="Close modal"
              className="overlay-close"
              onClick={onClose}
              ref={closeButtonRef}
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
