# Daily Tracker UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing PWA into a calmer daily expense tracker while preserving its wallet cards, icon language, themes, routes, offline data, synchronization, and safety behavior.

**Architecture:** Keep the current contexts and repositories authoritative, add small presentational components and pure derivation helpers, and progressively disclose transaction/category management actions from detail views. Consolidate affected one-off styles into existing tokens and CSS modules, then lazy-load route-only screens to keep the initial shell responsive.

**Tech Stack:** React 19, TypeScript 5.9, React Router 7, CSS Modules and global CSS tokens, React Icons, Vitest, Testing Library, Vite 7, SQLocal, Supabase.

**Spec:** `docs/superpowers/specs/2026-10-05-daily-tracker-ui-refresh-design.md`

## Global Constraints

- Keep existing wallet-card colors, gradients, icons, balance visibility, and management behavior recognizably unchanged.
- Keep the existing mobile dock, desktop rail, routes, contexts, repositories, SQLocal schema, Supabase behavior, authentication, and synchronization contracts.
- Use the existing React Icons package; add no UI framework, icon library, or heavy dependency.
- Keep one prominent global transaction-entry action: the existing mobile dock/desktop rail Add control.
- Keep the dedicated transaction form as the sole transaction-form implementation.
- Keep destructive actions behind explicit confirmation; preserve typed confirmation for cloud deletion.
- Use sentence-case UI copy and specific form actions: `Add expense`, `Add income`, and `Save changes`.
- Provide at least 44-by-44 CSS-pixel targets where layout permits, visible keyboard focus, semantic progress, accessible names, and reduced-motion behavior.
- Do not add database migrations, repository contracts, sync payloads, Supabase functions, or deployment work.

## Review Focus

- A transaction without a wallet or group must still render, search, open, edit, and delete without throwing; Task 4 and Task 5 pin this behavior.
- Search input containing leading/trailing whitespace or mixed case must match normalized descriptions, categories, wallet names, and group names; Task 4 pins this behavior.
- Zero total budget and overspent budgets must produce finite progress values and clear labels instead of `NaN`, division errors, or misleading negative remaining amounts; Task 2 pins this behavior.
- Failed transaction deletion must leave the detail sheet open and retain the selected transaction so the user can retry; Task 5 pins this behavior.
- A modal opened from the keyboard must trap Tab focus, close on Escape, and restore focus to its trigger; Task 1 pins this behavior.

---

## File Structure

### New files

- `src/lib/utils/monthlySummary.ts` — pure current-month spending and budget derivation.
- `src/lib/utils/monthlySummary.test.ts` — boundary and overspend tests for monthly derivation.
- `src/lib/utils/transactionSearch.ts` — pure normalized transaction search and type filtering.
- `src/lib/utils/transactionSearch.test.ts` — search/filter coverage.
- `src/components/common/MonthlySummary.tsx` — presentational monthly summary and semantic progress.
- `src/components/common/MonthlySummary.module.css` — monthly summary layout and status styling.
- `src/components/common/MonthlySummary.test.tsx` — accessible labels and no-budget states.
- `src/components/common/TransactionList.tsx` — grouped transaction rendering and empty states.
- `src/components/common/TransactionRow.tsx` — one accessible row trigger.
- `src/components/common/TransactionDetailSheet.tsx` — transaction metadata and Edit/Delete actions.
- `src/components/common/TransactionList.module.css` — shared list, row, and sheet presentation.
- `src/components/common/TransactionDetailSheet.test.tsx` — disclosure and action tests.
- `src/components/common/Modal.test.tsx` — focus trap/restoration and Escape tests.
- `src/screens/HomeScreen.test.tsx` — Home ordering, limits, and navigation tests.
- `src/screens/TransactionsScreen.test.tsx` — integrated search, filters, details, and deletion tests.
- `src/screens/TransactionFormScreen.test.tsx` — action-label and field-order tests.
- `src/screens/GroupsScreen.test.tsx` — list-to-detail action hierarchy tests.
- `src/screens/GroupDetailScreen.test.tsx` — category management tests.

### Modified files

- `src/index.css` — shared surface, focus, touch-target, typography, and motion tokens/classes.
- `src/components/common/Modal.tsx` — focus trap and trigger restoration.
- `src/components/common/SectionList.tsx` — optional section action.
- `src/screens/HomeScreen.tsx` and `HomeScreen.module.css` — approved daily hierarchy.
- `src/screens/TransactionsScreen.tsx` and `ListScreen.module.css` — search and detail disclosure.
- `src/screens/TransactionFormScreen.tsx` and `TransactionFormScreen.module.css` — simplified hierarchy and copy.
- `src/screens/GroupsScreen.tsx` and `GroupDetailScreen.tsx` — move management actions to detail.
- `src/screens/BudgetingScreen.module.css` — align affected surfaces and focus styles.
- `src/screens/ManageWalletsScreen.tsx` and `ManageWalletsScreen.module.css` — align surrounding layout without changing cards.
- `src/screens/SettingsScreen.tsx` and `SettingsScreen.module.css` — consistent sections and semantic colors.
- `src/components/layout/AppShell.module.css` — consistent dock/rail focus and touch targets.
- `src/App.tsx` — lazy-load route-only screens.

## Task 1: Shared Accessibility and Surface Foundations

**Files:**
- Create: `src/components/common/Modal.test.tsx`
- Modify: `src/components/common/Modal.tsx`
- Modify: `src/components/common/SectionList.tsx`
- Modify: `src/index.css`
- Modify: `src/components/layout/AppShell.module.css`

**Interfaces:**
- Consumes: Existing `ModalProps`, global theme variables, and `SectionList` callers.
- Produces: `SectionListProps.action?: ReactNode`; modal focus trapping/restoration shared by later transaction details.

- [ ] **Step 1: Write failing modal accessibility tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal keyboard behavior', () => {
  test('traps focus, closes on Escape, and restores trigger focus', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">Open details</button>
        <Modal onClose={onClose} open={false} title="Details"><button type="button">Edit</button></Modal>
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Open details' });
    trigger.focus();

    rerender(
      <>
        <button type="button">Open details</button>
        <Modal onClose={onClose} open title="Details">
          <button type="button">Edit</button>
          <button type="button">Delete</button>
        </Modal>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Close modal' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <>
        <button type="button">Open details</button>
        <Modal onClose={onClose} open={false} title="Details"><button type="button">Edit</button></Modal>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Open details' })).toHaveFocus();
  });
});
```

- [ ] **Step 2: Run the modal test and confirm the current behavior fails**

Run: `npm run test:run -- src/components/common/Modal.test.tsx`

Expected: FAIL because initial focus, Tab wrapping, and trigger restoration are not implemented.

- [ ] **Step 3: Implement focus management in `Modal`**

Add panel and close-button refs, capture `document.activeElement` when opening, focus the close button after mount, wrap Tab/Shift+Tab across focusable elements, and restore the captured element during cleanup. Keep Escape and backdrop dismissal unchanged.

```tsx
const panelRef = useRef<HTMLDivElement>(null);
const closeButtonRef = useRef<HTMLButtonElement>(null);
const returnFocusRef = useRef<HTMLElement | null>(null);

const focusableSelector = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');
```

The key handler must prevent Tab from leaving `panelRef.current`, and cleanup must call `returnFocusRef.current?.focus()`.

- [ ] **Step 4: Add the section-action interface and shared visual tokens**

Update `SectionList`:

```tsx
interface SectionListProps {
  headerText?: string;
  footerText?: string;
  action?: ReactNode;
  children: ReactNode;
}

{headerText || action ? (
  <div className="section-header">
    {headerText ? <h2>{headerText}</h2> : <span />}
    {action}
  </div>
) : null}
```

Add or normalize these global tokens/classes in `index.css` and reuse them in the dock/rail module:

```css
:root {
  --radius-card: 1.25rem;
  --radius-control: 0.9rem;
  --min-touch-target: 2.75rem;
  --content-gap: 1.25rem;
}

:where(button, a, input, select, textarea):focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

.interactive-row { min-height: var(--min-touch-target); }
.numeric-strong { font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Run focused and full checks**

Run: `npm run test:run -- src/components/common/Modal.test.tsx`

Expected: PASS.

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 6: Commit the shared foundation**

```bash
git add src/components/common/Modal.tsx src/components/common/Modal.test.tsx src/components/common/SectionList.tsx src/components/layout/AppShell.module.css src/index.css
git commit -m "refactor: strengthen shared UI foundations"
```

## Task 2: Monthly Summary Derivation and Component

**Files:**
- Create: `src/lib/utils/monthlySummary.ts`
- Create: `src/lib/utils/monthlySummary.test.ts`
- Create: `src/components/common/MonthlySummary.tsx`
- Create: `src/components/common/MonthlySummary.module.css`
- Create: `src/components/common/MonthlySummary.test.tsx`

**Interfaces:**
- Consumes: `ExpenseTransaction[]`, `Budget[]`, reference `Date`, and currency symbol.
- Produces: `getMonthlySummary(transactions, budgets, referenceDate): MonthlySummaryValue` and `MonthlySummary({ value, currencySymbol })`.

- [ ] **Step 1: Write failing derivation tests**

```ts
import { describe, expect, test } from 'vitest';
import { getMonthlySummary } from './monthlySummary';

describe('getMonthlySummary', () => {
  test('counts only current-month expenses and sums budget limits', () => {
    const value = getMonthlySummary(
      [
        { amount: 250, category: 'Food', description: 'Lunch', date: new Date(2026, 9, 3), type: 'expense' },
        { amount: 900, category: 'Salary', description: 'Pay', date: new Date(2026, 9, 1), type: 'income' },
        { amount: 100, category: 'Food', description: 'Old', date: new Date(2026, 8, 30), type: 'expense' },
      ],
      [{ id: 'food', category: 'Food', limitAmount: 1000 }],
      new Date(2026, 9, 5),
    );

    expect(value).toEqual({ spent: 250, budget: 1000, remaining: 750, percentage: 25, status: 'healthy' });
  });

  test('returns finite no-budget values and preserves overspend', () => {
    expect(getMonthlySummary([], [], new Date(2026, 9, 5))).toEqual({
      spent: 0, budget: 0, remaining: 0, percentage: 0, status: 'none',
    });
    expect(getMonthlySummary(
      [{ amount: 1250, category: 'Food', description: 'Month', date: new Date(2026, 9, 2), type: 'expense' }],
      [{ category: 'Food', limitAmount: 1000 }],
      new Date(2026, 9, 5),
    )).toMatchObject({ remaining: -250, percentage: 125, status: 'over' });
  });
});
```

- [ ] **Step 2: Run the derivation tests and confirm they fail**

Run: `npm run test:run -- src/lib/utils/monthlySummary.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure summary helper**

```ts
export interface MonthlySummaryValue {
  spent: number;
  budget: number;
  remaining: number;
  percentage: number;
  status: 'none' | 'healthy' | 'warning' | 'over';
}

export function getMonthlySummary(
  transactions: ExpenseTransaction[], budgets: Budget[], referenceDate: Date,
): MonthlySummaryValue {
  const spent = transactions
    .filter((item) => item.type === 'expense'
      && item.date.getFullYear() === referenceDate.getFullYear()
      && item.date.getMonth() === referenceDate.getMonth())
    .reduce((total, item) => total + item.amount, 0);
  const budget = budgets.reduce((total, item) => total + Math.max(0, item.limitAmount), 0);
  const remaining = budget > 0 ? budget - spent : 0;
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  const status = budget <= 0 ? 'none' : percentage > 100 ? 'over' : percentage >= 80 ? 'warning' : 'healthy';
  return { spent, budget, remaining, percentage, status };
}
```

- [ ] **Step 4: Write failing component tests**

Test that the component renders `Spent this month`, `Budget left`, formatted values, an accessible `progressbar` capped visually at 100 but exposing the real numeric percentage, and a `No monthly budget set` message when `status === 'none'`.

```tsx
render(<MonthlySummary currencySymbol="₱" value={{ spent: 1250, budget: 1000, remaining: -250, percentage: 125, status: 'over' }} />);
expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '125');
expect(screen.getByText('₱1,250.00')).toBeInTheDocument();
expect(screen.getByText('₱250.00 over')).toBeInTheDocument();
```

- [ ] **Step 5: Implement `MonthlySummary` and its CSS module**

Render one compact card with two numeric cells, a status label, and a progress bar. Set the fill width with `Math.min(value.percentage, 100)`, use semantic CSS classes for warning/over states, and never use a gradient.

- [ ] **Step 6: Run focused checks**

Run: `npm run test:run -- src/lib/utils/monthlySummary.test.ts src/components/common/MonthlySummary.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit the monthly summary unit**

```bash
git add src/lib/utils/monthlySummary.ts src/lib/utils/monthlySummary.test.ts src/components/common/MonthlySummary.tsx src/components/common/MonthlySummary.module.css src/components/common/MonthlySummary.test.tsx
git commit -m "feat: add monthly budget summary"
```

## Task 3: Reorder Home Around Daily Tracking

**Files:**
- Create: `src/screens/HomeScreen.test.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/HomeScreen.module.css`
- Modify: `src/components/common/AnalyticsOverview.tsx`
- Modify: `src/components/common/AnalyticsOverview.module.css`

**Interfaces:**
- Consumes: `getMonthlySummary`, `MonthlySummary`, existing contexts, wallet cards, `SectionList`, and lazy analytics.
- Produces: Home order of wallets → monthly summary → recent activity → tip → compact analytics.

- [ ] **Step 1: Write failing Home hierarchy tests with mocked hooks**

Mock `useTransactions`, `useWallets`, `useSettings`, and `useBudgets` with deterministic records. Render in `MemoryRouter` and assert:

```tsx
const headings = screen.getAllByRole('heading').map((heading) => heading.textContent);
expect(headings.indexOf('Recent activity')).toBeLessThan(headings.indexOf('Money-saving tip'));
expect(screen.getAllByTestId('recent-transaction')).toHaveLength(3);
expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/app/transactions');
expect(screen.queryByRole('button', { name: /add transaction/i })).not.toBeInTheDocument();
```

Also assert wallet names and existing balance-toggle accessible names remain present.

- [ ] **Step 2: Run the Home test and confirm it fails**

Run: `npm run test:run -- src/screens/HomeScreen.test.tsx`

Expected: FAIL because the summary/order/test IDs and `View all` action are not present.

- [ ] **Step 3: Integrate the monthly summary without changing wallet-card markup**

Compute:

```tsx
const monthlySummary = useMemo(
  () => getMonthlySummary(transactions.transactions, budgets.budgets, new Date()),
  [budgets.budgets, transactions.transactions],
);
```

Insert `<MonthlySummary>` immediately after the wallet scroll row. Keep the wallet-card elements, gradients, icons, and click behavior unchanged.

- [ ] **Step 4: Reorder and simplify lower Home content**

Render recent activity before the tip, use `SectionList.action` for the `View all` link, change the heading copy to sentence case, and retain only three recent records. Move the lazy analytics section last and reduce its Home presentation to a concise insight preview plus `See full report`; detailed charts stay on `/analytics`.

- [ ] **Step 5: Run Home and existing tests**

Run: `npm run test:run -- src/screens/HomeScreen.test.tsx src/context/transactionState.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the Home refresh**

```bash
git add src/screens/HomeScreen.tsx src/screens/HomeScreen.module.css src/screens/HomeScreen.test.tsx src/components/common/AnalyticsOverview.tsx src/components/common/AnalyticsOverview.module.css
git commit -m "feat: focus home on daily tracking"
```

## Task 4: Transaction Search and Disclosure Components

**Files:**
- Create: `src/lib/utils/transactionSearch.ts`
- Create: `src/lib/utils/transactionSearch.test.ts`
- Create: `src/components/common/TransactionRow.tsx`
- Create: `src/components/common/TransactionList.tsx`
- Create: `src/components/common/TransactionDetailSheet.tsx`
- Create: `src/components/common/TransactionList.module.css`
- Create: `src/components/common/TransactionDetailSheet.test.tsx`

**Interfaces:**
- Consumes: `ExpenseTransaction`, wallet/group name resolvers, `formatMoney`, date helpers, `Modal`, and `TransactionTypeIcon`.
- Produces:
  - `filterTransactions(options: TransactionFilterOptions): ExpenseTransaction[]`
  - `TransactionList({ transactions, currencySymbol, getGroupName, onSelect, emptyState })`
  - `TransactionDetailSheet({ transaction, currencySymbol, walletName, groupName, onClose, onEdit, onDelete })`

- [ ] **Step 1: Write failing search/filter tests**

```ts
const options = {
  transactions,
  type: 'All' as const,
  query: '  CASH WALLET ',
  getWalletName: (id: number) => id === 2 ? 'Cash Wallet' : undefined,
  getGroupName: () => undefined,
};
expect(filterTransactions(options)).toEqual([transactions[0]]);
```

Cover description, category, wallet, group, mixed-case/whitespace, combined `Expense` filter, and missing wallet/group IDs.

- [ ] **Step 2: Run the search tests and confirm they fail**

Run: `npm run test:run -- src/lib/utils/transactionSearch.test.ts`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement normalized search/filtering**

```ts
export interface TransactionFilterOptions {
  transactions: ExpenseTransaction[];
  type: 'All' | 'Income' | 'Expense';
  query: string;
  getWalletName: (walletId: number) => string | undefined;
  getGroupName: (groupId: number) => string | undefined;
}

export function filterTransactions(options: TransactionFilterOptions): ExpenseTransaction[] {
  const needle = options.query.trim().toLocaleLowerCase();
  return options.transactions.filter((transaction) => {
    if (options.type !== 'All' && transaction.type !== options.type.toLocaleLowerCase()) return false;
    if (!needle) return true;
    const wallet = typeof transaction.walletId === 'number' ? options.getWalletName(transaction.walletId) : '';
    const group = typeof transaction.groupId === 'number' ? options.getGroupName(transaction.groupId) : '';
    return [transaction.description, transaction.category, wallet, group]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(needle));
  });
}
```

- [ ] **Step 4: Write failing detail-sheet tests**

Render a transaction with no wallet/group and assert the sheet shows description, type, category, formatted signed amount, date, `Edit transaction`, and `Delete transaction`. Click each action and assert the supplied callback receives or applies to the current transaction. Assert absent optional metadata does not render `undefined`.

- [ ] **Step 5: Implement row, list, and detail components**

`TransactionRow` must be a `<button type="button">` containing the existing `TransactionTypeIcon`, compact metadata, signed amount, and a disclosure icon. `TransactionList` groups with `formatGroupedDate` and delegates selection. `TransactionDetailSheet` uses the enhanced `Modal` with `variant="sheet"`; it contains neutral Edit and danger Delete actions but performs no repository calls.

- [ ] **Step 6: Run component and helper tests**

Run: `npm run test:run -- src/lib/utils/transactionSearch.test.ts src/components/common/TransactionDetailSheet.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit the transaction primitives**

```bash
git add src/lib/utils/transactionSearch.ts src/lib/utils/transactionSearch.test.ts src/components/common/TransactionRow.tsx src/components/common/TransactionList.tsx src/components/common/TransactionDetailSheet.tsx src/components/common/TransactionList.module.css src/components/common/TransactionDetailSheet.test.tsx
git commit -m "feat: add searchable transaction disclosure UI"
```

## Task 5: Integrate Search and Details into Transactions

**Files:**
- Create: `src/screens/TransactionsScreen.test.tsx`
- Modify: `src/screens/TransactionsScreen.tsx`
- Modify: `src/screens/ListScreen.module.css`

**Interfaces:**
- Consumes: Task 4 helper/components, `useTransactions`, `useExpenseGroups`, `useWallets`, Router navigation, toasts, and `ConfirmDialog`.
- Produces: Searchable/filterable Transactions screen with selected-transaction state and safe edit/delete flow.

- [ ] **Step 1: Write failing screen interaction tests**

Mock contexts with at least one expense, one income, one wallet, and one group. Verify:

```tsx
await user.type(screen.getByRole('searchbox', { name: 'Search transactions' }), 'groceries');
expect(screen.getByText('Market')).toBeInTheDocument();
expect(screen.queryByText('Salary')).not.toBeInTheDocument();
await user.click(screen.getByRole('button', { name: /market/i }));
expect(screen.getByRole('dialog', { name: 'Transaction details' })).toBeInTheDocument();
expect(screen.getByRole('link', { name: 'Edit transaction' })).toHaveAttribute('href', '/transactions/1/edit');
```

Add tests that a failed `deleteTransaction` keeps the detail sheet open and shows the existing error toast, while a successful deletion closes both confirmation and details.

- [ ] **Step 2: Run the screen tests and confirm they fail**

Run: `npm run test:run -- src/screens/TransactionsScreen.test.tsx`

Expected: FAIL because search and transaction details are absent.

- [ ] **Step 3: Replace inline row actions with search and selection state**

Use:

```tsx
const [query, setQuery] = useState('');
const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
const deferredQuery = useDeferredValue(query);
const filteredTransactions = useMemo(() => filterTransactions({
  transactions,
  type: deferredFilter,
  query: deferredQuery,
  getWalletName: (id) => getWalletById(id)?.name,
  getGroupName: (id) => getGroupById(id)?.name,
}), [deferredFilter, deferredQuery, getGroupById, getWalletById, transactions]);
```

Render a labeled search input, selected-state filter buttons, and `TransactionList`. Remove the decorative filter icon and every row-level edit/delete button.

- [ ] **Step 4: Wire detail, edit, delete, and reset behavior**

Pass the selected transaction to `TransactionDetailSheet`. Editing uses `/transactions/:id/edit`. Deleting first opens `ConfirmDialog`. On success, close confirmation and detail state. On failure, close neither and show `showErrorToast`. The filtered no-results view renders `Clear search and filters`, which sets query to `''` and filter to `All`.

- [ ] **Step 5: Run screen and regression tests**

Run: `npm run test:run -- src/screens/TransactionsScreen.test.tsx src/components/common/TransactionDetailSheet.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the Transactions screen**

```bash
git add src/screens/TransactionsScreen.tsx src/screens/TransactionsScreen.test.tsx src/screens/ListScreen.module.css
git commit -m "feat: streamline transaction history"
```

## Task 6: Simplify the Transaction Form Hierarchy

**Files:**
- Create: `src/screens/TransactionFormScreen.test.tsx`
- Modify: `src/screens/TransactionFormScreen.tsx`
- Modify: `src/screens/TransactionFormScreen.module.css`

**Interfaces:**
- Consumes: Existing contexts, modal create-category/create-wallet flows, route params, and save methods.
- Produces: One ordered form with unchanged persistence and exact action labels.

- [ ] **Step 1: Write failing form tests**

Mock hooks and render new expense, new income, and edit routes. Assert exact button labels `Add expense`, `Add income`, and `Save changes`. Use DOM position comparisons to assert amount precedes description, description precedes category, category precedes wallet, and wallet precedes date.

```tsx
expect(screen.getByRole('button', { name: 'Add expense' })).toBeInTheDocument();
expect(amount.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
```

Retain tests for invalid amount, blank description, missing required wallet, and rejected save preserving entered values.

- [ ] **Step 2: Run the form tests and confirm the label test fails**

Run: `npm run test:run -- src/screens/TransactionFormScreen.test.tsx`

Expected: FAIL because edit currently uses `Update Income`/`Update Expense` and the form is split into competing cards.

- [ ] **Step 3: Recompose the existing controls into the approved order**

Keep all current state, validation, repository calls, wallet-lock behavior for edits, and create-category/create-wallet modals. Place controls in one primary form surface with the type switch first and schedule last. Keep optional spending-category grouping below the required category/wallet fields.

Set:

```tsx
const submitLabel = isEditing ? 'Save changes' : selectedType === 'income' ? 'Add income' : 'Add expense';
```

- [ ] **Step 4: Update the CSS module for a calm single-column mobile flow**

Use one form column below 720px, a maximum readable form width, sticky submit treatment only when it does not cover fields, and the global radius/focus/touch tokens. Remove decorative section styling made obsolete by the single hierarchy.

- [ ] **Step 5: Run the form and full context tests**

Run: `npm run test:run -- src/screens/TransactionFormScreen.test.tsx src/context/transactionState.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the form refresh**

```bash
git add src/screens/TransactionFormScreen.tsx src/screens/TransactionFormScreen.module.css src/screens/TransactionFormScreen.test.tsx
git commit -m "refactor: simplify transaction entry"
```

## Task 7: Move Category Management into Category Details

**Files:**
- Create: `src/screens/GroupsScreen.test.tsx`
- Create: `src/screens/GroupDetailScreen.test.tsx`
- Modify: `src/screens/GroupsScreen.tsx`
- Modify: `src/screens/GroupDetailScreen.tsx`
- Modify: `src/screens/ListScreen.module.css`

**Interfaces:**
- Consumes: Existing group and transaction contexts, `ConfirmDialog`, Task 4 transaction list/detail primitives, Router links, and toasts.
- Produces: Fully tappable category rows; detail-level Add/Edit/Delete actions; consistent transaction disclosure inside a category.

- [ ] **Step 1: Write failing category action-hierarchy tests**

For `GroupsScreen`, assert each group has one link to `/groups/:id`, and that list-level `Edit category` and `Delete category` controls are absent. For `GroupDetailScreen`, assert Add, Edit, and Delete are present and target the current group.

Add a deletion failure test that leaves the confirmation dialog open and a success test that navigates to `/app/groups` after deletion.

- [ ] **Step 2: Run the category tests and confirm they fail**

Run: `npm run test:run -- src/screens/GroupsScreen.test.tsx src/screens/GroupDetailScreen.test.tsx`

Expected: FAIL because management controls currently live in the list and detail lacks edit/delete.

- [ ] **Step 3: Make category rows single-link targets**

Replace nested links and trailing action icons with one row link containing the existing folder icon, name, description/count, and total. Retain the page-level `Add category` action and sync status.

- [ ] **Step 4: Add detail-level category management**

Add an action group near `PageHeader` or summary content:

```tsx
<Link to={`/transactions/new?groupId=${groupId}`}>Add transaction</Link>
<Link to={`/groups/${groupId}/edit`}>Edit category</Link>
<button type="button" onClick={() => setDeleteOpen(true)}>Delete category</button>
```

Reuse the existing deletion explanation and `deleteExpenseGroup`. On success, toast and navigate to `/app/groups`; on failure, retain the dialog and show an error toast.

- [ ] **Step 5: Use shared transaction disclosure in category detail**

Replace transaction links that navigate directly to editing with `TransactionList` and `TransactionDetailSheet`. The detail sheet owns edit/delete disclosure. Continue passing the category-specific `groupTransactions` array and existing currency symbol.

- [ ] **Step 6: Run category and transaction regression tests**

Run: `npm run test:run -- src/screens/GroupsScreen.test.tsx src/screens/GroupDetailScreen.test.tsx src/screens/TransactionsScreen.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit category disclosure changes**

```bash
git add src/screens/GroupsScreen.tsx src/screens/GroupsScreen.test.tsx src/screens/GroupDetailScreen.tsx src/screens/GroupDetailScreen.test.tsx src/screens/ListScreen.module.css
git commit -m "refactor: move category actions into details"
```

## Task 8: Align Remaining Screens and Improve Route Loading

**Files:**
- Modify: `src/screens/BudgetingScreen.module.css`
- Modify: `src/screens/ManageWalletsScreen.tsx`
- Modify: `src/screens/ManageWalletsScreen.module.css`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/screens/SettingsScreen.module.css`
- Modify: `src/App.tsx`
- Test: `src/screens/BudgetingScreen.test.tsx`
- Test: `src/components/common/CloudDataDeletionControl.test.tsx`

**Interfaces:**
- Consumes: Shared tokens from Task 1 and all existing screen behavior.
- Produces: Consistent surrounding surfaces and lazy route chunks without changing cards, icons, form visibility rules, settings behavior, or cloud deletion safeguards.

- [ ] **Step 1: Capture the regression baseline**

Run: `npm run test:run -- src/screens/BudgetingScreen.test.tsx src/components/common/CloudDataDeletionControl.test.tsx`

Expected: PASS before styling and route-loading changes.

- [ ] **Step 2: Align Budgeting surfaces without changing its interaction model**

Replace duplicated radius, shadow, transition, and focus values in `BudgetingScreen.module.css` with `--radius-card`, `--radius-control`, `--motion-fast`, `--ease-out`, `--shadow-soft`, and `--focus-ring`. Keep the current plan list/detail routes, allocation icons, hidden forms, and progress semantics unchanged.

- [ ] **Step 3: Align wallet-management chrome while preserving wallet cards**

Move affected inline spacing/status styles in `ManageWalletsScreen.tsx` into named module classes. Apply shared section spacing, focus, and touch-target tokens only to headers, surrounding list surfaces, and management buttons. Do not change the wallet preview gradient calculation, card structure, icons, drag behavior, visibility, or balance behavior.

- [ ] **Step 4: Normalize Settings sections and semantic colors**

Replace affected inline icon-chip colors with module variants:

```css
.statusIcon { background: var(--color-primary-soft); color: var(--color-primary); }
.successIcon { background: color-mix(in srgb, var(--color-income) 12%, transparent); color: var(--color-income); }
.dangerIcon { background: color-mix(in srgb, var(--color-expense) 12%, transparent); color: var(--color-expense); }
```

Use the neutral/status variants consistently, preserve all controls, and keep local reset separate from the bottom-positioned cloud deletion control.

- [ ] **Step 5: Lazy-load route-only screens in `App.tsx`**

Convert eager imports for `GroupDetailScreen`, `ManageWalletsScreen`, `BudgetingScreen`, `TransactionFormScreen`, `GroupFormScreen`, and `WalletFormScreen` to `lazy` imports. Add one reusable route fallback:

```tsx
function RouteFallback() {
  return (
    <div className="full-screen-state">
      <div className="app-card state-card">
        <div className="spinner" aria-hidden="true" />
        <h1>Opening screen...</h1>
        <p>Your offline data is ready while this view loads.</p>
      </div>
    </div>
  );
}
```

Wrap lazy route elements in `<Suspense fallback={<RouteFallback />}>` without altering paths or bootstrap boundaries.

- [ ] **Step 6: Run regression, lint, and build checks**

Run: `npm run test:run -- src/screens/BudgetingScreen.test.tsx src/components/common/CloudDataDeletionControl.test.tsx`

Expected: PASS.

Run: `npm run lint`

Expected: PASS.

Run: `npm run build`

Expected: PASS, with route-only screen chunks listed separately from the initial `index` chunk. Record the before/after initial JavaScript sizes in the commit notes; do not add manual vendor chunking if it does not reduce initial downloaded code.

- [ ] **Step 7: Commit remaining consistency and loading changes**

```bash
git add src/screens/BudgetingScreen.module.css src/screens/ManageWalletsScreen.tsx src/screens/ManageWalletsScreen.module.css src/screens/SettingsScreen.tsx src/screens/SettingsScreen.module.css src/App.tsx
git commit -m "refactor: align app surfaces and route loading"
```

## Task 9: Full Verification and Polish Pass

**Files:**
- Modify only files already listed in Tasks 1–8 when verification exposes a defect.
- Update affected test files alongside every behavior correction.

**Interfaces:**
- Consumes: Completed implementation from Tasks 1–8.
- Produces: Verified app-wide refresh meeting the design acceptance criteria.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm run test:run`

Expected: All tests PASS.

Run: `npm run lint`

Expected: PASS with no warnings or errors.

Run: `npm run build`

Expected: TypeScript and Vite build PASS; PWA assets are generated; route-only chunks remain split.

- [ ] **Step 2: Start the production preview for manual checks**

Run: `npm run preview -- --host 127.0.0.1`

Expected: Vite reports a local preview URL and the application loads with cross-origin isolation headers.

- [ ] **Step 3: Verify the primary mobile flow at 320px and 390px widths**

Check Home → Add transaction → Save → Transactions → Search/filter → Open details → Edit/Delete. Confirm no horizontal page overflow, dock obstruction, clipped fields, duplicated Add action, or visible row-level destructive actions. Confirm wallet cards and icons remain intact.

- [ ] **Step 4: Verify tablet/desktop behavior**

At 720px and 1024px widths, confirm the content width remains readable, the desktop rail selected state is correct, sheets/dialogs are usable, and intentional wallet scrolling/grid behavior is preserved.

- [ ] **Step 5: Verify accessibility and state variants**

Keyboard through every primary action; verify modal focus trap/restoration and Escape close. Enable reduced motion and confirm nonessential animation is removed. Check blue, pink, mint, and dark themes; hidden balances; empty transactions; no budget; over budget; offline/sync status; failed save/delete; local reset; and cloud deletion confirmation.

- [ ] **Step 6: Fix only observed defects with a failing regression test first**

For each defect, add the smallest failing Vitest/Testing Library assertion to the owning test file, run it to confirm failure, make the minimal implementation/CSS correction, and rerun the focused test before the full suite.

- [ ] **Step 7: Commit verified polish**

```bash
git add src
git commit -m "test: verify daily tracker UI refresh"
```

- [ ] **Step 8: Review the final diff against the specification**

Run: `git diff HEAD~9 --stat`

Run: `git diff HEAD~9 --check`

Expected: Only approved UI, component, test, and loading files changed; no whitespace errors, schema changes, dependency changes, generated build output, or deployment files are present.
