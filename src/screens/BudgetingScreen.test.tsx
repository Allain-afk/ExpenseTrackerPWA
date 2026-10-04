import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { BudgetingContext, type BudgetingContextValue } from '../context/BudgetingContext';
import type { BudgetPlan } from '../types/models';
import { BudgetingScreen } from './BudgetingScreen';

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({ currencySymbol: '₱' }),
}));

afterEach(cleanup);

const octoberPlan: BudgetPlan = {
  id: 'plan-1',
  title: 'October budget',
  periodStart: new Date(2026, 9, 1),
  periodEnd: new Date(2026, 9, 31),
  sortOrder: 0,
  cutoffs: [{
    id: 'cutoff-1',
    planId: 'plan-1',
    label: 'First pay period',
    cutoffDate: new Date(2026, 9, 8),
    estimatedAmount: 9000,
    sortOrder: 0,
    allocations: [{
      id: 'allocation-1',
      cutoffId: 'cutoff-1',
      particulars: 'Rent',
      amount: 5000,
      paymentMethod: 'Bank transfer',
      sortOrder: 0,
    }],
  }],
};

const novemberPlan: BudgetPlan = {
  id: 'plan-2',
  title: 'November budget',
  periodStart: new Date(2026, 10, 1),
  periodEnd: new Date(2026, 10, 30),
  sortOrder: 1,
  cutoffs: [],
};

function renderBudgeting(overrides: Partial<BudgetingContextValue> = {}, initialEntry = '/budgeting') {
  const budgeting: BudgetingContextValue = {
    plans: [],
    selectedPlanId: null,
    selectedPlan: null,
    isLoaded: true,
    loadPlans: vi.fn(async () => []),
    selectPlan: vi.fn(),
    addPlan: vi.fn(async () => 'plan-1'),
    updatePlan: vi.fn(async () => undefined),
    deletePlan: vi.fn(async () => undefined),
    addCutoff: vi.fn(async () => 'cutoff-1'),
    updateCutoff: vi.fn(async () => undefined),
    deleteCutoff: vi.fn(async () => undefined),
    addAllocation: vi.fn(async () => 'allocation-1'),
    updateAllocation: vi.fn(async () => undefined),
    deleteAllocation: vi.fn(async () => undefined),
    ...overrides,
  };

  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <BudgetingContext.Provider value={budgeting}>
        <Routes>
          <Route element={<BudgetingScreen />} path="/budgeting" />
          <Route element={<BudgetingScreen />} path="/budgeting/:planId" />
        </Routes>
      </BudgetingContext.Provider>
    </MemoryRouter>,
  );
}

describe('BudgetingScreen action hierarchy', () => {
  test('shows one plan-creation action in the empty state', () => {
    renderBudgeting();

    expect(screen.getAllByRole('button', { name: /new plan|create budget plan/i })).toHaveLength(1);
    expect(screen.queryByText('Back to Settings')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back from Budgeting' })).toBeInTheDocument();
  });

  test('opens plan creation in a focused dialog', async () => {
    const user = userEvent.setup();
    renderBudgeting();

    await user.click(screen.getByRole('button', { name: 'Create budget plan' }));

    expect(screen.getByRole('dialog', { name: 'Create budget plan' })).toBeInTheDocument();
    expect(screen.getByLabelText('Plan name')).toHaveFocus();
  });

  test('shows saved plans as links without exposing plan inputs', () => {
    renderBudgeting({
      plans: [octoberPlan, novemberPlan],
      selectedPlanId: 'plan-1',
      selectedPlan: octoberPlan,
    });

    expect(screen.getByRole('link', { name: /open october budget/i })).toHaveAttribute('href', '/budgeting/plan-1');
    expect(screen.getByRole('link', { name: /open november budget/i })).toHaveAttribute('href', '/budgeting/plan-2');
    expect(screen.queryByLabelText('Particulars')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Period name')).not.toBeInTheDocument();
  });

  test('keeps detail forms hidden until their section action is used', async () => {
    const user = userEvent.setup();
    renderBudgeting({
      plans: [octoberPlan],
      selectedPlanId: 'plan-1',
      selectedPlan: octoberPlan,
    }, '/budgeting/plan-1');

    expect(screen.getByRole('link', { name: 'Back from October budget' })).toHaveAttribute('href', '/budgeting');
    expect(screen.queryByLabelText('Period name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Particulars')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add pay period' }));
    expect(screen.getByLabelText('Period name')).toBeInTheDocument();
    expect(screen.queryByLabelText('Particulars')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add allocation to First pay period' }));
    expect(screen.getByLabelText('Particulars')).toBeInTheDocument();
  });
});
