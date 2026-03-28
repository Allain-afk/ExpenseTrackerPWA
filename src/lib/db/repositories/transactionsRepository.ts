import { ensureDatabaseReady } from '../client';
import type { DatabaseClient } from '../types';
import type { ExpenseTransaction, TransactionType } from '../../../types/models';
import { fromSqliteTimestamp, toSqliteTimestamp } from '../../utils/date';

interface TransactionRow {
  id: number;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: string;
  imagePath: string | null;
  groupId: number | null;
  walletId: number | null;
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
    walletId: row.walletId,
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
    transaction.groupId ?? null,
    transaction.walletId ?? null,
  ];
}

export function createTransactionsRepository(client: DatabaseClient) {
  return {
    async insertTransaction(transaction: ExpenseTransaction): Promise<number> {
      await ensureDatabaseReady();
      await client.sql(
        `INSERT INTO transactions (amount, category, description, date, type, imagePath, groupId, walletId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ...transactionToParams(transaction),
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
      await client.sql(
        `UPDATE transactions
         SET amount = ?, category = ?, description = ?, date = ?, type = ?, imagePath = ?, groupId = ?, walletId = ?
         WHERE id = ?`,
        ...transactionToParams(transaction),
        transaction.id ?? null,
      );
    },

    async deleteTransaction(id: number): Promise<void> {
      await ensureDatabaseReady();
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
