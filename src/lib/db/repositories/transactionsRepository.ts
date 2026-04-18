import { ensureDatabaseReady } from '../client';
import type { DatabaseClient } from '../types';
import type { ExpenseTransaction, TransactionType } from '../../../types/models';
import {
  fromIsoTimestamp,
  fromSqliteTimestamp,
  toIsoTimestamp,
  toSqliteTimestamp,
} from '../../utils/date';

interface TransactionRow {
  id: number;
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
  uuid: string | null;
  user_id: string | null;
  is_synced: number;
  last_modified: string | null;
}

function mapTransaction(row: TransactionRow): ExpenseTransaction {
  return {
    id: Number(row.id),
    amount: Number(row.amount),
    category: row.category,
    description: row.description,
    date: fromSqliteTimestamp(row.date),
    type: row.type as TransactionType,
    imagePath: row.imagePath,
    groupId: row.groupId,
    groupUuid: row.group_uuid,
    walletId: row.walletId,
    walletUuid: row.wallet_uuid,
    uuid: row.uuid ?? undefined,
    userId: row.user_id,
    isSynced: Boolean(Number(row.is_synced ?? 0)),
    lastModified: fromIsoTimestamp(row.last_modified),
  };
}

function transactionToParams(transaction: ExpenseTransaction) {
  return [
    transaction.amount,
    transaction.category,
    transaction.description,
    toSqliteTimestamp(transaction.date),
    transaction.type,
    transaction.imagePath ?? null,
  ];
}

export function createTransactionsRepository(client: DatabaseClient) {
  return {
    async insertTransaction(transaction: ExpenseTransaction): Promise<number> {
      await ensureDatabaseReady();
      const transactionUuid = transaction.uuid ?? crypto.randomUUID();
      const lastModified = toIsoTimestamp();

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
        )
         VALUES (
           ?, ?, ?, ?, ?, ?,
           ?, (SELECT uuid FROM expense_groups WHERE id = ?),
           ?, (SELECT uuid FROM wallets WHERE id = ?),
           ?, ?, ?, ?
         )`,
        ...transactionToParams(transaction),
        transaction.groupId ?? null,
        transaction.groupId ?? null,
        transaction.walletId ?? null,
        transaction.walletId ?? null,
        transactionUuid,
        transaction.userId ?? null,
        0,
        lastModified,
      );
      const [row] = await client.sql<{ id: number }>('SELECT last_insert_rowid() AS id');
      return Number(row.id);
    },

    async getAllTransactions(): Promise<ExpenseTransaction[]> {
      await ensureDatabaseReady();
      const rows = await client.sql<TransactionRow>('SELECT * FROM transactions ORDER BY date DESC');
      return rows.map(mapTransaction);
    },

    async getTransactionsByType(type: TransactionType): Promise<ExpenseTransaction[]> {
      await ensureDatabaseReady();
      const rows = await client.sql<TransactionRow>(
        'SELECT * FROM transactions WHERE type = ? ORDER BY date DESC',
        type,
      );
      return rows.map(mapTransaction);
    },

    async getTransactionsByDateRange(start: Date, end: Date): Promise<ExpenseTransaction[]> {
      await ensureDatabaseReady();
      const rows = await client.sql<TransactionRow>(
        'SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date DESC',
        toSqliteTimestamp(start),
        toSqliteTimestamp(end),
      );
      return rows.map(mapTransaction);
    },

    async getTransactionsByGroup(groupId: number): Promise<ExpenseTransaction[]> {
      await ensureDatabaseReady();
      const rows = await client.sql<TransactionRow>(
        'SELECT * FROM transactions WHERE groupId = ? ORDER BY date DESC',
        groupId,
      );
      return rows.map(mapTransaction);
    },

    async updateTransaction(transaction: ExpenseTransaction): Promise<void> {
      await ensureDatabaseReady();
      const lastModified = toIsoTimestamp();
      const transactionUuid = transaction.uuid ?? crypto.randomUUID();

      await client.sql(
        `UPDATE transactions
         SET amount = ?,
             category = ?,
             description = ?,
             date = ?,
             type = ?,
             imagePath = ?,
             groupId = ?,
             group_uuid = (SELECT uuid FROM expense_groups WHERE id = ?),
             walletId = ?,
             wallet_uuid = (SELECT uuid FROM wallets WHERE id = ?),
             uuid = COALESCE(uuid, ?),
             is_synced = 0,
             last_modified = ?
         WHERE id = ?`,
        ...transactionToParams(transaction),
        transaction.groupId ?? null,
        transaction.groupId ?? null,
        transaction.walletId ?? null,
        transaction.walletId ?? null,
        transactionUuid,
        lastModified,
        transaction.id ?? null,
      );
    },

    async deleteTransaction(id: number): Promise<void> {
      await ensureDatabaseReady();
      const [row] = await client.sql<{ uuid: string | null }>('SELECT uuid FROM transactions WHERE id = ?', id);
      if (row?.uuid) {
        await client.sql(
          'INSERT OR IGNORE INTO deleted_entities (uuid, table_name, deleted_at) VALUES (?, ?, ?)',
          row.uuid,
          'transactions',
          toIsoTimestamp(),
        );
      }
      await client.sql('DELETE FROM transactions WHERE id = ?', id);
    },

    async getTotalByType(type: TransactionType): Promise<number> {
      await ensureDatabaseReady();
      const [row] = await client.sql<{ total: number | null }>(
        'SELECT SUM(amount) AS total FROM transactions WHERE type = ?',
        type,
      );
      return Number(row?.total ?? 0);
    },

    async getCategoryTotals(type: TransactionType): Promise<Record<string, number>> {
      await ensureDatabaseReady();
      const rows = await client.sql<{ category: string; total: number }>(
        'SELECT category, SUM(amount) AS total FROM transactions WHERE type = ? GROUP BY category',
        type,
      );

      return rows.reduce<Record<string, number>>((totals, row) => {
        totals[row.category] = Number(row.total);
        return totals;
      }, {});
    },

    async getGroupTotal(groupId: number): Promise<number> {
      await ensureDatabaseReady();
      const [row] = await client.sql<{ total: number | null }>(
        'SELECT SUM(amount) AS total FROM transactions WHERE groupId = ?',
        groupId,
      );
      return Number(row?.total ?? 0);
    },

    async clearTransactions(): Promise<void> {
      await ensureDatabaseReady();
      await client.sql('DELETE FROM transactions');
    },
  };
}
