import { startTransition, useEffect, useMemo, useState } from 'react';
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

    const execute = async () => {
      setIsLoading(true);

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

  return (
    <SectionList
      footerText="Open the full report for trends, comparisons, and category budgets."
      headerText="Insights"
    >
      <div className={styles.overviewBody}>
        <div className={styles.overviewCard}>
          <div className={styles.topRow}>
            <span className="icon-chip accent-chip" aria-hidden="true">
              <MdInsights size={22} />
            </span>
            <div className={styles.insightCopy}>
              <p className={styles.topLabel}>Top spending category</p>
              <h3 className={styles.primaryValue}>
                {isLoading ? 'Loading…' : (summary?.topCategories[0]?.category ?? 'No spending yet')}
              </h3>
              {summary?.topCategories[0] ? (
                <p className={styles.insightAmount}>
                  {formatMoney(summary.topCategories[0].amount, currencySymbol)} this month
                </p>
              ) : null}
            </div>
          </div>

          {tipFocus ? (
            <p className={styles.focusNote}>
              {tipFocus.source === 'tip' ? 'Today’s tip can help with ' : 'Your leading category is '}
              <span className={styles.focusStrong}>{tipFocus.category}</span>
              {' spending.'}
            </p>
          ) : null}

          <div className={styles.cardActions}>
            <button className={`primary-button ${styles.fullReportBtn}`} onClick={onSeeFullReport} type="button">
              See full report
            </button>
          </div>
        </div>
      </div>
    </SectionList>
  );
}
