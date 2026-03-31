import { ensureDatabaseReady } from '../client';
import type { DatabaseClient } from '../types';
import type { AnalyticsCategoryTotal, AnalyticsSummary, BudgetVsActualSummary, DailySpendPoint } from '../../../types/models';

interface UserScopedQuery {
  clause: string;
  params: Array<string>;
}

interface DateRange {
  start: Date;
  end: Date;
}

function monthRange(referenceDate: Date): { start: Date; end: Date } {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function weekRange(referenceDate: Date): { start: Date; end: Date } {
  const end = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    23,
    59,
    59,
    999,
  );

  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

function dayRange(referenceDate: Date, days: number): DateRange {
  const safeDays = Math.max(1, Math.floor(days));
  const end = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    23,
    59,
    59,
    999,
  );
  const start = new Date(end);
  start.setDate(end.getDate() - (safeDays - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function toSqlDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toSqlDateTime(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const seconds = String(value.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function toUserScope(userId?: string | null): UserScopedQuery {
  if (!userId) {
    return { clause: '1 = 1', params: [] };
  }

  return { clause: 'user_id = ?', params: [userId] };
}

function computeBudgetVsActual(
  category: string,
  actual: number,
  budget: number,
): BudgetVsActualSummary {
  const percentage = budget > 0 ? (actual / budget) * 100 : 0;

  return {
    category,
    actual,
    budget,
    percentage,
  };
}

export function createAnalyticsRepository(client: DatabaseClient) {
  async function getDailySpendSeries(
    range: DateRange,
    userScope: UserScopedQuery,
  ): Promise<DailySpendPoint[]> {
    const weeklyRows = await client.sql<{ day_key: string; total: number }>(
      `SELECT SUBSTR(date, 1, 10) AS day_key, SUM(amount) AS total
       FROM transactions
       WHERE type = 'expense'
         AND ${userScope.clause}
         AND date BETWEEN ? AND ?
       GROUP BY SUBSTR(date, 1, 10)
       ORDER BY day_key ASC`,
      ...userScope.params,
      toSqlDateTime(range.start),
      toSqlDateTime(range.end),
    );

    const dailyMap = new Map<string, number>();
    for (const row of weeklyRows) {
      dailyMap.set(row.day_key, Number(row.total ?? 0));
    }

    const daysDiff = Math.round((range.end.getTime() - range.start.getTime()) / 86400000);
    const points: DailySpendPoint[] = [];

    for (let dayOffset = 0; dayOffset <= daysDiff; dayOffset += 1) {
      const day = new Date(range.start);
      day.setDate(range.start.getDate() + dayOffset);
      const dayKey = toSqlDate(day);
      points.push({
        date: day,
        total: Number(dailyMap.get(dayKey) ?? 0),
      });
    }

    return points;
  }

  return {
    async getAnalyticsSummary(
      options?: {
        referenceDate?: Date;
        userId?: string | null;
      },
    ): Promise<AnalyticsSummary> {
      await ensureDatabaseReady();

      const referenceDate = options?.referenceDate ?? new Date();
      const { start: monthStart, end: monthEnd } = monthRange(referenceDate);
      const { start: weekStart, end: weekEnd } = weekRange(referenceDate);
      const userScope = toUserScope(options?.userId ?? null);

      const [monthlyTotalRow] = await client.sql<{ total: number | null }>(
        `SELECT SUM(amount) AS total
         FROM transactions
         WHERE type = 'expense'
           AND ${userScope.clause}
           AND date BETWEEN ? AND ?`,
        ...userScope.params,
        toSqlDateTime(monthStart),
        toSqlDateTime(monthEnd),
      );

      const topCategoryRows = await client.sql<{ category: string; amount: number }>(
        `SELECT category, SUM(amount) AS amount
         FROM transactions
         WHERE type = 'expense'
           AND ${userScope.clause}
           AND date BETWEEN ? AND ?
         GROUP BY category
         ORDER BY amount DESC
         LIMIT 3`,
        ...userScope.params,
        toSqlDateTime(monthStart),
        toSqlDateTime(monthEnd),
      );

      const [monthlyBudgetRow] = await client.sql<{ total_limit: number | null }>(
        `SELECT SUM(limit_amount) AS total_limit
         FROM budgets
         WHERE ${userScope.clause}`,
        ...userScope.params,
      );

      const weeklySpend = await getDailySpendSeries({ start: weekStart, end: weekEnd }, userScope);

      const topCategories: AnalyticsCategoryTotal[] = topCategoryRows.map((row) => ({
        category: row.category,
        amount: Number(row.amount),
      }));

      let topCategoryBudgetVsActual: BudgetVsActualSummary | null = null;
      const topCategory = topCategories[0];

      if (topCategory) {
        const [topCategoryBudgetRow] = await client.sql<{ limit_amount: number | null }>(
          `SELECT limit_amount
           FROM budgets
           WHERE category = ?
             AND ${userScope.clause}
           ORDER BY last_modified DESC
           LIMIT 1`,
          topCategory.category,
          ...userScope.params,
        );

        if (typeof topCategoryBudgetRow?.limit_amount === 'number') {
          topCategoryBudgetVsActual = computeBudgetVsActual(
            topCategory.category,
            topCategory.amount,
            Number(topCategoryBudgetRow.limit_amount),
          );
        }
      }

      const monthlyTotal = Number(monthlyTotalRow?.total ?? 0);
      const monthlyBudgetLimit = Number(monthlyBudgetRow?.total_limit ?? 0);

      return {
        monthlyTotal,
        monthlyBudgetLimit,
        monthlyBudgetPercentage: monthlyBudgetLimit > 0 ? (monthlyTotal / monthlyBudgetLimit) * 100 : 0,
        topCategories,
        topCategoryBudgetVsActual,
        weeklySpend,
      };
    },

    async getDailySpendSeries(
      options?: {
        referenceDate?: Date;
        days?: number;
        userId?: string | null;
      },
    ): Promise<DailySpendPoint[]> {
      await ensureDatabaseReady();
      const referenceDate = options?.referenceDate ?? new Date();
      const days = options?.days ?? 7;
      const range = dayRange(referenceDate, days);
      const userScope = toUserScope(options?.userId ?? null);
      return getDailySpendSeries(range, userScope);
    },

    async getTopCategories(
      options?: {
        referenceDate?: Date;
        limit?: number;
        userId?: string | null;
      },
    ): Promise<AnalyticsCategoryTotal[]> {
      await ensureDatabaseReady();
      const referenceDate = options?.referenceDate ?? new Date();
      const { start, end } = monthRange(referenceDate);
      const userScope = toUserScope(options?.userId ?? null);
      const limit = Math.max(1, Math.floor(options?.limit ?? 3));

      const rows = await client.sql<{ category: string; amount: number }>(
        `SELECT category, SUM(amount) AS amount
         FROM transactions
         WHERE type = 'expense'
           AND ${userScope.clause}
           AND date BETWEEN ? AND ?
         GROUP BY category
         ORDER BY amount DESC
         LIMIT ?`,
        ...userScope.params,
        toSqlDateTime(start),
        toSqlDateTime(end),
        limit,
      );

      return rows.map((row) => ({
        category: row.category,
        amount: Number(row.amount ?? 0),
      }));
    },

    async getMonthlyCategorySpend(
      category: string,
      options?: {
        referenceDate?: Date;
        userId?: string | null;
      },
    ): Promise<number> {
      await ensureDatabaseReady();
      const referenceDate = options?.referenceDate ?? new Date();
      const { start, end } = monthRange(referenceDate);
      const userScope = toUserScope(options?.userId ?? null);

      const [row] = await client.sql<{ total: number | null }>(
        `SELECT SUM(amount) AS total
         FROM transactions
         WHERE type = 'expense'
           AND category = ?
           AND ${userScope.clause}
           AND date BETWEEN ? AND ?`,
        category,
        ...userScope.params,
        toSqlDateTime(start),
        toSqlDateTime(end),
      );

      return Number(row?.total ?? 0);
    },
  };
}
