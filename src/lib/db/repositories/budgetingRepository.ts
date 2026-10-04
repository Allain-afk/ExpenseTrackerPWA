import { ensureDatabaseReady } from '../client';
import type { DatabaseClient } from '../types';
import type { BudgetAllocation, BudgetCutoff, BudgetPlan } from '../../../types/models';
import { fromIsoTimestamp, toIsoTimestamp } from '../../utils/date';

interface PlanRow {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  notes: string | null;
  sort_order: number;
  uuid: string | null;
  user_id: string | null;
  is_synced: number;
  last_modified: string | null;
}

interface CutoffRow {
  id: string;
  plan_id: string;
  label: string;
  cutoff_date: string | null;
  estimated_amount: number;
  notes: string | null;
  sort_order: number;
  uuid: string | null;
  user_id: string | null;
  is_synced: number;
  last_modified: string | null;
}

interface AllocationRow {
  id: string;
  cutoff_id: string;
  particulars: string;
  amount: number;
  category: string | null;
  payment_method: string | null;
  notes: string | null;
  sort_order: number;
  uuid: string | null;
  user_id: string | null;
  is_synced: number;
  last_modified: string | null;
}

function userFilter(userId?: string | null): { clause: string; params: string[] } {
  return userId
    ? { clause: 'user_id = ?', params: [userId] }
    : { clause: 'user_id IS NULL', params: [] };
}

function mapAllocation(row: AllocationRow): BudgetAllocation {
  return {
    id: row.id,
    cutoffId: row.cutoff_id,
    particulars: row.particulars,
    amount: Number(row.amount),
    category: row.category,
    paymentMethod: row.payment_method,
    notes: row.notes,
    sortOrder: Number(row.sort_order),
    uuid: row.uuid ?? undefined,
    userId: row.user_id,
    isSynced: Boolean(row.is_synced),
    lastModified: row.last_modified ? fromIsoTimestamp(row.last_modified) : null,
  };
}

function mapCutoff(row: CutoffRow, allocations: BudgetAllocation[]): BudgetCutoff {
  return {
    id: row.id,
    planId: row.plan_id,
    label: row.label,
    cutoffDate: row.cutoff_date ? fromIsoTimestamp(row.cutoff_date) : null,
    estimatedAmount: Number(row.estimated_amount),
    notes: row.notes,
    sortOrder: Number(row.sort_order),
    allocations,
    uuid: row.uuid ?? undefined,
    userId: row.user_id,
    isSynced: Boolean(row.is_synced),
    lastModified: row.last_modified ? fromIsoTimestamp(row.last_modified) : null,
  };
}

function mapPlan(row: PlanRow, cutoffs: BudgetCutoff[]): BudgetPlan {
  return {
    id: row.id,
    title: row.title,
    periodStart: fromIsoTimestamp(row.period_start) ?? new Date(),
    periodEnd: fromIsoTimestamp(row.period_end) ?? new Date(),
    notes: row.notes,
    sortOrder: Number(row.sort_order),
    cutoffs,
    uuid: row.uuid ?? undefined,
    userId: row.user_id,
    isSynced: Boolean(row.is_synced),
    lastModified: row.last_modified ? fromIsoTimestamp(row.last_modified) : null,
  };
}

function idFor(value?: string): string {
  return value ?? crypto.randomUUID();
}

export function createBudgetingRepository(client: DatabaseClient) {
  async function getPlanById(id: string, userId?: string | null): Promise<BudgetPlan | null> {
    await ensureDatabaseReady();
    const filter = userFilter(userId);
    const [plan] = await client.sql<PlanRow>(
      `SELECT * FROM budget_plans WHERE id = ? AND ${filter.clause}`,
      id,
      ...filter.params,
    );
    if (!plan) {
      return null;
    }

    const cutoffs = await client.sql<CutoffRow>(
      `SELECT * FROM budget_cutoffs WHERE plan_id = ? AND ${filter.clause} ORDER BY sort_order ASC, last_modified ASC`,
      id,
      ...filter.params,
    );
    const cutoffIds = cutoffs.map((cutoff) => cutoff.id);
    const allocations = cutoffIds.length
      ? await client.sql<AllocationRow>(
        `SELECT * FROM budget_allocations
         WHERE cutoff_id IN (${cutoffIds.map(() => '?').join(', ')}) AND ${filter.clause}
         ORDER BY sort_order ASC, last_modified ASC`,
        ...cutoffIds,
        ...filter.params,
      )
      : [];

    return mapPlan(
      plan,
      cutoffs.map((cutoff) => mapCutoff(
        cutoff,
        allocations.filter((allocation) => allocation.cutoff_id === cutoff.id).map(mapAllocation),
      )),
    );
  }

  return {
    async getAllPlans(userId?: string | null): Promise<BudgetPlan[]> {
      await ensureDatabaseReady();
      const filter = userFilter(userId);
      const rows = await client.sql<PlanRow>(
        `SELECT * FROM budget_plans WHERE ${filter.clause} ORDER BY sort_order ASC, period_start DESC`,
        ...filter.params,
      );
      const plans: BudgetPlan[] = [];
      for (const row of rows) {
        const plan = await getPlanById(row.id, userId);
        if (plan) {
          plans.push(plan);
        }
      }
      return plans;
    },

    async insertPlan(plan: BudgetPlan): Promise<string> {
      await ensureDatabaseReady();
      const id = idFor(plan.id);
      const timestamp = toIsoTimestamp();
      await client.sql(
        `INSERT INTO budget_plans
          (id, title, period_start, period_end, notes, sort_order, uuid, user_id, is_synced, last_modified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        id,
        plan.title,
        toIsoTimestamp(plan.periodStart),
        toIsoTimestamp(plan.periodEnd),
        plan.notes ?? null,
        plan.sortOrder,
        plan.uuid ?? id,
        plan.userId ?? null,
        timestamp,
      );
      return id;
    },

    async updatePlan(plan: BudgetPlan): Promise<void> {
      await ensureDatabaseReady();
      if (!plan.id) throw new Error('Budget plan id is required.');
      await client.sql(
        `UPDATE budget_plans SET title = ?, period_start = ?, period_end = ?, notes = ?,
          sort_order = ?, is_synced = 0, last_modified = ? WHERE id = ?`,
        plan.title,
        toIsoTimestamp(plan.periodStart),
        toIsoTimestamp(plan.periodEnd),
        plan.notes ?? null,
        plan.sortOrder,
        toIsoTimestamp(),
        plan.id,
      );
    },

    async deletePlan(id: string): Promise<void> {
      await ensureDatabaseReady();
      const planRows = await client.sql<{ uuid: string | null }>('SELECT uuid FROM budget_plans WHERE id = ?', id);
      const cutoffRows = await client.sql<{ uuid: string | null }>('SELECT uuid FROM budget_cutoffs WHERE plan_id = ?', id);
      const allocationRows = await client.sql<{ uuid: string | null }>(
        'SELECT uuid FROM budget_allocations WHERE cutoff_id IN (SELECT id FROM budget_cutoffs WHERE plan_id = ?)',
        id,
      );
      for (const [rows, tableName] of [[planRows, 'budget_plans'], [cutoffRows, 'budget_cutoffs'], [allocationRows, 'budget_allocations']] as const) {
        for (const row of rows) {
          if (row.uuid) {
            await client.sql(
              'INSERT OR IGNORE INTO deleted_entities (uuid, table_name, deleted_at) VALUES (?, ?, ?)',
              row.uuid,
              tableName,
              toIsoTimestamp(),
            );
          }
        }
      }
      await client.sql('DELETE FROM budget_allocations WHERE cutoff_id IN (SELECT id FROM budget_cutoffs WHERE plan_id = ?)', id);
      await client.sql('DELETE FROM budget_cutoffs WHERE plan_id = ?', id);
      await client.sql('DELETE FROM budget_plans WHERE id = ?', id);
    },

    async insertCutoff(cutoff: BudgetCutoff): Promise<string> {
      await ensureDatabaseReady();
      const id = idFor(cutoff.id);
      await client.sql(
        `INSERT INTO budget_cutoffs
          (id, plan_id, label, cutoff_date, estimated_amount, notes, sort_order, uuid, user_id, is_synced, last_modified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        id,
        cutoff.planId,
        cutoff.label,
        cutoff.cutoffDate ? toIsoTimestamp(cutoff.cutoffDate) : null,
        cutoff.estimatedAmount,
        cutoff.notes ?? null,
        cutoff.sortOrder,
        cutoff.uuid ?? id,
        cutoff.userId ?? null,
        toIsoTimestamp(),
      );
      return id;
    },

    async updateCutoff(cutoff: BudgetCutoff): Promise<void> {
      await ensureDatabaseReady();
      if (!cutoff.id) throw new Error('Budget cutoff id is required.');
      await client.sql(
        `UPDATE budget_cutoffs SET label = ?, cutoff_date = ?, estimated_amount = ?, notes = ?,
          sort_order = ?, is_synced = 0, last_modified = ? WHERE id = ?`,
        cutoff.label,
        cutoff.cutoffDate ? toIsoTimestamp(cutoff.cutoffDate) : null,
        cutoff.estimatedAmount,
        cutoff.notes ?? null,
        cutoff.sortOrder,
        toIsoTimestamp(),
        cutoff.id,
      );
    },

    async deleteCutoff(id: string): Promise<void> {
      await ensureDatabaseReady();
      const cutoffRows = await client.sql<{ uuid: string | null }>('SELECT uuid FROM budget_cutoffs WHERE id = ?', id);
      const allocationRows = await client.sql<{ uuid: string | null }>('SELECT uuid FROM budget_allocations WHERE cutoff_id = ?', id);
      for (const [rows, tableName] of [[cutoffRows, 'budget_cutoffs'], [allocationRows, 'budget_allocations']] as const) {
        for (const row of rows) {
          if (row.uuid) {
            await client.sql(
              'INSERT OR IGNORE INTO deleted_entities (uuid, table_name, deleted_at) VALUES (?, ?, ?)',
              row.uuid,
              tableName,
              toIsoTimestamp(),
            );
          }
        }
      }
      await client.sql('DELETE FROM budget_allocations WHERE cutoff_id = ?', id);
      await client.sql('DELETE FROM budget_cutoffs WHERE id = ?', id);
    },

    async insertAllocation(allocation: BudgetAllocation): Promise<string> {
      await ensureDatabaseReady();
      const id = idFor(allocation.id);
      await client.sql(
        `INSERT INTO budget_allocations
          (id, cutoff_id, particulars, amount, category, payment_method, notes, sort_order, uuid, user_id, is_synced, last_modified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        id,
        allocation.cutoffId,
        allocation.particulars,
        allocation.amount,
        allocation.category ?? null,
        allocation.paymentMethod ?? null,
        allocation.notes ?? null,
        allocation.sortOrder,
        allocation.uuid ?? id,
        allocation.userId ?? null,
        toIsoTimestamp(),
      );
      return id;
    },

    async updateAllocation(allocation: BudgetAllocation): Promise<void> {
      await ensureDatabaseReady();
      if (!allocation.id) throw new Error('Budget allocation id is required.');
      await client.sql(
        `UPDATE budget_allocations SET particulars = ?, amount = ?, category = ?, payment_method = ?,
          notes = ?, sort_order = ?, is_synced = 0, last_modified = ? WHERE id = ?`,
        allocation.particulars,
        allocation.amount,
        allocation.category ?? null,
        allocation.paymentMethod ?? null,
        allocation.notes ?? null,
        allocation.sortOrder,
        toIsoTimestamp(),
        allocation.id,
      );
    },

    async deleteAllocation(id: string): Promise<void> {
      await ensureDatabaseReady();
      const [row] = await client.sql<{ uuid: string | null }>('SELECT uuid FROM budget_allocations WHERE id = ?', id);
      if (row?.uuid) {
        await client.sql(
          'INSERT OR IGNORE INTO deleted_entities (uuid, table_name, deleted_at) VALUES (?, ?, ?)',
          row.uuid,
          'budget_allocations',
          toIsoTimestamp(),
        );
      }
      await client.sql('DELETE FROM budget_allocations WHERE id = ?', id);
    },
  };
}
