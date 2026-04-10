import { startTransition, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { MdInsights } from 'react-icons/md';
import { SectionList } from './SectionList';
import { useAuth } from '../../hooks/useAuth';
import { useBudgets } from '../../hooks/useBudgets';
import { useTransactions } from '../../hooks/useTransactions';
import { createAnalyticsRepository } from '../../lib/db/repositories/analyticsRepository';
import { databaseClient } from '../../lib/db/client';
import type { AnalyticsSummary } from '../../types/models';
import { formatMoney } from '../../lib/utils/format';
import styles from './AnalyticsOverview.module.css';

interface AnalyticsOverviewProps {
  currencySymbol: string;
  tipTitle: string;
  tipDescription: string;
  onSeeFullReport: () => void;
}

const analyticsRepository = createAnalyticsRepository(databaseClient);

const tipKeywordMap: Array<{ category: string; keywords: string[] }> = [
  { category: 'Food', keywords: ['coffee', 'grocery', 'snack', 'takeout', 'meal', 'food', 'drink'] },
  { category: 'Transportation', keywords: ['transport', 'commute', 'fare', 'fuel', 'gas', 'trip'] },
  { category: 'Shopping', keywords: ['shopping', 'sale', 'buy', 'purchase', 'brand', 'store'] },
  { category: 'Utilities', keywords: ['utility', 'internet', 'subscription', 'bill', 'fees'] },
  { category: 'Entertainment', keywords: ['entertainment', 'stream', 'movie', 'gaming'] },
];

function mapTipCategory(tipTitle: string, tipDescription: string): string | null {
  const joined = `${tipTitle} ${tipDescription}`.toLowerCase();

  for (const entry of tipKeywordMap) {
    if (entry.keywords.some((keyword) => joined.includes(keyword))) {
      return entry.category;
    }
  }

  return null;
}

function toPercent(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(value, 999)) : 0;
}

function formatTooltipCurrency(
  value: string | number | ReadonlyArray<string | number> | undefined,
  currencySymbol: string,
): string {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0);
  return formatMoney(Number.isFinite(numericValue) ? numericValue : 0, currencySymbol);
}

export function AnalyticsOverview({
  currencySymbol,
  onSeeFullReport,
  tipDescription,
  tipTitle,
}: AnalyticsOverviewProps) {
  const { user } = useAuth();
  const transactions = useTransactions();
  const budgets = useBudgets();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    let timeoutId: number | null = null;

    setIsLoading(true);

    const execute = async () => {
      try {
        const nextSummary = await analyticsRepository.getAnalyticsSummary({ userId: user?.id ?? null });
        if (isCancelled) {
          return;
        }

        startTransition(() => {
          setSummary(nextSummary);
        });
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    // Defer analytics SQL so initial Home paint and scroll stay responsive.
    timeoutId = window.setTimeout(() => {
      void execute();
    }, 40);

    return () => {
      isCancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [budgets.budgets, transactions.transactions, user?.id]);

  const chartData = useMemo(() => {
    if (!summary) {
      return [];
    }

    return summary.weeklySpend.map((point) => ({
      day: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(point.date),
      total: point.total,
    }));
  }, [summary]);

  const tipFocus = useMemo(() => {
    if (!summary) {
      return null;
    }

    const mappedCategory = mapTipCategory(tipTitle, tipDescription);
    const topCategoryMap = new Map(summary.topCategories.map((entry) => [entry.category, entry.amount]));

    if (mappedCategory && topCategoryMap.has(mappedCategory)) {
      return {
        category: mappedCategory,
        amount: Number(topCategoryMap.get(mappedCategory) ?? 0),
        source: 'tip',
      };
    }

    const fallback = summary.topCategories[0];
    if (!fallback) {
      return null;
    }

    return {
      category: fallback.category,
      amount: fallback.amount,
      source: 'top',
    };
  }, [summary, tipDescription, tipTitle]);

  const monthlyPercent = toPercent(summary?.monthlyBudgetPercentage ?? 0);
  const isOverBudget = monthlyPercent > 100;

  return (
    <SectionList
      footerText="Insights are generated from your local offline transactions and budgets."
      headerText="Insights & Analytics"
    >
      <div className={styles.overviewBody}>
        <div className={styles.overviewCard}>
          <div className={styles.topRow}>
            <div>
              <p className={styles.topLabel}>Monthly spending</p>
              <h3 className={styles.primaryValue}>
                {isLoading || !summary ? 'Loading...' : formatMoney(summary.monthlyTotal, currencySymbol)}
              </h3>
            </div>
            <span className="icon-chip accent-chip" aria-hidden="true">
              <MdInsights size={22} />
            </span>
          </div>

          {summary && summary.monthlyBudgetLimit > 0 ? (
            <div className={styles.progressWrap}>
              <div className={styles.progressMeta}>
                <span>Budget usage</span>
                <span>{Math.round(monthlyPercent)}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${isOverBudget ? styles.progressFillOver : ''}`}
                  style={{ width: `${Math.min(monthlyPercent, 100)}%` }}
                />
              </div>
              <div className={styles.progressMeta}>
                <span>{formatMoney(summary?.monthlyTotal ?? 0, currencySymbol)}</span>
                <span>{formatMoney(summary?.monthlyBudgetLimit ?? 0, currencySymbol)}</span>
              </div>
            </div>
          ) : null}

          <div className={styles.chartWrap}>
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={chartData}>
                <XAxis axisLine={false} dataKey="day" tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(37, 99, 235, 0.07)' }}
                  formatter={(value) => formatTooltipCurrency(value, currencySymbol)}
                  labelFormatter={(label) => `${label} spending`}
                />
                <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {tipFocus ? (
            <p className={styles.focusNote}>
              <span className={styles.focusStrong}>Smart tip match:</span>{' '}
              {tipFocus.source === 'tip' ? 'Your current tip maps to ' : 'Top category this month is '}
              <span className={styles.focusStrong}>{tipFocus.category}</span>
              {' at '}
              <span className={styles.focusStrong}>{formatMoney(tipFocus.amount, currencySymbol)}</span>
              .
            </p>
          ) : null}

          <div className={styles.cardActions}>
            <button className={`primary-button ${styles.fullReportBtn}`} onClick={onSeeFullReport} type="button">
              See Full Report
            </button>
          </div>
        </div>
      </div>
    </SectionList>
  );
}
