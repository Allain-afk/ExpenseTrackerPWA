import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { BudgetingContext, type BudgetingContextValue } from '../context/BudgetingContext';
import { BudgetingScreen } from './BudgetingScreen';

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({ currencySymbol: '₱' }),
}));

afterEach(cleanup);

function renderBudgeting(overrides: Partial<BudgetingContextValue> = {}) {
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
    <MemoryRouter>
      <BudgetingContext.Provider value={budgeting}>
        <BudgetingScreen />
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
});
