# Daily Tracker UI Refresh Design

Date: 2026-10-05  
Status: Approved design, awaiting implementation plan

## Purpose

Refresh the application into a cleaner daily expense tracker without replacing its established identity. The redesign must make balances, current-month spending, budget health, recent activity, and transaction entry easy to understand and use on a phone. Existing wallet cards, iconography, themes, routes, data behavior, offline support, synchronization, and safety confirmations remain intact.

Success means users can answer three questions immediately from Home:

1. How much money is available?
2. How much has been spent this month, and how much budget remains?
3. What happened recently, and how can a new transaction be recorded?

## Research Basis

The direction adapts useful patterns from established personal-finance products without copying their visual identity:

- Monarch presents a customizable overview and a single searchable transaction history, with deeper actions available from transaction details.
- YNAB emphasizes understandable progress and keeps detailed reporting separate from daily money management.
- Wallet presents budgets through spent, remaining, and projected status while using color to communicate budget health.

References:

- https://www.monarchmoney.com/features/recurring
- https://www.ynab.com/features
- https://support.budgetbakers.com/hc/en-us/articles/7076953735314-Setup-Budgets

## Chosen Approach

Use a focused experience refresh. Preserve the existing component and data architecture wherever practical, but reorganize information, simplify visible actions, and standardize presentation.

The rejected alternatives are:

- Styling-only cleanup, because it would not resolve action clutter or weak information hierarchy.
- Complete visual replacement, because it would discard wallet cards and icons that the user explicitly wants to retain.

## Design Principles

### Daily information first

Home prioritizes the current balance, current-month spending, remaining budget, budget usage, and recent transactions. Tips and detailed analytics remain available but appear after the primary financial information.

### One obvious action

The existing central Add control in primary navigation remains the single prominent transaction-entry action. Home must not add a redundant primary Add button.

### Progressive disclosure

Lists show the information needed for scanning. Editing, deletion, and extended metadata appear only after a row or card is opened. Destructive actions continue to require confirmation.

### Preserve identity

Existing wallet-card colors, gradients, icons, balance-visibility behavior, themes, and navigation structure remain recognizable. The refresh changes the supporting hierarchy and interaction model, not the application's personality.

### Consistency before decoration

Shared spacing, typography, surfaces, status colors, touch targets, focus states, and motion replace one-off styling. Decorative color is subordinate to financial meaning and navigation state.

## Information Architecture

Primary navigation remains Home, Transactions, Categories, and Settings, with the central Add control on mobile and its corresponding action on the desktop rail. Budgeting, wallet management, analytics, and form routes remain accessible through their current entry points.

No routes are removed. Existing back-navigation behavior is preserved.

## Screen Designs

### Home

Home uses this order:

1. Greeting, sync status, and refresh affordance.
2. Existing horizontally scrollable wallet cards, including the combined balance card and hidden-balance controls.
3. Compact monthly summary showing spent this month, budget remaining, and budget percentage used.
4. A concise budget-health presentation using a simple progress indicator and semantic status.
5. Three recent transactions and a `View all` action that opens Transactions.
6. The daily money-saving tip.
7. A concise analytics preview or link to the detailed analytics screen.

The summary is derived from existing transaction and budget data. It does not create a new persisted financial model.

The Home screen must not introduce another prominent Add button because primary navigation already supplies that action.

### Transactions

Transactions adds a search field above the existing All, Income, and Expense filters. Search matches case-insensitively against:

- Transaction description
- Transaction category
- Wallet name, when assigned
- Expense-group/category name, when assigned

Results remain grouped by formatted date. Filtering and searching combine: the selected type filter is applied together with the search query.

Each row is one large interactive target and displays:

- Existing transaction-type icon
- Description
- Category and optional group context
- Signed, formatted amount
- A subtle disclosure indicator

Edit and delete icons are removed from the default row. Activating a row opens a transaction-detail sheet. The sheet shows the full transaction information and contains secondary Edit and Delete actions. Edit navigates to the existing transaction form route. Delete uses the existing confirmation dialog and repository operation.

No-results states distinguish between an empty transaction history and a search/filter combination with no matches. Search/filter no-results states include a clear reset action.

### Add and Edit Transaction

The existing dedicated form route and persistence logic remain authoritative. A second transaction-form implementation must not be created inside a modal or bottom sheet.

The visible field order becomes:

1. Transaction type
2. Amount
3. Description
4. Category
5. Wallet
6. Date

Additional existing fields remain available in a logical secondary position when required by current behavior.

The primary action uses a specific label:

- `Add expense`
- `Add income`
- `Save changes`

Validation remains inline and preserves entered values after a failed save. Success continues through the current navigation and toast behavior.

### Categories

Category list rows become fully tappable and open the existing category detail screen. Permanently visible edit and delete actions are removed from the list. Add remains a clear page-level action.

Category detail owns secondary management actions:

- Add transaction to category
- Edit category
- Delete category

Deletion retains its current explanation that transactions remain but lose their category association.

### Budgeting

Budgeting retains its current list-to-detail navigation, plan cards, allocation icons, and hidden edit forms. The refresh standardizes its headers, summary surfaces, progress indicators, row spacing, empty states, and action hierarchy with the rest of the application.

Plan-list screens remain read-focused. Plan and allocation input forms appear only after the user selects the relevant create or edit action.

### Wallet Management

Wallet previews retain their current colors, gradients, icons, balance visibility, and editing behavior. The surrounding list, headers, metadata, and actions adopt the shared spacing and typography system.

### Settings

All settings features remain available. Account, synchronization, wallets, budgeting, appearance, notification, and data-management groups adopt a consistent section pattern.

Decorative per-row color variation is reduced. Semantic colors remain for status, warnings, and destructive actions. Local reset and cloud deletion remain distinct actions. Cloud deletion stays isolated at the bottom of data management and retains its explicit danger copy, typed confirmation, authentication requirement, and database behavior.

### Analytics

Detailed analytics remains a separate destination rather than competing with daily information on Home. Existing charts and reporting calculations remain functionally unchanged unless a small presentation adjustment is required for shared tokens or responsiveness.

## Visual System

### Surfaces

Define a consistent hierarchy for page background, standard card, inset list, overlay sheet, and destructive panel. Reuse current theme variables. Standardize radius, border, shadow, and internal padding at each level.

Wallet cards are an explicit exception: their current distinctive appearance remains intact.

### Typography

Use three main hierarchy levels:

- Page title
- Section title
- Supporting metadata

Financial values use tabular numerals where supported and maintain stronger weight than labels. Sentence case is used for headings and actions.

### Color

The active theme color is reserved for primary actions, selected filters, navigation state, progress, and focus accents. Green and red communicate positive/negative financial meaning or success/danger. Neutral text and borders carry the rest of the interface.

### Icons

Keep the existing React Icons set and current domain icon choices. Icons support labels rather than replace essential text. Icon-only controls require accessible names and adequate touch targets.

### Motion

Use short, restrained transitions for pressed states, sheets, dialogs, page reveals, and progress changes. Avoid motion that blocks input or shifts content unexpectedly. Respect `prefers-reduced-motion` by removing nonessential animation.

### Interaction Sizes

Interactive rows and controls must provide at least a 44-by-44 CSS-pixel target where layout permits. Keyboard focus remains visibly distinct across buttons, links, inputs, filters, rows, dialogs, and sheets.

## Component Architecture

Existing shared primitives remain the foundation:

- `SectionList`
- `Modal`
- `ConfirmDialog`
- `PageHeader`
- `TransactionTypeIcon`
- Existing button, form, card, list, tag, and status classes

Add or extract focused components only where repeated behavior justifies them:

- `MonthlySummary`: presentational summary of monthly spending and budget health.
- `TransactionList`: grouping, empty-state selection, and row rendering.
- `TransactionRow`: accessible row trigger with compact transaction information.
- `TransactionDetailSheet`: full transaction metadata and management actions.

These components receive data and callbacks through props. They do not access repositories directly. Context hooks and screens retain orchestration responsibility.

Repeated inline styling affected by the refresh moves into CSS modules or existing global tokens. Unrelated inline styles are not part of this project.

## Data Flow

Existing contexts remain authoritative:

- Transactions supply records, balances, loading, mutation, and refresh behavior.
- Wallets supply wallet names and balances.
- Expense groups supply group names and associations.
- Budgets and budgeting supply limit, plan, and allocation data.
- Settings supply currency, theme, visibility, notification, and profile preferences.
- Sync continues operating through the existing synchronization context.

Home derives monthly totals and recent transactions in memory from loaded data. Transactions combines a deferred search query with the selected type filter, then groups the result for display. Derived values should use `useMemo` when their inputs or list size make recalculation meaningful.

No database schema, repository contract, synchronization payload, Supabase function, or authentication flow changes are included.

## Error, Empty, and Loading States

- Loading states use existing cards and typography without layout jumps where practical.
- Empty states explain the next available action.
- Search/filter no-results states offer a reset path.
- Mutation errors preserve the current view and user-entered data and display an actionable toast.
- Detail sheets close after successful deletion and do not close prematurely on failure.
- Offline and sync states remain visible through the current sync status component.
- Hidden balances remain hidden in every summary location derived from them.
- Destructive operations retain explicit confirmation and danger styling.

## Responsive Behavior

Mobile remains the primary layout. The floating bottom dock is preserved. Content must fit narrow screens without horizontal page overflow; only existing intentional wallet-card scrolling remains horizontal.

At wider breakpoints, the existing desktop rail remains. Content width, card grids, and form widths may expand using the existing responsive conventions, but the information order stays consistent between mobile and desktop.

Sheets behave as bottom sheets on small screens and centered overlays where the current `Modal` component already supports that behavior.

## Performance

The refresh must not add a UI framework or heavy dependency. Search and filtering remain local and deferred. Detailed analytics remains lazy-loaded.

The current production build reports a large JavaScript chunk. During implementation, inspect chunk composition and apply safe route or module-level lazy loading when it does not complicate state ownership or change behavior. Performance work outside the affected screens is excluded.

## Accessibility

- All functionality remains keyboard accessible.
- Focus is trapped and restored correctly for dialogs and sheets through the shared modal behavior.
- Icon-only controls have accessible names.
- Search has a persistent label or accessible name.
- Filters expose selected state.
- Budget progress exposes numeric progress semantics.
- Color is never the only indicator of status.
- Text and controls meet appropriate contrast against every supported theme.
- Reduced-motion preferences are respected.

## Testing Strategy

Add or update focused tests for:

- Monthly summary calculations and empty budget states
- Recent-transaction limit and `View all` navigation
- Search across description, category, wallet, and group
- Combined search and type filtering
- Empty-history and no-results states
- Opening and closing transaction details
- Edit navigation from transaction details
- Delete confirmation, successful deletion, and failed deletion behavior
- Category rows opening details without exposing list-level edit/delete actions
- Hidden-balance presentation
- Accessible labels and selected/progress states where practical in component tests

Verification before completion requires:

1. Full Vitest suite
2. ESLint
3. TypeScript and Vite production build
4. Manual narrow-phone, tablet, and desktop-rail review
5. Keyboard and focus review
6. Reduced-motion review
7. Light/dark and available theme review
8. Offline and synchronization-state smoke test

## Expected Code Areas

Likely affected areas include:

- `src/index.css`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/AppShell.module.css`
- `src/components/common/SectionList.tsx`
- New focused transaction/summary components under `src/components/common/`
- `src/screens/HomeScreen.tsx`
- `src/screens/HomeScreen.module.css`
- `src/screens/TransactionsScreen.tsx`
- `src/screens/ListScreen.module.css`
- `src/screens/TransactionFormScreen.tsx`
- `src/screens/TransactionFormScreen.module.css`
- `src/screens/GroupsScreen.tsx`
- `src/screens/GroupDetailScreen.tsx`
- `src/screens/BudgetingScreen.tsx`
- `src/screens/BudgetingScreen.module.css`
- `src/screens/ManageWalletsScreen.tsx`
- `src/screens/ManageWalletsScreen.module.css`
- `src/screens/SettingsScreen.tsx`
- `src/screens/SettingsScreen.module.css`
- Associated test files

The implementation plan may narrow this list after tracing component reuse. It must not expand into database or backend changes without separate approval.

## Non-Goals

- Replacing wallet cards or their icons
- Rebranding the application
- Adding a new component or icon library
- Changing the database schema
- Changing Supabase authentication or synchronization behavior
- Replacing the dedicated transaction form with a duplicated modal form
- Adding bank connections, automatic categorization, recurring payments, or new analytics calculations
- Redesigning every screen from scratch
- Deploying or publishing the application

## Acceptance Criteria

The redesign is complete when:

- Home clearly prioritizes wallet balance, monthly spending, budget health, and recent activity.
- The application exposes only one prominent global transaction-entry action.
- Existing wallet cards and icons remain recognizably unchanged.
- Transactions can be searched and filtered together.
- Transaction edit and delete actions are absent from list rows and available from transaction details.
- Category list rows open detail screens, with management actions moved out of the list.
- Budgeting preserves its list-to-detail and explicit-edit behavior.
- Shared screens use consistent spacing, typography, surfaces, focus states, and semantic colors.
- Existing themes, offline operation, synchronization, hidden balances, authentication, and destructive safeguards continue to work.
- Tests, lint, and production build pass.
- The refreshed flows are usable with keyboard input, reduced motion, and narrow mobile screens.
