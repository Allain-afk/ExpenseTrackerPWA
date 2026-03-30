import {
  MdCloudDone,
  MdCloudOff,
  MdCloudQueue,
  MdCloudSync,
  MdErrorOutline,
} from 'react-icons/md';
import { useAuth } from '../../hooks/useAuth';
import { useSync } from '../../hooks/useSync';

export function SyncStatusIcon() {
  const { user, isConfigured } = useAuth();
  const { isOnline, status, syncNow } = useSync();

  if (!isConfigured) {
    return (
      <span aria-label="Cloud sync unavailable" className="overlay-close" title="Cloud sync is not configured.">
        <MdCloudOff size={18} />
      </span>
    );
  }

  if (!user) {
    return (
      <span aria-label="Sign in to sync" className="overlay-close" title="Sign in to enable cloud backup.">
        <MdCloudQueue size={18} />
      </span>
    );
  }

  if (!isOnline || status === 'offline') {
    return (
      <span aria-label="Offline" className="overlay-close" title="Offline. Changes are queued locally.">
        <MdCloudOff size={18} />
      </span>
    );
  }

  if (status === 'syncing') {
    return (
      <span aria-label="Syncing" className="overlay-close" title="Syncing changes to cloud backup.">
        <MdCloudSync size={18} />
      </span>
    );
  }

  if (status === 'error') {
    return (
      <button
        aria-label="Retry sync"
        className="overlay-close"
        onClick={() => void syncNow()}
        title="Sync failed. Tap to retry."
        type="button"
      >
        <MdErrorOutline size={18} />
      </button>
    );
  }

  return (
    <button
      aria-label="Cloud synced"
      className="overlay-close"
      onClick={() => void syncNow()}
      title="Cloud backup is up to date. Tap to sync now."
      type="button"
    >
      <MdCloudDone size={18} />
    </button>
  );
}
