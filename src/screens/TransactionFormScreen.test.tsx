import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { ExpenseTransaction, Wallet } from '../types/models';
import { TransactionFormScreen } from './TransactionFormScreen';

const mocks = vi.hoisted(() => ({
  addTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
  wallets: [] as Wallet[],
}));

const existingTransaction: ExpenseTransaction = {
  id: 7,
  amount: 80,
  category: 'Food',
  description: 'Lunch',
  date: new Date(2026, 9, 3),
  type: 'expense',
  walletId: 1,
};

vi.mock('../hooks/useTransactions', () => ({
  useTransactions: () => ({
    addTransaction: mocks.addTransaction,
    updateTransaction: mocks.updateTransaction,
    getTransactionById: (id: number) => id === 7 ? existingTransaction : undefined,
  }),
}));
vi.mock('../hooks/useExpenseGroups', () => ({
  useExpenseGroups: () => ({
    groups: [],
    addExpenseGroup: vi.fn(),
    getGroupById: () => undefined,
  }),
}));
vi.mock('../hooks/useWallets', () => ({
  useWallets: () => ({
    wallets: mocks.wallets,
    addWallet: vi.fn(),
    getWalletById: (id: number) => mocks.wallets.find((wallet) => wallet.id === id),
  }),
}));
vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({ currencySymbol: '₱' }),
}));
vi.mock('../lib/utils/appToast', () => ({
  showErrorToast: mocks.showErrorToast,
  showSuccessToast: mocks.showSuccessToast,
}));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.wallets = [{ id: 1, name: 'Cash', type: 'cash', colorValue: 0, isHidden: false }];
});

function renderForm(path = '/transactions/new') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<TransactionFormScreen />} path="/transactions/new" />
        <Route element={<TransactionFormScreen />} path="/transactions/:transactionId/edit" />
      </Routes>
    </MemoryRouter>,
  );
}

function expectBefore(first: HTMLElement, second: HTMLElement) {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

describe('TransactionFormScreen', () => {
  test('uses specific create labels and a clear field order', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByRole('button', { name: 'Add expense' })).toBeInTheDocument();
    const amount = screen.getByLabelText(/Amount/);
    const description = screen.getByLabelText('Description');
    const category = screen.getByLabelText('Category');
    const wallet = screen.getByLabelText(/Wallet/);
    const date = screen.getByLabelText('Date');
    expectBefore(amount, description);
    expectBefore(description, category);
    expectBefore(category, wallet);
    expectBefore(wallet, date);

    await user.click(screen.getByRole('button', { name: 'Income transaction' }));
    expect(screen.getByRole('button', { name: 'Add income' })).toBeInTheDocument();
  });

  test('uses Save changes when editing', () => {
    renderForm('/transactions/7/edit');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  test('validates amount and description before saving', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(mocks.showErrorToast).toHaveBeenLastCalledWith('Invalid amount', 'Please enter a valid amount.');

    await user.type(screen.getByLabelText(/Amount/), '120');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(mocks.showErrorToast).toHaveBeenLastCalledWith('Description required', 'Please enter a description.');
    expect(mocks.addTransaction).not.toHaveBeenCalled();
  });

  test('requires an available wallet selection', async () => {
    const user = userEvent.setup();
    renderForm('/transactions/new?walletId=999');

    await user.type(screen.getByLabelText(/Amount/), '120');
    await user.type(screen.getByLabelText('Description'), 'Groceries');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(mocks.showErrorToast).toHaveBeenLastCalledWith('Wallet required', 'Please select a specific wallet.');
    expect(mocks.addTransaction).not.toHaveBeenCalled();
  });

  test('keeps entered values when saving is rejected', async () => {
    mocks.addTransaction.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/Amount/), '120');
    await user.type(screen.getByLabelText('Description'), 'Groceries');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    await waitFor(() => expect(mocks.showErrorToast).toHaveBeenLastCalledWith('Transaction save failed', 'offline'));
    expect(screen.getByLabelText(/Amount/)).toHaveValue('120');
    expect(screen.getByLabelText('Description')).toHaveValue('Groceries');
  });
});
