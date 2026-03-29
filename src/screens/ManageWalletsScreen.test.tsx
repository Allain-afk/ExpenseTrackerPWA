import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageWalletsScreen } from './ManageWalletsScreen';

let emitDragEnd:
  | ((event: { active: { id: number }; over: { id: number } | null }) => void)
  | undefined;

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode;
    onDragEnd: typeof emitDragEnd;
  }) => {
    emitDragEnd = onDragEnd;
    return <div>{children}</div>;
  },
  KeyboardSensor: class {},
  PointerSensor: class {},
  TouchSensor: class {},
  closestCenter: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn((...sensors: unknown[]) => sensors),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  arrayMove: (items: unknown[], from: number, to: number) => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  },
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: ({ id }: { id: number }) => ({
    attributes: {},
    listeners:
      id === 1
        ? {
            onClick: () => {
              emitDragEnd?.({
                active: { id: 1 },
                over: { id: 2 },
              });
            },
          }
        : {},
    setActivatorNodeRef: vi.fn(),
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

const hooks = vi.hoisted(() => ({
  reorderWallets: vi.fn(),
}));

vi.mock('../hooks/useWallets', () => ({
  useWallets: () => ({
    wallets: [
      { id: 1, name: 'BPI Savings', type: 'Bank', colorValue: 1, isHidden: false, sortOrder: 0 },
      { id: 2, name: 'GCash', type: 'E-Wallet', colorValue: 2, isHidden: false, sortOrder: 1 },
    ],
    reorderWallets: hooks.reorderWallets,
  }),
}));

vi.mock('../hooks/useTransactions', () => ({
  useTransactions: () => ({
    balance: 0,
    getWalletBalance: vi.fn().mockReturnValue(1000),
  }),
}));

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    currencySymbol: '₱',
    mainWalletHidden: false,
    mainWalletColor: 1,
    mainWalletName: 'Total Money',
    updateMainWallet: vi.fn(),
  }),
}));

vi.mock('../lib/utils/appToast', () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

describe('ManageWalletsScreen', () => {
  beforeEach(() => {
    hooks.reorderWallets.mockReset().mockResolvedValue(undefined);
  });

  it('saves the new wallet order after a drag reorder completes', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ManageWalletsScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /reorder bpi savings/i }));

    await waitFor(() => {
      expect(hooks.reorderWallets).toHaveBeenCalledWith([2, 1]);
    });
  });
});
