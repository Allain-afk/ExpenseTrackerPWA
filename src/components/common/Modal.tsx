import { useEffect, useId, useRef, type ReactNode } from 'react';
import { MdClose } from 'react-icons/md';

const openModalStack: symbol[] = [];
let bodyScrollLockCount = 0;
let bodyOverflowBeforeLock = '';

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
  const onCloseRef = useRef(onClose);
  const modalIdRef = useRef(Symbol('modal'));

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      return;
    }

    const rememberFocusedElement = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement) {
        returnFocusRef.current = event.target;
      }
    };

    if (document.activeElement instanceof HTMLElement) {
      returnFocusRef.current = document.activeElement;
    }
    document.addEventListener('focusin', rememberFocusedElement);
    return () => document.removeEventListener('focusin', rememberFocusedElement);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const modalId = modalIdRef.current;
    openModalStack.push(modalId);
    if (bodyScrollLockCount === 0) {
      bodyOverflowBeforeLock = document.body.style.overflow;
    }
    bodyScrollLockCount += 1;
    document.body.style.overflow = 'hidden';
    const currentFocus = document.activeElement;
    if (
      returnFocusRef.current === null
      && currentFocus instanceof HTMLElement
      && !panelRef.current?.contains(currentFocus)
    ) {
      returnFocusRef.current = currentFocus;
    }
    if (!(currentFocus instanceof HTMLElement && panelRef.current?.contains(currentFocus))) {
      closeButtonRef.current?.focus();
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (openModalStack.at(-1) !== modalId) {
        return;
      }

      if (event.key === 'Escape') {
        onCloseRef.current();
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
      window.removeEventListener('keydown', handleEscape);
      const stackIndex = openModalStack.lastIndexOf(modalId);
      if (stackIndex >= 0) {
        openModalStack.splice(stackIndex, 1);
      }
      bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
      document.body.style.overflow = bodyScrollLockCount === 0 ? bodyOverflowBeforeLock : 'hidden';

      const returnFocusTarget = returnFocusRef.current;
      returnFocusRef.current = null;
      queueMicrotask(() => {
        if (returnFocusTarget?.isConnected) {
          returnFocusTarget.focus();
        }
      });
    };
  }, [open]);

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
