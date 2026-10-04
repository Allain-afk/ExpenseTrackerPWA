import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { MonthlySummary } from './MonthlySummary';

afterEach(cleanup);

describe('MonthlySummary', () => {
  test('shows spending, overage, and semantic progress', () => {
    render(
      <MonthlySummary
        currencySymbol="₱"
        value={{ spent: 1250, budget: 1000, remaining: -250, percentage: 125, status: 'over' }}
      />,
    );

    expect(screen.getByText('Spent this month')).toBeInTheDocument();
    expect(screen.getByText('₱1,250.00')).toBeInTheDocument();
    expect(screen.getByText('₱250.00 over')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '125% used');
    expect(screen.getByText('125% used')).toBeInTheDocument();
  });

  test('explains when no monthly budget exists', () => {
    render(
      <MonthlySummary
        currencySymbol="$"
        value={{ spent: 0, budget: 0, remaining: 0, percentage: 0, status: 'none' }}
      />,
    );

    expect(screen.getByText('No monthly budget set')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
