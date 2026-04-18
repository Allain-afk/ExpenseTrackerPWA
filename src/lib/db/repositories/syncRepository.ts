import { ensureDatabaseReady } from '../client';
import type { DatabaseClient } from '../types';
import { fromSqliteTimestamp, toIsoTimestamp, toSqliteTimestamp } from '../../utils/date';

export type SyncTableName = 'transactions' | 'wallets' | 'expense_groups' | 'budgets';

export interface SyncWalletRow {
  id?: number;
  uuid: string;
  user_id: string | null;
  is_synced: number;
  last_modified: string;
  name: string;
  type: string;
  colorValue: number;
  isHidden: number;
  sortOrder: number;
}

export interface SyncExpenseGroupRow {
  id?: number;
  uuid: string;
  user_id: string | null;
  is_synced: number;
  last_modified: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncTransactionRow {
  id?: number;
  uuid: string;
  user_id: string | null;
  is_synced: number;
  last_modified: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: string;
  imagePath: string | null;
  groupId: number | null;
  group_uuid: string | null;
  walletId: number | null;
  wallet_uuid: string | null;
}

export interface SyncBudgetRow {
  id: string;
  category: string;
  limit_amount: number;
  uuid: string;
  user_id: string | null;
  is_synced: number;
  last_modified: string;
}

export interface SyncPendingData {
  wallets: SyncWalletRow[];
  expenseGroups: SyncExpenseGroupRow[];
  transactions: SyncTransactionRow[];
  budgets: SyncBudgetRow[];
}

interface CountResultRow {
  count: number | null;
}

function isoNow(): string {
  return toIsoTimestamp();
}

function normalizeToSqliteTimestamp(value: string): string {
  return toSqliteTimestamp(fromSqliteTimestamp(value));
}

async function countRowsWithNullUser(client: DatabaseClient, tableName: SyncTableName): Promise<number> {
  const [row] = await client.sql<CountResultRow>(
    `SELECT COUNT(*) AS count FROM ${tableName} WHERE user_id IS NULL`,
  );

  return Number(row?.count ?? 0);
}

function buildInClauseParams(values: string[]) {
  const placeholders = values.map(() => '?').join(', ');
  return {
    placeholders,
    params: values,
  };
}

export function createSyncRepository(client: DatabaseClient) {
  return {
    async getAnonymousOwnershipCount(): Promise<number> {
      await ensureDatabaseReady();
      const [transactionCount, walletCount, expenseGroupCount, budgetCount] = await Promise.all([
        countRowsWithNullUser(client, 'transactions'),
        countRowsWithNullUser(client, 'wallets'),
        countRowsWithNullUser(client, 'expense_groups'),
        countRowsWithNullUser(client, 'budgets'),
      ]);

      return transactionCount + walletCount + expenseGroupCount + budgetCount;
    },

    async adoptAnonymousRows(userId: string): Promise<void> {
      await ensureDatabaseReady();
      const timestamp = isoNow();

      await client.sql(
        `UPDATE wallets
         SET user_id = ?,
             is_synced = 0,
             last_modified = ?
         WHERE user_id IS NULL`,
        userId,
        timestamp,
      );

      await client.sql(
        `UPDATE expense_groups
         SET user_id = ?,
             is_synced = 0,
             last_modified = ?
         WHERE user_id IS NULL`,
        userId,
        timestamp,
      );

      await client.sql(
        `UPDATE transactions
         SET user_id = ?,
             is_synced = 0,
             last_modified = ?
         WHERE user_id IS NULL`,
        userId,
        timestamp,
      );

      await client.sql(
        `UPDATE budgets
         SET user_id = ?,
             is_synced = 0,
             last_modified = ?
         WHERE user_id IS NULL`,
        userId,
        timestamp,
      );
    },

    async getPendingRowsForUser(userId: string): Promise<SyncPendingData> {
      await ensureDatabaseReady();
      const [wallets, expenseGroups, transactions, budgets] = await Promise.all([
        client.sql<SyncWalletRow>(
          `SELECT *
           FROM wallets
           WHERE user_id = ?
             AND is_synced = 0
           ORDER BY last_modified ASC, id ASC`,
          userId,
        ),
        client.sql<SyncExpenseGroupRow>(
          `SELECT *
           FROM expense_groups
           WHERE user_id = ?
             AND is_synced = 0
           ORDER BY last_modified ASC, id ASC`,
          userId,
        ),
        client.sql<SyncTransactionRow>(
          `SELECT *
           FROM transactions
           WHERE user_id = ?
             AND is_synced = 0
           ORDER BY last_modified ASC, id ASC`,
          userId,
        ),
        client.sql<SyncBudgetRow>(
          `SELECT *, COALESCE(uuid, id) AS uuid
           FROM budgets
           WHERE user_id = ?
             AND is_synced = 0
           ORDER BY last_modified ASC, id ASC`,
          userId,
        ),
      ]);

      return {
        wallets,
        expenseGroups,
        transactions,
        budgets,
      };
    },

    async getWalletRowsForUser(userId: string): Promise<SyncWalletRow[]> {
      await ensureDatabaseReady();
      return client.sql<SyncWalletRow>(
        `SELECT *
         FROM wallets
         WHERE user_id = ?
         ORDER BY last_modified ASC, id ASC`,
        userId,
      );
    },

    async getExpenseGroupRowsForUser(userId: string): Promise<SyncExpenseGroupRow[]> {
      await ensureDatabaseReady();
      return client.sql<SyncExpenseGroupRow>(
        `SELECT *
         FROM expense_groups
         WHERE user_id = ?
         ORDER BY last_modified ASC, id ASC`,
        userId,
      );
    },

    async getTransactionRowsForUser(userId: string): Promise<SyncTransactionRow[]> {
      await ensureDatabaseReady();
      return client.sql<SyncTransactionRow>(
        `SELECT *
         FROM transactions
         WHERE user_id = ?
         ORDER BY last_modified ASC, id ASC`,
        userId,
      );
    },

    async getBudgetRowsForUser(userId: string): Promise<SyncBudgetRow[]> {
      await ensureDatabaseReady();
      return client.sql<SyncBudgetRow>(
        `SELECT *, COALESCE(uuid, id) AS uuid
         FROM budgets
         WHERE user_id = ?
         ORDER BY last_modified ASC, id ASC`,
        userId,
      );
    },

    async markRowsSynced(tableName: SyncTableName, userId: string, uuids: string[]): Promise<void> {
      await ensureDatabaseReady();

      if (!uuids.length) {
        return;
      }

      const uniqueUuids = [...new Set(uuids.filter((uuid) => uuid.trim()))];
      if (!uniqueUuids.length) {
        return;
      }

      const { placeholders, params } = buildInClauseParams(uniqueUuids);
      await client.sql(
        `UPDATE ${tableName}
         SET is_synced = 1
         WHERE user_id = ?
           AND uuid IN (${placeholders})`,
        userId,
        ...params,
      );
    },

    async getWalletByUuid(uuid: string): Promise<SyncWalletRow | null> {
      await ensureDatabaseReady();
      const [row] = await client.sql<SyncWalletRow>('SELECT * FROM wallets WHERE uuid = ?', uuid);
      return row ?? null;
    },

    async getExpenseGroupByUuid(uuid: string): Promise<SyncExpenseGroupRow | null> {
      await ensureDatabaseReady();
      const [row] = await client.sql<SyncExpenseGroupRow>(
        'SELECT * FROM expense_groups WHERE uuid = ?',
        uuid,
      );
      return row ?? null;
    },

    async getTransactionByUuid(uuid: string): Promise<SyncTransactionRow | null> {
      await ensureDatabaseReady();
      const [row] = await client.sql<SyncTransactionRow>(
        'SELECT * FROM transactions WHERE uuid = ?',
        uuid,
      );
      return row ?? null;
    },

    async getBudgetByUuid(uuid: string): Promise<SyncBudgetRow | null> {
      await ensureDatabaseReady();
      const [row] = await client.sql<SyncBudgetRow>(
        'SELECT *, COALESCE(uuid, id) AS uuid FROM budgets WHERE uuid = ? OR id = ?',
        uuid,
        uuid,
      );
      return row ?? null;
    },

    async upsertWalletFromRemote(row: SyncWalletRow): Promise<void> {
      await ensureDatabaseReady();
      await client.sql(
        `INSERT INTO wallets (
          name,
          type,
          colorValue,
          isHidden,
          sortOrder,
          uuid,
          user_id,
          is_synced,
          last_modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(uuid)
        DO UPDATE SET
          name = excluded.name,
          type = excluded.type,
          colorValue = excluded.colorValue,
          isHidden = excluded.isHidden,
          sortOrder = excluded.sortOrder,
          user_id = excluded.user_id,
          is_synced = 1,
          last_modified = excluded.last_modified`,
        row.name,
        row.type,
        row.colorValue,
        row.isHidden,
        row.sortOrder,
        row.uuid,
        row.user_id,
        row.last_modified,
      );
    },

    async upsertExpenseGroupFromRemote(row: SyncExpenseGroupRow): Promise<void> {
      await ensureDatabaseReady();
      const createdAt = normalizeToSqliteTimestamp(row.createdAt);
      const updatedAt = normalizeToSqliteTimestamp(row.updatedAt);
      await client.sql(
        `INSERT INTO expense_groups (
          name,
          description,
          createdAt,
          updatedAt,
          uuid,
          user_id,
          is_synced,
          last_modified
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(uuid)
        DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          createdAt = excluded.createdAt,
          updatedAt = excluded.updatedAt,
          user_id = excluded.user_id,
          is_synced = 1,
          last_modified = excluded.last_modified`,
        row.name,
        row.description,
        createdAt,
        updatedAt,
        row.uuid,
        row.user_id,
        row.last_modified,
      );
    },

    async upsertTransactionFromRemote(row: SyncTransactionRow): Promise<void> {
      await ensureDatabaseReady();
      const transactionDate = normalizeToSqliteTimestamp(row.date);
      const walletId = row.wallet_uuid
        ? Number((await client.sql<{ id: number }>('SELECT id FROM wallets WHERE uuid = ?', row.wallet_uuid))[0]?.id ?? null)
        : row.walletId ?? null;
      const groupId = row.group_uuid
        ? Number((await client.sql<{ id: number }>('SELECT id FROM expense_groups WHERE uuid = ?', row.group_uuid))[0]?.id ?? null)
        : row.groupId ?? null;
      await client.sql(
        `INSERT INTO transactions (
          amount,
          category,
          description,
          date,
          type,
          imagePath,
          groupId,
          group_uuid,
          walletId,
          wallet_uuid,
          uuid,
          user_id,
          is_synced,
          last_modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(uuid)
        DO UPDATE SET
          amount = excluded.amount,
          category = excluded.category,
          description = excluded.description,
          date = excluded.date,
          type = excluded.type,
          imagePath = excluded.imagePath,
          groupId = excluded.groupId,
          group_uuid = excluded.group_uuid,
          walletId = excluded.walletId,
          wallet_uuid = excluded.wallet_uuid,
          user_id = excluded.user_id,
          is_synced = 1,
          last_modified = excluded.last_modified`,
        row.amount,
        row.category,
        row.description,
        transactionDate,
        row.type,
        row.imagePath,
        groupId,
        row.group_uuid ?? null,
        walletId,
        row.wallet_uuid ?? null,
        row.uuid,
        row.user_id,
        row.last_modified,
      );
    },

    async upsertBudgetFromRemote(row: SyncBudgetRow): Promise<void> {
      await ensureDatabaseReady();
      const budgetId = row.id && row.id.trim() ? row.id : row.uuid;
      await client.sql(
        `INSERT INTO budgets (
          id,
          category,
          limit_amount,
          uuid,
          user_id,
          is_synced,
          last_modified
        ) VALUES (?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(uuid)
        DO UPDATE SET
          id = excluded.id,
          category = excluded.category,
          limit_amount = excluded.limit_amount,
          user_id = excluded.user_id,
          is_synced = 1,
          last_modified = excluded.last_modified`,
        budgetId,
        row.category,
        row.limit_amount,
        row.uuid,
        row.user_id,
        row.last_modified,
      );
    },

    async getDeletedEntities(): Promise<Array<{ uuid: string; table_name: string }>> {
      await ensureDatabaseReady();
      return client.sql<{ uuid: string; table_name: string }>('SELECT uuid, table_name FROM deleted_entities');
    },

    async removeDeletedEntity(uuid: string): Promise<void> {
      await ensureDatabaseReady();
      await client.sql('DELETE FROM deleted_entities WHERE uuid = ?', uuid);
    },

    async markEntityAsDeleted(uuid: string, tableName: string): Promise<void> {
      await ensureDatabaseReady();
      await client.sql(
        'INSERT OR IGNORE INTO deleted_entities (uuid, table_name, deleted_at) VALUES (?, ?, ?)',
        uuid,
        tableName,
        isoNow(),
      );
    },
  };
}
