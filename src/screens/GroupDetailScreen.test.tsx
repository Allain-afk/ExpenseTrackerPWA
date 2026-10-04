import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { ExpenseTransaction } from '../types/models';
import { GroupDetailScreen } from './GroupDetailScreen';

const mocks = vi.hoisted(() => ({
  deleteExpenseGroup: vi.fn(),
  deleteTransaction: vi.fn(),
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

const transaction: ExpenseTransaction = {
  id: 8,
  amount: 150,
  category: 'Groceries',
  description: 'Market',
  date: new Date(2026, 9, 5),
  type: 'expense',
  groupId: 4,
};

vi.mock('../hooks/useExpenseGroups', () => ({
  useExpenseGroups: () => ({
    groups: [{ id: 4, name: 'Household' }],
    getGroupById: (id: number) => id === 4
      ? { id: 4, name: 'Household', description: 'Shared costs', createdAt: new Date(2026, 8, 1) }
      : undefined,
    getGroupTransactions: () => [transaction],
    getGroupTotal: () => 150,
    deleteExpenseGroup: mocks.deleteExpenseGroup,
  }),
}));
vi.mock('../hooks/useTransactions', () => ({
  useTransactions: () => ({
    loadTransactions: vi.fn(),
    deleteTransaction: mocks.deleteTransaction,
  }),
}));
vi.mock('../hooks/useSettings', () => ({ useSettings: () => ({ currencySymbol: '₱' }) }));
vi.mock('../hooks/useWallets', () => ({ useWallets: () => ({ getWalletById: () => undefined }) }));
vi.mock('../lib/utils/appToast', () => ({
  showErrorToast: mocks.showErrorToast,
  showSuccessToast: mocks.showSuccessToast,
}));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/groups/4']}>
      <Routes>
        <Route element={<GroupDetailScreen />} path="/groups/:groupId" />
        <Route element={<h1>Categories destination</h1>} path="/app/groups" />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GroupDetailScreen', () => {
  test('owns category actions and discloses transaction actions from the selected row', async () => {
    const user = userEvent.setup();
    renderDetail();

    expect(screen.getByRole('link', { name: 'Add transaction' })).toHaveAttribute('href', '/transactions/new?groupId=4');
    expect(screen.getByRole('link', { name: 'Edit category' })).toHaveAttribute('href', '/groups/4/edit');
    expect(screen.getByRole('button', { name: 'Delete category' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit transaction' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Market/ }));
    expect(screen.getByRole('dialog', { name: 'Transaction details' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit transaction' })).toHaveAttribute('href', '/transactions/8/edit');
  });

  test('keeps category deletion confirmation open after failure', async () => {
    mocks.deleteExpenseGroup.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    renderDetail();

    await user.click(screen.getByRole('button', { name: 'Delete category' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mocks.showErrorToast).toHaveBeenCalledWith('Delete failed', 'offline'));
    expect(screen.getByRole('dialog', { name: 'Delete category' })).toBeInTheDocument();
  });

  test('returns to the category list after successful deletion', async () => {
    mocks.deleteExpenseGroup.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderDetail();

    await user.click(screen.getByRole('button', { name: 'Delete category' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('heading', { name: 'Categories destination' })).toBeInTheDocument();
    expect(mocks.deleteExpenseGroup).toHaveBeenCalledWith(4);
  });
});
