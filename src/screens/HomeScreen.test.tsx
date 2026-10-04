import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ExpenseTransaction } from '../types/models';
import { HomeScreen } from './HomeScreen';

const transactions: ExpenseTransaction[] = [
  { id: 1, amount: 180, category: 'Food', description: 'Coffee', date: new Date(2026, 9, 5), type: 'expense', walletId: 1 },
  { id: 2, amount: 320, category: 'Transport', description: 'Ride', date: new Date(2026, 9, 4), type: 'expense', walletId: 1 },
  { id: 3, amount: 5000, category: 'Salary', description: 'Freelance', date: new Date(2026, 9, 3), type: 'income', walletId: 1 },
  { id: 4, amount: 900, category: 'Utilities', description: 'Internet', date: new Date(2026, 9, 2), type: 'expense', walletId: 1 },
];

vi.mock('../hooks/useTransactions', () => ({
  useTransactions: () => ({
    transactions,
    balance: 3600,
    getWalletBalance: () => 3600,
    loadTransactions: vi.fn(async () => transactions),
  }),
}));

vi.mock('../hooks/useWallets', () => ({
  useWallets: () => ({
    wallets: [{ id: 1, name: 'Daily wallet', type: 'cash', colorValue: 0x7c3aed, isHidden: false }],
    getWalletById: () => ({ id: 1, name: 'Daily wallet', type: 'cash', colorValue: 0x7c3aed, isHidden: false }),
    loadWallets: vi.fn(async () => []),
  }),
}));

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    userName: 'Allain',
    mainWalletName: 'All wallets',
    mainWalletColor: 0x7c3aed,
    mainWalletHidden: false,
    hiddenBalanceKeys: [],
    updateHiddenBalanceKeys: vi.fn(async () => undefined),
    updateMainWallet: vi.fn(async () => undefined),
  }),
}));

vi.mock('../hooks/useBudgets', () => ({
  useBudgets: () => ({
    budgets: [{ id: 'food', category: 'Food', limitAmount: 2000 }],
    loadBudgets: vi.fn(async () => []),
  }),
}));

vi.mock('../components/common/AnalyticsOverview', () => ({
  AnalyticsOverview: () => <section><h2>Insights</h2></section>,
}));

vi.mock('../components/common/SyncStatusIcon', () => ({
  SyncStatusIcon: () => <span>Synced</span>,
}));

afterEach(cleanup);

describe('HomeScreen daily hierarchy', () => {
  test('puts monthly and recent activity before tips and analytics', async () => {
    render(<MemoryRouter><HomeScreen currencySymbol="₱" /></MemoryRouter>);

    expect(await screen.findByText('This month')).toBeInTheDocument();
    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent);
    expect(headings.indexOf('Recent activity')).toBeLessThan(headings.indexOf('Money-saving tip'));
    expect(headings.indexOf('Money-saving tip')).toBeLessThan(headings.indexOf('Insights'));
  });

  test('shows three recent rows, a View all link, and no redundant Add transaction action', () => {
    render(<MemoryRouter><HomeScreen currencySymbol="₱" /></MemoryRouter>);

    expect(screen.getAllByTestId('recent-transaction')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/app/transactions');
    expect(screen.queryByRole('button', { name: 'Add transaction' })).not.toBeInTheDocument();
  });

  test('keeps wallet cards and named balance visibility controls', () => {
    render(<MemoryRouter><HomeScreen currencySymbol="₱" /></MemoryRouter>);

    expect(screen.getByText('Daily wallet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide All wallets balance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide Daily wallet balance' })).toBeInTheDocument();
  });
});
