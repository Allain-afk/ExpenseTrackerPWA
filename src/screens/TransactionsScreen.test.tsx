import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { ExpenseTransaction } from '../types/models';
import { TransactionsScreen } from './TransactionsScreen';

const mocks = vi.hoisted(() => ({
  deleteTransaction: vi.fn(),
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

const transactions: ExpenseTransaction[] = [
  { id: 1, amount: 150, category: 'Groceries', description: 'Market', date: new Date(2026, 9, 5), type: 'expense', walletId: 2, groupId: 3 },
  { id: 2, amount: 5000, category: 'Salary', description: 'Client pay', date: new Date(2026, 9, 4), type: 'income' },
];

vi.mock('../hooks/useTransactions', () => ({
  useTransactions: () => ({ transactions, deleteTransaction: mocks.deleteTransaction }),
}));
vi.mock('../hooks/useExpenseGroups', () => ({
  useExpenseGroups: () => ({ getGroupById: (id: number) => id === 3 ? { id: 3, name: 'Household' } : undefined }),
}));
vi.mock('../hooks/useWallets', () => ({
  useWallets: () => ({ getWalletById: (id: number) => id === 2 ? { id: 2, name: 'Cash wallet' } : undefined }),
}));
vi.mock('../lib/utils/appToast', () => ({
  showErrorToast: mocks.showErrorToast,
  showSuccessToast: mocks.showSuccessToast,
}));
vi.mock('../components/common/SyncStatusIcon', () => ({ SyncStatusIcon: () => <span>Synced</span> }));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function renderScreen() {
  return render(<MemoryRouter><TransactionsScreen currencySymbol="₱" /></MemoryRouter>);
}

describe('TransactionsScreen', () => {
  test('searches across metadata and combines search with type filters', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByRole('searchbox', { name: 'Search transactions' }), 'cash wallet');
    expect(await screen.findByRole('button', { name: /market/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /client pay/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Income' }));
    expect(await screen.findByText('No matching transactions')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    expect(screen.getByRole('button', { name: /market/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /client pay/i })).toBeInTheDocument();
  });

  test('opens details and exposes edit only after row selection', async () => {
    const user = userEvent.setup();
    renderScreen();

    expect(screen.queryByRole('link', { name: 'Edit transaction' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /market/i }));
    expect(screen.getByRole('dialog', { name: 'Transaction details' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit transaction' })).toHaveAttribute('href', '/transactions/1/edit');
  });

  test('keeps details and confirmation open when deletion fails', async () => {
    mocks.deleteTransaction.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /market/i }));
    await user.click(screen.getByRole('button', { name: 'Delete transaction' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mocks.showErrorToast).toHaveBeenCalledWith('Delete failed', 'offline'));
    expect(screen.getByRole('dialog', { name: 'Delete transaction' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Transaction details' })).toBeInTheDocument();
  });

  test('closes details and confirmation after successful deletion', async () => {
    mocks.deleteTransaction.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: /market/i }));
    await user.click(screen.getByRole('button', { name: 'Delete transaction' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mocks.deleteTransaction).toHaveBeenCalledWith(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
