import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { HomeScreen } from './HomeScreen';

vi.mock('../hooks/useTransactions', () => ({
  useTransactions: () => ({
    balance: 0,
    transactions: [],
    getWalletBalance: (walletId: number) => ({ 3: 3200, 1: 1200, 2: 450 }[walletId] ?? 0),
    loadTransactions: vi.fn(),
  }),
}));

vi.mock('../hooks/useExpenseGroups', () => ({
  useExpenseGroups: () => ({
    groups: [],
    getGroupTransactions: vi.fn().mockReturnValue([]),
    getGroupTotal: vi.fn().mockReturnValue(0),
    loadExpenseGroups: vi.fn(),
  }),
}));

vi.mock('../hooks/useWallets', () => ({
  useWallets: () => ({
    wallets: [
      { id: 3, name: 'Visa', type: 'Bank', colorValue: 1, isHidden: false, sortOrder: 0 },
      { id: 2, name: 'Hidden Card', type: 'Cash', colorValue: 2, isHidden: true, sortOrder: 1 },
      { id: 1, name: 'GCash', type: 'E-Wallet', colorValue: 3, isHidden: false, sortOrder: 2 },
    ],
    getWalletById: vi.fn(),
    loadWallets: vi.fn(),
  }),
}));

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    userName: 'Allain',
    mainWalletHidden: false,
    mainWalletColor: 1,
    mainWalletName: 'Total Money',
  }),
}));

describe('HomeScreen', () => {
  it('renders visible wallet cards in the persisted wallet order', () => {
    const { container } = render(
      <MemoryRouter>
        <HomeScreen currencySymbol="₱" />
      </MemoryRouter>,
    );

    const scrollRow = container.querySelector('.scroll-row');
    const cardTexts = Array.from(scrollRow?.children ?? []).map((child) => child.textContent ?? '');

    expect(cardTexts[0]).toContain('Total Money');
    expect(cardTexts[1]).toContain('Visa');
    expect(cardTexts[2]).toContain('GCash');
    expect(cardTexts[3]).toContain('Add Card');
    expect(cardTexts.join(' ')).not.toContain('Hidden Card');
  });
});
