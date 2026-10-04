import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { AnalyticsOverview } from './AnalyticsOverview';

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../../hooks/useBudgets', () => ({ useBudgets: () => ({ budgets: [] }) }));
vi.mock('../../hooks/useTransactions', () => ({ useTransactions: () => ({ transactions: [] }) }));
vi.mock('../../lib/db/repositories/analyticsRepository', () => ({
  createAnalyticsRepository: () => ({
    getAnalyticsSummary: vi.fn(async () => ({
      monthlyTotal: 500,
      monthlyBudgetLimit: 1000,
      monthlyBudgetPercentage: 50,
      topCategories: [{ category: 'Food', amount: 300 }],
      topCategoryBudgetVsActual: null,
      weeklySpend: [],
    })),
  }),
}));

afterEach(cleanup);

describe('AnalyticsOverview', () => {
  test('keeps Home insight concise and links to the full report', async () => {
    render(
      <AnalyticsOverview
        currencySymbol="₱"
        onSeeFullReport={vi.fn()}
        tipDescription="Plan meals"
        tipTitle="Food planning"
      />,
    );

    expect(await screen.findByText('Top spending category')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Food' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See full report' })).toBeInTheDocument();
    expect(screen.queryByText('Monthly spending')).not.toBeInTheDocument();
  });
});
