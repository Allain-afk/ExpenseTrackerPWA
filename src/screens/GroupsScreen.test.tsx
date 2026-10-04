import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { GroupsScreen } from './GroupsScreen';

vi.mock('../hooks/useExpenseGroups', () => ({
  useExpenseGroups: () => ({
    groups: [{ id: 4, name: 'Household', description: 'Shared costs' }],
    getGroupTransactions: () => [{ id: 1 }, { id: 2 }],
    getGroupTotal: () => 900,
  }),
}));
vi.mock('../components/common/SyncStatusIcon', () => ({ SyncStatusIcon: () => <span>Synced</span> }));

afterEach(cleanup);

describe('GroupsScreen', () => {
  test('renders each category as one detail link without list management controls', () => {
    render(<MemoryRouter><GroupsScreen currencySymbol="₱" /></MemoryRouter>);

    const categoryLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/groups/4');
    expect(categoryLinks).toHaveLength(1);
    expect(categoryLinks[0]).toHaveAccessibleName(/Household/);
    expect(screen.queryByRole('link', { name: 'Edit category' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete category' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add category' })).toHaveAttribute('href', '/groups/new');
  });
});
