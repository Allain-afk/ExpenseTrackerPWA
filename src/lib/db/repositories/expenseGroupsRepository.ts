import { ensureDatabaseReady } from '../client';
import type { DatabaseClient } from '../types';
import type { ExpenseGroup } from '../../../types/models';
import { fromSqliteTimestamp, toSqliteTimestamp } from '../../utils/date';

interface ExpenseGroupRow {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapGroup(row: ExpenseGroupRow): ExpenseGroup {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    createdAt: fromSqliteTimestamp(row.createdAt),
    updatedAt: fromSqliteTimestamp(row.updatedAt),
  };
}

export function createExpenseGroupsRepository(client: DatabaseClient) {
  return {
    async insertExpenseGroup(group: ExpenseGroup): Promise<number> {
      await ensureDatabaseReady();
      await client.sql(
        `INSERT INTO expense_groups (name, description, createdAt, updatedAt)
         VALUES (?, ?, ?, ?)`,
        group.name,
        group.description ?? null,
        toSqliteTimestamp(group.createdAt),
        toSqliteTimestamp(group.updatedAt),
      );
      const [row] = await client.sql<{ id: number }>('SELECT last_insert_rowid() AS id');
      return Number(row.id);
    },

    async getAllExpenseGroups(): Promise<ExpenseGroup[]> {
      await ensureDatabaseReady();
      const rows = await client.sql<ExpenseGroupRow>(
        'SELECT * FROM expense_groups ORDER BY createdAt DESC',
      );
      return rows.map(mapGroup);
    },

    async getExpenseGroupById(id: number): Promise<ExpenseGroup | null> {
      await ensureDatabaseReady();
      const [row] = await client.sql<ExpenseGroupRow>(
        'SELECT * FROM expense_groups WHERE id = ?',
        id,
      );
      return row ? mapGroup(row) : null;
    },

    async updateExpenseGroup(group: ExpenseGroup): Promise<void> {
      await ensureDatabaseReady();
      await client.sql(
        `UPDATE expense_groups
         SET name = ?, description = ?, createdAt = ?, updatedAt = ?
         WHERE id = ?`,
        group.name,
        group.description ?? null,
        toSqliteTimestamp(group.createdAt),
        toSqliteTimestamp(group.updatedAt),
        group.id ?? null,
      );
    },

    async deleteExpenseGroup(id: number): Promise<void> {
      await ensureDatabaseReady();
      await client.sql('UPDATE transactions SET groupId = NULL WHERE groupId = ?', id);
      await client.sql('DELETE FROM expense_groups WHERE id = ?', id);
    },

    async getGroupsWithTotals(): Promise<Array<ExpenseGroup & { total: number }>> {
      await ensureDatabaseReady();
      const rows = await client.sql<ExpenseGroupRow & { total: number }>(`
        SELECT
          eg.id,
          eg.name,
          eg.description,
          eg.createdAt,
          eg.updatedAt,
          COALESCE(SUM(t.amount), 0) AS total
        FROM expense_groups eg
        LEFT JOIN transactions t ON eg.id = t.groupId
        GROUP BY eg.id
        ORDER BY eg.createdAt DESC
      `);

      return rows.map((row) => ({ ...mapGroup(row), total: Number(row.total) }));
    },
  };
}
