import {
  useCallback,
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { databaseClient } from '../lib/db/client';
import {
  createSyncRepository,
  type SyncExpenseGroupRow,
  type SyncPendingData,
  type SyncTableName,
  type SyncTransactionRow,
  type SyncWalletRow,
} from '../lib/db/repositories/syncRepository';
import { supabase } from '../lib/supabase/client';
import { useAuth } from '../hooks/useAuth';
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
  showWarningToast,
} from '../lib/utils/appToast';

export type SyncStatus = 'idle' | 'offline' | 'syncing' | 'success' | 'error';

interface SyncNowOptions {
  silent?: boolean;
}

interface SyncRunSummary {
  pendingCount: number;
}

export interface SyncContextValue {
  status: SyncStatus;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  lastError: string | null;
  syncNow: (options?: SyncNowOptions) => Promise<void>;
  getAnonymousLocalRowsCount: () => Promise<number>;
  adoptAnonymousRowsForUser: (userId: string) => Promise<void>;
}

const syncRepository = createSyncRepository(databaseClient);

export const SyncContext = createContext<SyncContextValue | null>(null);

function toMillis(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isRemoteNewer(remoteLastModified: string | null | undefined, localLastModified: string): boolean {
  return toMillis(remoteLastModified) > toMillis(localLastModified);
}

function normalizeWalletRemoteRow(row: Record<string, unknown>): SyncWalletRow | null {
  const uuid = String(row.uuid ?? '').trim();
  if (!uuid) {
    return null;
  }

  return {
    uuid,
    user_id: row.user_id ? String(row.user_id) : null,
    is_synced: 1,
    last_modified: String(row.last_modified ?? new Date().toISOString()),
    name: String(row.name ?? ''),
    type: String(row.type ?? 'wallet'),
    colorValue: Number(row.colorValue ?? 0),
    isHidden: Number(row.isHidden ?? 0),
    sortOrder: Number(row.sortOrder ?? 0),
  };
}

function normalizeGroupRemoteRow(row: Record<string, unknown>): SyncExpenseGroupRow | null {
  const uuid = String(row.uuid ?? '').trim();
  if (!uuid) {
    return null;
  }

  return {
    uuid,
    user_id: row.user_id ? String(row.user_id) : null,
    is_synced: 1,
    last_modified: String(row.last_modified ?? new Date().toISOString()),
    name: String(row.name ?? ''),
    description: row.description ? String(row.description) : null,
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeTransactionRemoteRow(row: Record<string, unknown>): SyncTransactionRow | null {
  const uuid = String(row.uuid ?? '').trim();
  if (!uuid) {
    return null;
  }

  return {
    uuid,
    user_id: row.user_id ? String(row.user_id) : null,
    is_synced: 1,
    last_modified: String(row.last_modified ?? new Date().toISOString()),
    amount: Number(row.amount ?? 0),
    category: String(row.category ?? ''),
    description: String(row.description ?? ''),
    date: String(row.date ?? new Date().toISOString()),
    type: String(row.type ?? 'expense'),
    imagePath: row.imagePath ? String(row.imagePath) : null,
    groupId: row.groupId == null ? null : Number(row.groupId),
    walletId: row.walletId == null ? null : Number(row.walletId),
  };
}

function toWalletRemotePayload(row: SyncWalletRow) {
  return {
    uuid: row.uuid,
    user_id: row.user_id,
    name: row.name,
    type: row.type,
    colorValue: row.colorValue,
    isHidden: row.isHidden,
    sortOrder: row.sortOrder,
    last_modified: row.last_modified,
  };
}

function toGroupRemotePayload(row: SyncExpenseGroupRow) {
  return {
    uuid: row.uuid,
    user_id: row.user_id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    last_modified: row.last_modified,
  };
}

function toTransactionRemotePayload(row: SyncTransactionRow) {
  return {
    uuid: row.uuid,
    user_id: row.user_id,
    amount: row.amount,
    category: row.category,
    description: row.description,
    date: row.date,
    type: row.type,
    imagePath: row.imagePath,
    groupId: row.groupId,
    walletId: row.walletId,
    last_modified: row.last_modified,
  };
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth();
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [status, setStatus] = useState<SyncStatus>(() => (navigator.onLine ? 'idle' : 'offline'));
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  const syncTableRows = useCallback(async (
    userId: string,
    tableName: SyncTableName,
    rows: Array<SyncWalletRow | SyncExpenseGroupRow | SyncTransactionRow>,
  ): Promise<void> => {
    if (!supabase || !rows.length) {
      return;
    }

    const uuids = rows.map((row) => row.uuid).filter((uuid) => uuid && uuid.trim());
    if (!uuids.length) {
      return;
    }

    const { data: remoteRows, error: remoteError } = await supabase
      .from(tableName)
      .select('*')
      .eq('user_id', userId)
      .in('uuid', uuids);

    if (remoteError) {
      throw new Error(remoteError.message);
    }

    const remoteMap = new Map<string, Record<string, unknown>>();
    for (const row of (remoteRows ?? []) as Array<Record<string, unknown>>) {
      const uuid = String(row.uuid ?? '').trim();
      if (uuid) {
        remoteMap.set(uuid, row);
      }
    }

    const pushRows: Array<SyncWalletRow | SyncExpenseGroupRow | SyncTransactionRow> = [];
    const pullRows: Array<Record<string, unknown>> = [];

    for (const row of rows) {
      const remoteRow = remoteMap.get(row.uuid);
      if (!remoteRow) {
        pushRows.push(row);
        continue;
      }

      if (isRemoteNewer(remoteRow.last_modified ? String(remoteRow.last_modified) : null, row.last_modified)) {
        pullRows.push(remoteRow);
      } else {
        pushRows.push(row);
      }
    }

    if (pushRows.length) {
      const payload = pushRows.map((row) => {
        if (tableName === 'wallets') {
          return toWalletRemotePayload(row as SyncWalletRow);
        }

        if (tableName === 'expense_groups') {
          return toGroupRemotePayload(row as SyncExpenseGroupRow);
        }

        return toTransactionRemotePayload(row as SyncTransactionRow);
      });

      const { error: upsertError } = await supabase
        .from(tableName)
        .upsert(payload, { onConflict: 'uuid' });

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      await syncRepository.markRowsSynced(
        tableName,
        userId,
        pushRows.map((row) => row.uuid),
      );
    }

    if (!pullRows.length) {
      return;
    }

    if (tableName === 'wallets') {
      for (const row of pullRows) {
        const normalized = normalizeWalletRemoteRow(row);
        if (normalized) {
          await syncRepository.upsertWalletFromRemote(normalized);
        }
      }
      return;
    }

    if (tableName === 'expense_groups') {
      for (const row of pullRows) {
        const normalized = normalizeGroupRemoteRow(row);
        if (normalized) {
          await syncRepository.upsertExpenseGroupFromRemote(normalized);
        }
      }
      return;
    }

    for (const row of pullRows) {
      const normalized = normalizeTransactionRemoteRow(row);
      if (normalized) {
        await syncRepository.upsertTransactionFromRemote(normalized);
      }
    }
  }, []);

  const runSync = useCallback(async (userId: string): Promise<SyncRunSummary> => {
    const pending: SyncPendingData = await syncRepository.getPendingRowsForUser(userId);
    const pendingCount = pending.wallets.length + pending.expenseGroups.length + pending.transactions.length;

    await syncTableRows(userId, 'wallets', pending.wallets);
    await syncTableRows(userId, 'expense_groups', pending.expenseGroups);
    await syncTableRows(userId, 'transactions', pending.transactions);

    return { pendingCount };
  }, [syncTableRows]);

  const syncNow = useCallback(async (options?: SyncNowOptions): Promise<void> => {
    if (!isConfigured || !supabase) {
      return;
    }

    if (!user?.id) {
      return;
    }

    if (!navigator.onLine) {
      setStatus('offline');
      if (!options?.silent) {
        showInfoToast('Offline', 'Sync will resume automatically when you reconnect.');
      }
      return;
    }

    if (isSyncingRef.current) {
      return;
    }

    isSyncingRef.current = true;
    setStatus('syncing');
    setLastError(null);

    try {
      const summary = await runSync(user.id);
      setStatus('success');
      setLastSyncedAt(new Date());
      if (!options?.silent) {
        if (summary.pendingCount === 0) {
          const anonymousRows = await syncRepository.getAnonymousOwnershipCount();
          if (anonymousRows > 0) {
            showInfoToast(
              'No eligible rows yet',
              'Some local rows are not linked to this account. Accept cloud adoption to sync them.',
            );
          } else {
            showInfoToast('Already up to date', 'No eligible changes were found for cloud sync.');
          }
        } else {
          showSuccessToast('Sync complete', 'Your latest local changes are backed up.');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed.';
      setStatus('error');
      setLastError(message);
      if (!options?.silent) {
        showErrorToast('Sync failed', message);
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [isConfigured, runSync, user?.id]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setStatus('idle');
      showInfoToast('Back online', 'Unsynced changes can now be backed up.');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus('offline');
      showWarningToast('Offline mode', 'Changes stay local and will sync when online.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline || !user) {
      return;
    }

    const timer = window.setInterval(() => {
      void syncNow({ silent: true });
    }, 30000);

    return () => window.clearInterval(timer);
  }, [isOnline, syncNow, user]);

  useEffect(() => {
    if (!isOnline || !user) {
      return;
    }

    void syncNow({ silent: true });
  }, [isOnline, syncNow, user]);

  const value = useMemo<SyncContextValue>(
    () => ({
      status,
      isOnline,
      isSyncing: status === 'syncing',
      lastSyncedAt,
      lastError,
      syncNow,
      getAnonymousLocalRowsCount: syncRepository.getAnonymousOwnershipCount,
      adoptAnonymousRowsForUser: syncRepository.adoptAnonymousRows,
    }),
    [isOnline, lastError, lastSyncedAt, status, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
