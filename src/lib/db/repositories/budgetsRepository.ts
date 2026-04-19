import { ensureDatabaseReady } from '../client';
import type { DatabaseClient } from '../types';
import type { Budget } from '../../../types/models';
import { fromIsoTimestamp, toIsoTimestamp } from '../../utils/date';

interface BudgetRow {
  id: string;
  category: string;
  limit_amount: number;
  uuid: string | null;
  user_id: string | null;
  is_synced: number;
  last_modified: string | null;
}

function mapBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    category: row.category,
    limitAmount: Number(row.limit_amount),
    uuid: row.uuid ?? undefined,
    userId: row.user_id,
    isSynced: Boolean(Number(row.is_synced ?? 0)),
    lastModified: fromIsoTimestamp(row.last_modified),
  };
}

function toUserFilter(userId?: string | null): { clause: string; params: Array<string> } {
  if (!userId) {
    return { clause: 'user_id IS NULL', params: [] };
  }

  return { clause: 'user_id = ?', params: [userId] };
}

export function createBudgetsRepository(client: DatabaseClient) {
  return {
    async insertBudget(budget: Budget): Promise<string> {
      await ensureDatabaseReady();
      const budgetId = budget.id ?? budget.uuid ?? crypto.randomUUID();
      const budgetUuid = budget.uuid ?? budgetId;
      const lastModified = toIsoTimestamp();

      await client.sql(
        `INSERT INTO budgets (
          id,
          category,
          limit_amount,
          uuid,
          user_id,
          is_synced,
          last_modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        budgetId,
        budget.category,
        budget.limitAmount,
        budgetUuid,
        budget.userId ?? null,
        0,
        lastModified,
      );

      return budgetId;
    },

    async getAllBudgets(userId?: string | null): Promise<Budget[]> {
      await ensureDatabaseReady();
      const { clause, params } = toUserFilter(userId);
      const rows = await client.sql<BudgetRow>(
        `SELECT * FROM budgets WHERE ${clause} ORDER BY category ASC, last_modified DESC`,
        ...params,
      );

      return rows.map(mapBudget);
    },

    async getBudgetByCategory(category: string, userId?: string | null): Promise<Budget | null> {
      await ensureDatabaseReady();
      const { clause, params } = toUserFilter(userId);
      const [row] = await client.sql<BudgetRow>(
        `SELECT *
         FROM budgets
         WHERE category = ? AND ${clause}
         ORDER BY last_modified DESC
         LIMIT 1`,
        category,
        ...params,
      );

      return row ? mapBudget(row) : null;
    },

    async getMonthlyBudgetTotal(userId?: string | null): Promise<number> {
      await ensureDatabaseReady();
      const { clause, params } = toUserFilter(userId);
      const [row] = await client.sql<{ total: number | null }>(
        `SELECT SUM(limit_amount) AS total FROM budgets WHERE ${clause}`,
        ...params,
      );

      return Number(row?.total ?? 0);
    },

    async updateBudget(budget: Budget): Promise<void> {
      await ensureDatabaseReady();
      if (!budget.id) {
        throw new Error('Budget id is required to update a budget.');
      }

      const lastModified = toIsoTimestamp();
      const budgetUuid = budget.uuid ?? budget.id;

      await client.sql(
        `UPDATE budgets
         SET category = ?,
             limit_amount = ?,
             uuid = COALESCE(uuid, ?),
             is_synced = 0,
             last_modified = ?
         WHERE id = ?`,
        budget.category,
        budget.limitAmount,
        budgetUuid,
        lastModified,
        budget.id,
      );
    },

    async deleteBudget(id: string): Promise<void> {
      await ensureDatabaseReady();
      const [row] = await client.sql<{ uuid: string | null }>('SELECT uuid FROM budgets WHERE id = ?', id);
      if (row?.uuid) {
        await client.sql(
          'INSERT OR IGNORE INTO deleted_entities (uuid, table_name, deleted_at) VALUES (?, ?, ?)',
          row.uuid,
          'budgets',
          toIsoTimestamp(),
        );
      }
      await client.sql('DELETE FROM budgets WHERE id = ?', id);
    },

    async clearBudgets(): Promise<void> {
      await ensureDatabaseReady();
      await client.sql('DELETE FROM budgets');
    },
  };
}
