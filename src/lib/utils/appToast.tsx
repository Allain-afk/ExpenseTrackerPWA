import type { ReactNode } from 'react';
import {
  MdCheckCircle,
  MdClose,
  MdErrorOutline,
  MdInfoOutline,
  MdNotificationsActive,
} from 'react-icons/md';
import { toast, type Toast } from 'react-hot-toast';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface AppToastOverrides {
  duration?: number;
  id?: string;
}

interface AppToastOptions extends AppToastOverrides {
  description?: string;
  icon?: ReactNode;
  title: string;
  tone?: ToastTone;
}

const toneIcons: Record<ToastTone, ReactNode> = {
  success: <MdCheckCircle size={18} />,
  error: <MdErrorOutline size={18} />,
  info: <MdInfoOutline size={18} />,
  warning: <MdNotificationsActive size={18} />,
};

function renderAppToastCard({
  description,
  icon,
  title,
  toastState,
  tone,
}: {
  description?: string;
  icon?: ReactNode;
  title: string;
  toastState: Toast;
  tone: ToastTone;
}) {
  return (
    <div
      className={`app-toast app-toast--${tone} ${toastState.visible ? 'app-toast--enter' : 'app-toast--leave'}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className={`app-toast-icon app-toast-icon--${tone}`} aria-hidden="true">
        {icon ?? toneIcons[tone]}
      </span>
      <span className="app-toast-copy">
        <span className="app-toast-title">{title}</span>
        {description ? <span className="app-toast-description">{description}</span> : null}
      </span>
      <button
        aria-label="Dismiss notification"
        className="app-toast-dismiss"
        onClick={() => toast.dismiss(toastState.id)}
        type="button"
      >
        <MdClose size={16} />
      </button>
    </div>
  );
}

export function showAppToast({
  description,
  duration = 1500,
  icon,
  id,
  title,
  tone = 'info',
}: AppToastOptions) {
  return toast.custom(
    (toastState) => renderAppToastCard({
      description,
      icon,
      title,
      toastState,
      tone,
    }),
    {
      duration,
      id,
    },
  );
}

export function dismissAppToast(id?: string) {
  if (id) {
    toast.dismiss(id);
    return;
  }

  toast.dismiss();
}

export function showSuccessToast(
  title: string,
  description?: string,
  overrides?: AppToastOverrides,
) {
  return showAppToast({ description, title, tone: 'success', ...overrides });
}

export function showErrorToast(
  title: string,
  description?: string,
  overrides?: AppToastOverrides,
) {
  return showAppToast({ description, title, tone: 'error', ...overrides });
}

export function showInfoToast(
  title: string,
  description?: string,
  overrides?: AppToastOverrides,
) {
  return showAppToast({ description, title, tone: 'info', ...overrides });
}

export function showWarningToast(
  title: string,
  description?: string,
  overrides?: AppToastOverrides,
) {
  return showAppToast({ description, title, tone: 'warning', ...overrides });
}
