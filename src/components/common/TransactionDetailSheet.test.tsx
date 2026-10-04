import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ExpenseTransaction } from '../../types/models';
import { TransactionDetailSheet } from './TransactionDetailSheet';
import { TransactionList } from './TransactionList';

afterEach(cleanup);

const expense: ExpenseTransaction = {
  id: 7,
  amount: 180,
  category: 'Food',
  description: 'Coffee',
  date: new Date(2026, 9, 5),
  type: 'expense',
};

describe('TransactionDetailSheet', () => {
  test('shows complete core details without undefined optional metadata', async () => {
    render(
      <MemoryRouter>
        <TransactionDetailSheet
          currencySymbol="₱"
          editTo="/transactions/7/edit"
          onClose={vi.fn()}
          onDelete={vi.fn()}
          transaction={expense}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog', { name: 'Transaction details' })).toBeInTheDocument();
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('-₱180.00')).toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit transaction' })).toHaveAttribute('href', '/transactions/7/edit');
  });

  test('passes delete intent to the owning screen', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <MemoryRouter>
        <TransactionDetailSheet
          currencySymbol="$"
          editTo="/transactions/7/edit"
          onClose={vi.fn()}
          onDelete={onDelete}
          transaction={expense}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Delete transaction' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});

describe('TransactionList', () => {
  test('renders an accessible row trigger and reports selection', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TransactionList
        currencySymbol="₱"
        onSelect={onSelect}
        transactions={[expense]}
      />,
    );

    await user.click(screen.getByRole('button', { name: /coffee/i }));
    expect(onSelect).toHaveBeenCalledWith(expense);
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});
