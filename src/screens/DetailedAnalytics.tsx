import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { PageHeader } from '../components/common/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { useBudgets } from '../hooks/useBudgets';
import { createAnalyticsRepository } from '../lib/db/repositories/analyticsRepository';
import { databaseClient } from '../lib/db/client';
import { expenseCategories } from '../lib/constants/categories';
import { formatMoney } from '../lib/utils/format';
import { showErrorToast, showSuccessToast } from '../lib/utils/appToast';
import type { AnalyticsCategoryTotal, AnalyticsSummary, Budget, DailySpendPoint } from '../types/models';
import styles from './DetailedAnalytics.module.css';

const analyticsRepository = createAnalyticsRepository(databaseClient);

interface DetailedAnalyticsProps {
  currencySymbol: string;
}

function formatTooltipCurrency(
  value: string | number | ReadonlyArray<string | number> | undefined,
  currencySymbol: string,
): string {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0);
  return formatMoney(Number.isFinite(numericValue) ? numericValue : 0, currencySymbol);
}

function toDayLabel(point: DailySpendPoint): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(point.date);
}

export function DetailedAnalytics({ currencySymbol }: DetailedAnalyticsProps) {
  const { user } = useAuth();
  const budgets = useBudgets();

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [monthlyTopCategories, setMonthlyTopCategories] = useState<AnalyticsCategoryTotal[]>([]);
  const [thirtyDaySeries, setThirtyDaySeries] = useState<DailySpendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<(typeof expenseCategories)[number]>(
    expenseCategories[0],
  );
  const [limitAmountInput, setLimitAmountInput] = useState('');
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const budgetRows = useMemo(() => {
    return [...budgets.budgets].sort((a, b) => a.category.localeCompare(b.category));
  }, [budgets.budgets]);

  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextSummary, nextTopCategories, nextThirtyDays] = await Promise.all([
        analyticsRepository.getAnalyticsSummary({ userId: user?.id ?? null }),
        analyticsRepository.getTopCategories({ userId: user?.id ?? null, limit: 5 }),
        analyticsRepository.getDailySpendSeries({ userId: user?.id ?? null, days: 30 }),
      ]);

      setSummary(nextSummary);
      setMonthlyTopCategories(nextTopCategories);
      setThirtyDaySeries(nextThirtyDays);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load analytics data.';
      showErrorToast('Analytics unavailable', message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    let isCancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!isCancelled) {
        void loadAnalyticsData();
      }
    }, 40);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [budgets.budgets, loadAnalyticsData]);

  async function handleBudgetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedLimit = Number(limitAmountInput);

    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      showErrorToast('Invalid budget', 'Enter a valid budget amount greater than zero.');
      return;
    }

    setIsSavingBudget(true);

    try {
      if (editingBudgetId) {
        const existing = budgets.budgets.find((item) => item.id === editingBudgetId);
        if (!existing) {
          throw new Error('The selected budget no longer exists.');
        }

        await budgets.updateBudget({
          ...existing,
          category: selectedCategory,
          limitAmount: parsedLimit,
        });

        showSuccessToast('Budget updated', `${selectedCategory} cap is now ${formatMoney(parsedLimit, currencySymbol)}.`);
      } else {
        await budgets.addBudget({
          category: selectedCategory,
          limitAmount: parsedLimit,
          userId: user?.id ?? null,
        });

        showSuccessToast('Budget created', `${selectedCategory} budget set to ${formatMoney(parsedLimit, currencySymbol)}.`);
      }

      setEditingBudgetId(null);
      setLimitAmountInput('');
      setSelectedCategory(expenseCategories[0]);
      await loadAnalyticsData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save budget right now.';
      showErrorToast('Budget save failed', message);
    } finally {
      setIsSavingBudget(false);
    }
  }

  function startEditingBudget(budget: Budget) {
    setEditingBudgetId(budget.id ?? null);
    setSelectedCategory(budget.category as (typeof expenseCategories)[number]);
    setLimitAmountInput(String(budget.limitAmount));
  }

  async function deleteBudget(budget: Budget) {
    if (!budget.id) {
      return;
    }

    const isConfirmed = window.confirm(`Delete ${budget.category} budget?`);
    if (!isConfirmed) {
      return;
    }

    try {
      await budgets.deleteBudget(budget.id);
      showSuccessToast('Budget deleted', `${budget.category} budget was removed.`);
      await loadAnalyticsData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete budget right now.';
      showErrorToast('Delete failed', message);
    }
  }

  const weeklyChartData = (summary?.weeklySpend ?? []).map((point) => ({
    day: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(point.date),
    value: point.total,
  }));

  const thirtyDayChartData = thirtyDaySeries.map((point) => ({
    day: toDayLabel(point),
    value: point.total,
  }));

  return (
    <main className="app-page">
      <div className="page-content">
        <PageHeader
          backTo="/app/home"
          subtitle="Review top categories, 7/30-day trends, and manage monthly category budgets."
          title="Detailed Analytics"
        />

        <section className={`app-card ${styles.chartCard}`}>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryTile}>
              <p className={styles.summaryLabel}>This month spent</p>
              <p className={styles.summaryValue}>
                {formatMoney(summary?.monthlyTotal ?? 0, currencySymbol)}
              </p>
            </div>
            <div className={styles.summaryTile}>
              <p className={styles.summaryLabel}>Monthly budget</p>
              <p className={styles.summaryValue}>
                {formatMoney(summary?.monthlyBudgetLimit ?? 0, currencySymbol)}
              </p>
            </div>
            <div className={styles.summaryTile}>
              <p className={styles.summaryLabel}>Budget used</p>
              <p className={styles.summaryValue}>{Math.round(summary?.monthlyBudgetPercentage ?? 0)}%</p>
            </div>
            <div className={styles.summaryTile}>
              <p className={styles.summaryLabel}>Top category</p>
              <p className={styles.summaryValue}>{monthlyTopCategories[0]?.category ?? 'No data'}</p>
            </div>
          </div>
        </section>

        <section className={`app-card ${styles.chartCard}`}>
          <h2 className={styles.chartTitle}>Last 7 days spending</h2>
          <div className={styles.chartFrame}>
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={weeklyChartData}>
                <XAxis axisLine={false} dataKey="day" tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatTooltipCurrency(value, currencySymbol)} />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={`app-card ${styles.chartCard}`}>
          <h2 className={styles.chartTitle}>Last 30 days spending</h2>
          <div className={styles.chartFrame}>
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={thirtyDayChartData}>
                <XAxis axisLine={false} dataKey="day" hide tickLine={false} />
                <Tooltip formatter={(value) => formatTooltipCurrency(value, currencySymbol)} />
                <Bar dataKey="value" fill="var(--color-secondary)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={`app-card ${styles.chartCard}`}>
          <h2 className={styles.chartTitle}>Top categories this month</h2>
          <div className="inset-list">
            {monthlyTopCategories.length ? (
              monthlyTopCategories.map((item) => (
                <div className="inset-item" key={item.category}>
                  <span className="inset-item-content">
                    <span className="inset-title">{item.category}</span>
                    <span className="inset-subtitle">Monthly expense total</span>
                  </span>
                  <strong className="numeric-strong">{formatMoney(item.amount, currencySymbol)}</strong>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <h3>{isLoading ? 'Loading categories...' : 'No expense data yet'}</h3>
                <p>Add transactions to populate category analytics.</p>
              </div>
            )}
          </div>
        </section>

        <section className={`app-card ${styles.budgetSection}`}>
          <div>
            <p className="eyebrow">Budget Management</p>
            <h2 style={{ margin: '0.25rem 0 0' }}>Category Budgets</h2>
          </div>

          <form className={styles.budgetForm} onSubmit={(event) => void handleBudgetSubmit(event)}>
            <div className="form-field">
              <label className="field-label" htmlFor="budget-category">
                Category
              </label>
              <select
                className="select-input"
                id="budget-category"
                onChange={(event) => setSelectedCategory(event.target.value as (typeof expenseCategories)[number])}
                value={selectedCategory}
              >
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="budget-limit">
                Monthly Limit ({currencySymbol})
              </label>
              <input
                className="text-input"
                id="budget-limit"
                inputMode="decimal"
                onChange={(event) => setLimitAmountInput(event.target.value)}
                placeholder="0.00"
                value={limitAmountInput}
              />
            </div>

            <div className={styles.budgetActions}>
              {editingBudgetId ? (
                <button
                  className={`secondary-button ${styles.smallButton}`}
                  onClick={() => {
                    setEditingBudgetId(null);
                    setLimitAmountInput('');
                    setSelectedCategory(expenseCategories[0]);
                  }}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
              <button className={`primary-button ${styles.smallButton}`} disabled={isSavingBudget} type="submit">
                {editingBudgetId ? 'Update Budget' : 'Add Budget'}
              </button>
            </div>
          </form>

          <div className={styles.budgetList}>
            {budgetRows.length ? (
              budgetRows.map((budget) => (
                <div className={styles.budgetRow} key={budget.id}>
                  <div className={styles.budgetMeta}>
                    <p className={styles.budgetTitle}>{budget.category}</p>
                    <p className={styles.budgetHint}>{formatMoney(budget.limitAmount, currencySymbol)} monthly limit</p>
                  </div>
                  <div className={styles.budgetRowActions}>
                    <button
                      className={`secondary-button ${styles.smallButton}`}
                      onClick={() => startEditingBudget(budget)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className={`danger-button ${styles.smallButton}`}
                      onClick={() => void deleteBudget(budget)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <h3>No budgets yet</h3>
                <p>Add a category budget above to start tracking limits.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
