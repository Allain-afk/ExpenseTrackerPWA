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
  type SyncBudgetRow,
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
import { useExpenseGroups } from '../hooks/useExpenseGroups';
import { useSettings } from '../hooks/useSettings';
import { useBudgets } from '../hooks/useBudgets';
import { getSupabaseDisplayName } from '../lib/utils/supabaseUser';
import { useTransactions } from '../hooks/useTransactions';
import { useWallets } from '../hooks/useWallets';

export type SyncStatus = 'idle' | 'offline' | 'syncing' | 'success' | 'error';

interface SyncNowOptions {
  silent?: boolean;
}

interface SyncRunSummary {
  pendingCount: number;
  pulledCount: number;
  touchedTables: {
    wallets: boolean;
    expenseGroups: boolean;
    transactions: boolean;
    budgets: boolean;
  };
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
    group_uuid: row.group_uuid ? String(row.group_uuid) : null,
    walletId: row.walletId == null ? null : Number(row.walletId),
    wallet_uuid: row.wallet_uuid ? String(row.wallet_uuid) : null,
  };
}

function normalizeBudgetRemoteRow(row: Record<string, unknown>): SyncBudgetRow | null {
  const uuid = String(row.uuid ?? row.id ?? '').trim();
  if (!uuid) {
    return null;
  }

  const id = String(row.id ?? uuid).trim();
  if (!id) {
    return null;
  }

  return {
    id,
    category: String(row.category ?? ''),
    limit_amount: Number(row.limit_amount ?? 0),
    uuid,
    user_id: row.user_id ? String(row.user_id) : null,
    is_synced: 1,
    last_modified: String(row.last_modified ?? new Date().toISOString()),
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
    group_uuid: row.group_uuid,
    wallet_uuid: row.wallet_uuid,
    last_modified: row.last_modified,
  };
}

function toBudgetRemotePayload(row: SyncBudgetRow) {
  return {
    id: row.id,
    uuid: row.uuid,
    user_id: row.user_id,
    category: row.category,
    limit_amount: row.limit_amount,
    last_modified: row.last_modified,
  };
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth();
  const settings = useSettings();
  const transactions = useTransactions();
  const wallets = useWallets();
  const expenseGroups = useExpenseGroups();
  const budgets = useBudgets();
  const syncIntervalMs = 5 * 60 * 1000;
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [status, setStatus] = useState<SyncStatus>(() => (navigator.onLine ? 'idle' : 'offline'));
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const isSyncingRef = useRef(false);
  const pendingDisplayNameHydrationRef = useRef<string | null>(null);

  const fetchAllRemoteRows = useCallback(async (
    userId: string,
    tableName: SyncTableName,
  ): Promise<Array<Record<string, unknown>>> => {
    if (!supabase) {
      return [];
    }

    const pageSize = 1000;
    let offset = 0;
    const allRows: Array<Record<string, unknown>> = [];

    while (true) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .order('last_modified', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(error.message);
      }

      const chunk = (data ?? []) as Array<Record<string, unknown>>;
      allRows.push(...chunk);

      if (chunk.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    return allRows;
  }, []);

  const syncTableRows = useCallback(async (
    userId: string,
    tableName: SyncTableName,
    rows: Array<SyncWalletRow | SyncExpenseGroupRow | SyncTransactionRow | SyncBudgetRow>,
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

    const pushRows: Array<SyncWalletRow | SyncExpenseGroupRow | SyncTransactionRow | SyncBudgetRow> = [];
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

        if (tableName === 'budgets') {
          return toBudgetRemotePayload(row as SyncBudgetRow);
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

    if (tableName === 'budgets') {
      for (const row of pullRows) {
        const normalized = normalizeBudgetRemoteRow(row);
        if (normalized) {
          await syncRepository.upsertBudgetFromRemote(normalized);
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
    if (supabase) {
      const deletedEntities = await syncRepository.getDeletedEntities();
      for (const entity of deletedEntities) {
        if (!entity.uuid || !entity.table_name) {
          continue;
        }

        const { error } = await supabase.from(entity.table_name).delete().eq('uuid', entity.uuid);
        // If there's no error, it means it's successfully deleted remotely or already missing.
        if (!error) {
          await syncRepository.removeDeletedEntity(entity.uuid);
        }
      }
    }

    const remainingDeletions = await syncRepository.getDeletedEntities();
    const deletedUuids = new Set(remainingDeletions.map((entity) => entity.uuid));

    const pending: SyncPendingData = await syncRepository.getPendingRowsForUser(userId);
    const pendingCount = pending.wallets.length
      + pending.expenseGroups.length
      + pending.transactions.length
      + pending.budgets.length;
    const touchedTables = {
      wallets: pending.wallets.length > 0,
      expenseGroups: pending.expenseGroups.length > 0,
      transactions: pending.transactions.length > 0,
      budgets: pending.budgets.length > 0,
    };

    await syncTableRows(userId, 'wallets', pending.wallets);
    await syncTableRows(userId, 'expense_groups', pending.expenseGroups);
    await syncTableRows(userId, 'transactions', pending.transactions);
    await syncTableRows(userId, 'budgets', pending.budgets);

    const [
      remoteWalletRows,
      remoteExpenseGroupRows,
      remoteTransactionRows,
      remoteBudgetRows,
      localWalletRows,
      localExpenseGroupRows,
      localTransactionRows,
      localBudgetRows,
    ] = await Promise.all([
      fetchAllRemoteRows(userId, 'wallets'),
      fetchAllRemoteRows(userId, 'expense_groups'),
      fetchAllRemoteRows(userId, 'transactions'),
      fetchAllRemoteRows(userId, 'budgets'),
      syncRepository.getWalletRowsForUser(userId),
      syncRepository.getExpenseGroupRowsForUser(userId),
      syncRepository.getTransactionRowsForUser(userId),
      syncRepository.getBudgetRowsForUser(userId),
    ]);

    const localWalletMap = new Map(localWalletRows.map((row) => [row.uuid, row]));
    const localExpenseGroupMap = new Map(localExpenseGroupRows.map((row) => [row.uuid, row]));
    const localTransactionMap = new Map(localTransactionRows.map((row) => [row.uuid, row]));
    const localBudgetMap = new Map(localBudgetRows.map((row) => [row.uuid, row]));

    let pulledCount = 0;

    for (const row of remoteWalletRows) {
      const normalized = normalizeWalletRemoteRow(row);
      if (!normalized || deletedUuids.has(normalized.uuid)) {
        continue;
      }

      const localRow = localWalletMap.get(normalized.uuid);
      if (!localRow || isRemoteNewer(normalized.last_modified, localRow.last_modified)) {
        await syncRepository.upsertWalletFromRemote(normalized);
        pulledCount += 1;
        touchedTables.wallets = true;
      }
    }

    for (const row of remoteExpenseGroupRows) {
      const normalized = normalizeGroupRemoteRow(row);
      if (!normalized || deletedUuids.has(normalized.uuid)) {
        continue;
      }

      const localRow = localExpenseGroupMap.get(normalized.uuid);
      if (!localRow || isRemoteNewer(normalized.last_modified, localRow.last_modified)) {
        await syncRepository.upsertExpenseGroupFromRemote(normalized);
        pulledCount += 1;
        touchedTables.expenseGroups = true;
      }
    }

    for (const row of remoteTransactionRows) {
      const normalized = normalizeTransactionRemoteRow(row);
      if (!normalized || deletedUuids.has(normalized.uuid)) {
        continue;
      }

      const localRow = localTransactionMap.get(normalized.uuid);
      if (!localRow || isRemoteNewer(normalized.last_modified, localRow.last_modified)) {
        await syncRepository.upsertTransactionFromRemote(normalized);
        pulledCount += 1;
        touchedTables.transactions = true;
      }
    }

    for (const row of remoteBudgetRows) {
      const normalized = normalizeBudgetRemoteRow(row);
      if (!normalized || deletedUuids.has(normalized.uuid)) {
        continue;
      }

      const localRow = localBudgetMap.get(normalized.uuid);
      if (!localRow || isRemoteNewer(normalized.last_modified, localRow.last_modified)) {
        await syncRepository.upsertBudgetFromRemote(normalized);
        pulledCount += 1;
        touchedTables.budgets = true;
      }
    }

    return {
      pendingCount,
      pulledCount,
      touchedTables,
    };
  }, [fetchAllRemoteRows, syncTableRows]);

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

      if (summary.pendingCount > 0 || summary.pulledCount > 0) {
        const refreshTasks: Array<Promise<unknown>> = [];

        if (summary.touchedTables.wallets) {
          refreshTasks.push(wallets.loadWallets());
        }

        if (summary.touchedTables.expenseGroups) {
          refreshTasks.push(expenseGroups.loadExpenseGroups());
        }

        if (summary.touchedTables.transactions) {
          refreshTasks.push(transactions.loadTransactions());
        }

        if (summary.touchedTables.budgets) {
          refreshTasks.push(budgets.loadBudgets());
        }

        if (refreshTasks.length > 0) {
          await Promise.all(refreshTasks);
        }
      }

      setStatus('success');
      setLastSyncedAt(new Date());
      if (!options?.silent) {
        if (summary.pendingCount === 0 && summary.pulledCount === 0) {
          const anonymousRows = await syncRepository.getAnonymousOwnershipCount();
          if (anonymousRows > 0) {
            showInfoToast(
              'No eligible rows yet',
              'Some local rows are not linked to this account. Accept cloud adoption to sync them.',
            );
          } else {
            showInfoToast('Already up to date', 'No eligible changes were found for cloud sync.');
          }
        } else if (summary.pendingCount === 0 && summary.pulledCount > 0) {
          const noun = summary.pulledCount === 1 ? 'change' : 'changes';
          showSuccessToast('Cloud data restored', `Imported ${summary.pulledCount} ${noun} to this device.`);
        } else {
          showSuccessToast('Sync complete', 'Your local and cloud changes are merged.');
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
  }, [budgets, expenseGroups, isConfigured, runSync, transactions, user?.id, wallets]);

  useEffect(() => {
    pendingDisplayNameHydrationRef.current = null;
  }, [user?.id]);

  useEffect(() => {
    if (!settings.isLoaded || !user) {
      return;
    }

    if (settings.userName.trim()) {
      return;
    }

    const displayName = getSupabaseDisplayName(user.user_metadata);
    if (!displayName) {
      return;
    }

    if (pendingDisplayNameHydrationRef.current === displayName) {
      return;
    }

    pendingDisplayNameHydrationRef.current = displayName;

    void settings
      .updateUserSettings({
        userName: displayName,
        notificationsEnabled: settings.notificationsEnabled,
        lowBalanceThreshold: settings.lowBalanceThreshold,
        notificationMessage: settings.notificationMessage,
      })
      .catch(() => {
        // Keep this silent because sync hydration should not block user flows.
        pendingDisplayNameHydrationRef.current = null;
      });
  }, [
    settings,
    settings.isLoaded,
    settings.lowBalanceThreshold,
    settings.notificationMessage,
    settings.notificationsEnabled,
    settings.userName,
    user,
  ]);

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
    }, syncIntervalMs);

    return () => window.clearInterval(timer);
  }, [isOnline, syncIntervalMs, syncNow, user]);

  const hasPendingLocalChanges = useMemo(() => {
    if (!user) {
      return false;
    }

    if (!transactions.isLoaded || !wallets.isLoaded || !expenseGroups.isLoaded || !budgets.isLoaded) {
      return false;
    }

    return (
      transactions.transactions.some((transaction) => !transaction.isSynced)
      || wallets.wallets.some((wallet) => !wallet.isSynced)
      || expenseGroups.groups.some((group) => !group.isSynced)
      || budgets.budgets.some((budget) => !budget.isSynced)
    );
  }, [
    budgets.budgets,
    budgets.isLoaded,
    expenseGroups.groups,
    expenseGroups.isLoaded,
    transactions.isLoaded,
    transactions.transactions,
    user,
    wallets.isLoaded,
    wallets.wallets,
  ]);

  useEffect(() => {
    if (!isOnline || !user || !isConfigured) {
      return;
    }

    if (!hasPendingLocalChanges) {
      return;
    }

    void syncNow({ silent: true });
  }, [hasPendingLocalChanges, isConfigured, isOnline, syncNow, user]);

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
