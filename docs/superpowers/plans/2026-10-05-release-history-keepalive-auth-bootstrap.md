# Release History, Supabase Keep-Alive, and Auth Bootstrap Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship release `1.3.9` with accurate in-app release notes, a lightweight external Supabase keep-alive, and authentication transitions that cannot restart or strand offline bootstrap.

**Architecture:** A persistent `BootstrapCoordinator` starts the existing local bootstrap once beneath `AppBootstrapProvider`; route boundaries consume status without owning startup. Authentication actions stay in the SPA and explicitly refresh local contexts only after cloud deletion. A GitHub Actions schedule performs an independent, RLS-protected REST read twice daily, with no keep-alive code in the PWA bundle.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Testing Library, SQLocal, Supabase Data API, GitHub Actions, Vite PWA

**Spec:** `docs/superpowers/specs/2026-10-05-release-history-keepalive-auth-bootstrap-design.md`

## Global Constraints

- Work directly on `main`, preserving unrelated user changes.
- Release version is exactly `1.3.9` in Settings, `package.json`, and `package-lock.json`.
- Keep-alive cadence is exactly twice daily using `17 */12 * * *` plus `workflow_dispatch`.
- The PWA must ship no keep-alive timer, service worker task, API route, or new runtime dependency.
- Never use, request, print, or commit a Supabase `service_role` key.
- Keep all existing RLS policies and the cloud-deletion RPC unchanged.
- Authentication changes must preserve local-first data after ordinary sign-out.
- Cloud deletion must preserve remote-delete → local-clear → sign-out ordering.
- Bootstrap errors must remain visible and retryable; rejected startup promises must not become unhandled rejections.
- Use tests first for every behavior change.

## Review Focus

- A forced refresh requested while initial bootstrap is still active must share the active promise and must not start duplicate database loads; Task 1 tests this explicitly.
- A rejected bootstrap must clear the loading flag and expose the error rather than leaving the loading screen visible; Task 1 tests this explicitly.
- Auth success must not call `window.location.replace`, reset bootstrap, or remove anonymous local data; Task 2 tests the Settings behavior.
- Password recovery must not navigate until sign-out and bootstrap readiness both finish; Task 3 tests ordering with a deferred promise.
- Missing scheduler credentials or a non-2xx Supabase response must fail the workflow without leaking response data or credentials; Task 5 statically verifies the safeguards and the live smoke test exercises the request.

---

### Task 1: Centralize and stabilize offline bootstrap

**Files:**
- Modify: `src/context/AppBootstrapContext.tsx`
- Modify: `src/context/AppProviders.tsx`
- Modify: `src/hooks/useAppBootstrap.ts`
- Modify: `src/App.tsx`
- Modify: `src/screens/SplashScreen.tsx`
- Create: `src/context/AppBootstrapContext.test.tsx`
- Modify: `src/context/AppProviders.test.tsx`

**Interfaces:**
- Preserve: `AppBootstrapContextValue.bootstrap(force?: boolean): Promise<void>`
- Add: `BootstrapCoordinator(): null` in `src/context/AppProviders.tsx`
- Change: `BootstrapBoundary` and `SplashScreen` consume `useAppBootstrap()` without auto-start
- Guarantee: an active bootstrap promise is shared by normal and forced callers
- Guarantee: `hasBootstrapped === true` before the successful bootstrap promise resolves

- [ ] **Step 1: Add failing bootstrap provider tests**

Create `src/context/AppBootstrapContext.test.tsx`. Mock `ensureDatabaseReady`, provide small fake values for all six dependent contexts, and expose the bootstrap context through a probe. Cover these exact cases:

```tsx
test('shares active bootstrap work with a concurrent forced request', async () => {
  const databaseReady = deferred<void>();
  mockedEnsureDatabaseReady.mockReturnValue(databaseReady.promise);
  const loadTransactions = vi.fn(async () => []);
  const context = renderBootstrapProbe({ loadTransactions });

  const first = context.current.bootstrap();
  const forced = context.current.bootstrap(true);
  expect(forced).toBe(first);

  databaseReady.resolve();
  await first;
  expect(mockedEnsureDatabaseReady).toHaveBeenCalledTimes(1);
  expect(loadTransactions).toHaveBeenCalledTimes(1);
});

test('publishes completion before bootstrap resolves', async () => {
  const context = renderBootstrapProbe();
  await act(async () => {
    await context.current.bootstrap();
  });
  expect(context.current.hasBootstrapped).toBe(true);
  expect(context.current.isBootstrapping).toBe(false);
});

test('clears loading and exposes a retryable error when bootstrap fails', async () => {
  mockedEnsureDatabaseReady.mockRejectedValueOnce(new Error('Database unavailable'));
  const context = renderBootstrapProbe();
  await expect(context.current.bootstrap()).rejects.toThrow('Database unavailable');
  expect(context.current.isBootstrapping).toBe(false);
  expect(context.current.bootstrapError).toBe('Database unavailable');
});
```

The helper must use `render`, `act`, a mutable probe ref, and typed context casts; it must not initialize the real SQLocal worker.

- [ ] **Step 2: Run the provider tests and confirm RED**

Run:

```powershell
npm run test:run -- src/context/AppBootstrapContext.test.tsx
```

Expected: the concurrency assertion or completion-order assertion fails against the current provider.

- [ ] **Step 3: Implement the stable bootstrap contract**

In `AppBootstrapContext.tsx`:

- Remove `startTransition`.
- Add `useCallback` and `useMemo` imports.
- Add `hasBootstrappedRef` as the authoritative synchronous completion flag.
- Store the latest six dependent context values in `bootstrapSourcesRef` on every provider render so the stable callback can read current loaders and flags without capturing stale state.
- Return `bootstrapPromiseRef.current` before considering `force`.
- Use the ref for the completed/no-force early return.
- Assign `hasBootstrappedRef.current = true` and call `setHasBootstrapped(true)` before the work promise resolves.
- Memoize the provider value.

The core flow must follow this shape:

```tsx
const hasBootstrappedRef = useRef(false);
const bootstrapSourcesRef = useRef({
  settings: settingsContext,
  transactions: transactionsContext,
  wallets: walletsContext,
  expenseGroups: expenseGroupsContext,
  budgets: budgetsContext,
  budgeting: budgetingContext,
});
bootstrapSourcesRef.current = {
  settings: settingsContext,
  transactions: transactionsContext,
  wallets: walletsContext,
  expenseGroups: expenseGroupsContext,
  budgets: budgetsContext,
  budgeting: budgetingContext,
};

const runBootstrap = useCallback((force = false): Promise<void> => {
  if (bootstrapPromiseRef.current) {
    return bootstrapPromiseRef.current;
  }
  if (hasBootstrappedRef.current && !force) {
    return Promise.resolve();
  }

  const work = (async () => {
    setIsBootstrapping(true);
    setBootstrapError(null);
    try {
      await ensureDatabaseReady();
      const { settings, transactions, wallets, expenseGroups, budgets, budgeting } =
        bootstrapSourcesRef.current;
      const tasks = [
        force || !settings?.isLoaded ? settings?.loadSettings() : undefined,
        force || !transactions?.isLoaded ? transactions?.loadTransactions() : undefined,
        force || !wallets?.isLoaded ? wallets?.loadWallets() : undefined,
        force || !expenseGroups?.isLoaded ? expenseGroups?.loadExpenseGroups() : undefined,
        force || !budgets?.isLoaded ? budgets?.loadBudgets() : undefined,
        force || !budgeting?.isLoaded ? budgeting?.loadPlans() : undefined,
      ];
      await withTimeout(
        Promise.all(tasks.filter((task): task is Promise<unknown> => Boolean(task))),
        BOOTSTRAP_TIMEOUT_MS,
        'App bootstrap',
      );
      hasBootstrappedRef.current = true;
      setHasBootstrapped(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to initialize the app.';
      setBootstrapError(message);
      throw error;
    } finally {
      setIsBootstrapping(false);
      bootstrapPromiseRef.current = null;
    }
  })();

  bootstrapPromiseRef.current = work;
  return work;
}, []);
```

Use exact dependencies rather than whole context objects where possible. Keep the 15-second timeout.

- [ ] **Step 4: Add a failing persistent coordinator test**

Extend `src/context/AppProviders.test.tsx` with a mocked `AppBootstrapContext` value and render `BootstrapCoordinator` through a small provider wrapper. Rerender with a changed context object and assert `bootstrap` remains called once:

```tsx
test('starts bootstrap once across context rerenders', async () => {
  const bootstrap = vi.fn(async () => undefined);
  const { rerender } = renderBootstrapCoordinator(bootstrap, false);
  await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(1));

  rerenderBootstrapCoordinator(rerender, bootstrap, true);
  expect(bootstrap).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 5: Run the coordinator test and confirm RED**

Run:

```powershell
npm run test:run -- src/context/AppProviders.test.tsx
```

Expected: import or behavior failure because `BootstrapCoordinator` does not exist yet.

- [ ] **Step 6: Mount the persistent coordinator and make routes status-only**

In `AppProviders.tsx`, add:

```tsx
export function BootstrapCoordinator() {
  const { bootstrap } = useAppBootstrap();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    void bootstrap().catch(() => undefined);
  }, [bootstrap]);

  return null;
}
```

Mount it directly inside `AppBootstrapProvider`, before `SyncProvider`, so it survives route and auth changes. Add the required `useRef` and `useAppBootstrap` imports.

In `App.tsx` and `SplashScreen.tsx`, replace `useAppBootstrap(true)` with `useAppBootstrap()`. Simplify `useAppBootstrap` to a plain typed context accessor by removing its `autoStart` parameter, effect, and ref. Confirm `rg "useAppBootstrap\(true" src` returns no matches.

- [ ] **Step 7: Run focused bootstrap tests and confirm GREEN**

Run:

```powershell
npm run test:run -- src/context/AppBootstrapContext.test.tsx src/context/AppProviders.test.tsx
```

Expected: all focused tests pass with no unhandled rejection warning.

- [ ] **Step 8: Commit the bootstrap lifecycle change**

```powershell
git add src/context/AppBootstrapContext.tsx src/context/AppBootstrapContext.test.tsx src/context/AppProviders.tsx src/context/AppProviders.test.tsx src/hooks/useAppBootstrap.ts src/App.tsx src/screens/SplashScreen.tsx
git commit -m "fix: centralize offline app bootstrap"
```

---

### Task 2: Keep Settings sign-in and normal sign-out inside the SPA

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Create: `src/screens/SettingsScreen.test.tsx`

**Interfaces:**
- Preserve: `AuthContextValue.signInWithPassword(email, password): Promise<void>`
- Preserve: `AuthContextValue.signOut(): Promise<void>`
- Preserve: Settings auth modal and toast behavior
- Remove: authentication success dependence on `window.location.replace`

- [ ] **Step 1: Write failing Settings authentication tests**

Create `SettingsScreen.test.tsx` with mocked hooks for settings, transactions, auth, sync, and app bootstrap. Mock the child controls that are unrelated to authentication. Use a mutable `authState` object and rerender after auth actions.

Cover:

```tsx
test('signs in without restarting the application', async () => {
  const user = userEvent.setup();
  renderSettings();
  await user.click(screen.getByRole('button', { name: /sign in/i }));
  await user.type(screen.getByLabelText(/email/i), 'user@example.com');
  await user.type(screen.getByLabelText(/^password$/i), 'Password123');
  await user.click(screen.getByRole('button', { name: /^sign in$/i }));

  expect(signInWithPassword).toHaveBeenCalledWith('user@example.com', 'Password123');
  expect(showSuccessToast).toHaveBeenCalledWith('Signed in', 'Cloud backup is now available.');
});

test('signs out to local mode without invoking bootstrap or a reload', async () => {
  authState.user = fakeUser;
  const user = userEvent.setup();
  renderSettings();
  await user.click(screen.getByRole('button', { name: /sign out/i }));

  expect(signOut).toHaveBeenCalledOnce();
  expect(bootstrap).not.toHaveBeenCalled();
});
```

The sign-in test fails on the current `Restarting app...` success copy. The final invariant scan in Task 6 separately proves that no authentication success path retains `location.replace`.

- [ ] **Step 2: Run the Settings tests and confirm RED**

Run:

```powershell
npm run test:run -- src/screens/SettingsScreen.test.tsx
```

Expected: sign-in observes the current reload/restarting behavior.

- [ ] **Step 3: Remove the sign-in hard reload**

In `submitAuth`:

- Keep awaiting `auth.signInWithPassword`.
- Preserve optional display-name synchronization.
- Change success copy to `Cloud backup is now available.`
- Clear the password and close the modal.
- Remove the 120 ms timeout, `window.location.replace('/')`, and early return that exists only for the reload.

Do not invoke bootstrap from sign-in or normal sign-out. The persistent coordinator owns startup, and SyncContext already reacts to `auth.user`.

- [ ] **Step 4: Run Settings tests and confirm GREEN**

```powershell
npm run test:run -- src/screens/SettingsScreen.test.tsx
```

- [ ] **Step 5: Commit the in-place auth transition**

```powershell
git add src/screens/SettingsScreen.tsx src/screens/SettingsScreen.test.tsx
git commit -m "fix: keep settings authentication in app"
```

---

### Task 3: Make cloud deletion and password recovery await local readiness

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/screens/SettingsScreen.test.tsx`
- Modify: `src/screens/ResetPasswordScreen.tsx`
- Modify: `src/screens/ResetPasswordScreen.test.tsx`
- Verify: `src/lib/supabase/deleteCloudData.test.ts`

**Interfaces:**
- Consume: `useAppBootstrap().bootstrap(force?: boolean)`
- Cloud deletion calls: `await bootstrap(true)` after successful delete/sign-out
- Password recovery calls: `await bootstrap()` after sign-out and before navigation

- [ ] **Step 1: Add a failing cloud-deletion refresh test**

Extend `SettingsScreen.test.tsx` to open the cloud deletion control, type `DELETE CLOUD DATA`, confirm, and assert the transition sequence:

```tsx
test('refreshes local contexts after cloud deletion without reloading', async () => {
  authState.user = fakeUser;
  const order: string[] = [];
  deleteCloudDataForCurrentUser.mockImplementation(async () => { order.push('delete'); });
  bootstrap.mockImplementation(async (force) => { order.push(`bootstrap:${String(force)}`); });

  const user = userEvent.setup();
  renderSettings();
  await user.click(screen.getByRole('button', { name: 'Delete Cloud Data' }));
  await user.type(screen.getByLabelText(/type delete cloud data/i), 'DELETE CLOUD DATA');
  await user.click(screen.getByRole('button', { name: /permanently delete cloud data/i }));

  await waitFor(() => expect(order).toEqual(['delete', 'bootstrap:true']));
});
```

- [ ] **Step 2: Add a failing password-reset ordering test**

Extend the existing ResetPasswordScreen bootstrap mock and use a deferred promise:

```tsx
test('waits for local bootstrap before opening the sign-in destination', async () => {
  const readiness = deferred<void>();
  bootstrap.mockReturnValueOnce(readiness.promise);
  const user = await reachPasswordStep();
  await enterMatchingPasswordsAndSubmit(user);

  expect(updatePassword).toHaveBeenCalledBefore(signOut);
  expect(signOut).toHaveBeenCalledOnce();
  expect(screen.queryByText('Sign-in destination')).not.toBeInTheDocument();

  readiness.resolve();
  expect(await screen.findByText('Sign-in destination')).toBeInTheDocument();
});
```

Implement a local order array instead of relying on a matcher unavailable in the installed Vitest version.

- [ ] **Step 3: Run both tests and confirm RED**

```powershell
npm run test:run -- src/screens/SettingsScreen.test.tsx src/screens/ResetPasswordScreen.test.tsx
```

Expected: cloud deletion reloads instead of refreshing, and password reset navigates before the deferred bootstrap resolves.

- [ ] **Step 4: Implement cloud-deletion refresh without reload**

Import `useAppBootstrap` in Settings and obtain `bootstrap`. Change `deleteAllCloudData` to:

```tsx
await deleteCloudDataForCurrentUser();
await bootstrap(true);
showSuccessToast('Cloud data deleted', 'Your synced data was erased and you have been signed out.');
```

Remove the timeout and `window.location.replace('/')`. Keep the existing error toast and rethrow behavior so the confirmation control can display its inline error.

- [ ] **Step 5: Implement password-reset readiness ordering**

Import `useAppBootstrap`, obtain `bootstrap`, and insert:

```tsx
await auth.updatePassword(newPassword);
await auth.signOut();
await bootstrap();
```

Only then clear recovery storage, set `bypass_setup_once` and `open_auth_modal`, show success, and navigate. Do not force a reload because the persistent coordinator normally completed during the recovery flow.

- [ ] **Step 6: Run focused transition tests and confirm GREEN**

```powershell
npm run test:run -- src/screens/SettingsScreen.test.tsx src/screens/ResetPasswordScreen.test.tsx src/lib/supabase/deleteCloudData.test.ts
```

- [ ] **Step 7: Commit the destructive/recovery transition fixes**

```powershell
git add src/screens/SettingsScreen.tsx src/screens/SettingsScreen.test.tsx src/screens/ResetPasswordScreen.tsx src/screens/ResetPasswordScreen.test.tsx
git commit -m "fix: await offline readiness after auth changes"
```

---

### Task 4: Add release `1.3.9` to Version History and package metadata

**Files:**
- Create: `src/lib/constants/versionHistory.ts`
- Create: `src/lib/constants/versionHistory.test.ts`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Add: `VersionHistoryEntry` interface
- Add: `versionHistory: readonly VersionHistoryEntry[]`
- Settings imports and renders the extracted constant unchanged

- [ ] **Step 1: Extract version history without behavior changes**

Move the current array and its type from SettingsScreen into `src/lib/constants/versionHistory.ts`. Export both:

```ts
export interface VersionHistoryEntry {
  version: string;
  title: string;
  description: readonly string[];
  accent: string;
  badgeBackground: string;
  surface: string;
  latest?: boolean;
}
```

After the interface, export the existing SettingsScreen array as `versionHistory: readonly VersionHistoryEntry[]`, preserving every existing entry verbatim and in its current order. Import that constant into SettingsScreen.

Import it from SettingsScreen. Run the current suite before adding release behavior to prove the extraction is neutral.

- [ ] **Step 2: Add a failing release-history test**

Create `versionHistory.test.ts`:

```ts
test('marks 1.3.9 as the only latest release and documents the finishing work', () => {
  const latest = versionHistory.filter((entry) => entry.latest);
  expect(latest).toHaveLength(1);
  expect(latest[0].version).toBe('1.3.9');

  const notes = latest[0].description.join(' ').toLowerCase();
  for (const topic of ['daily', 'budget', 'password', 'cloud data', 'overall balance', 'loading', 'keep-alive']) {
    expect(notes).toContain(topic);
  }
});
```

- [ ] **Step 3: Run the release test and confirm RED**

```powershell
npm run test:run -- src/lib/constants/versionHistory.test.ts
```

Expected: latest version remains `1.3.8`.

- [ ] **Step 4: Add the approved release entry**

Prepend `1.3.9` with title `Daily Tracking, Budgeting & Cloud Reliability` and the eight approved bullets from the spec. Remove `latest: true` from `1.3.8`; do not rewrite older historical entries.

- [ ] **Step 5: Synchronize npm package metadata**

Run the mechanical version update without creating a tag or commit:

```powershell
npm version 1.3.9 --no-git-tag-version
```

Verify both files:

```powershell
node -e "const p=require('./package.json'); const l=require('./package-lock.json'); if(p.version!=='1.3.9'||l.version!=='1.3.9'||l.packages[''].version!=='1.3.9') process.exit(1)"
```

- [ ] **Step 6: Run the release test and confirm GREEN**

```powershell
npm run test:run -- src/lib/constants/versionHistory.test.ts
```

- [ ] **Step 7: Commit release metadata**

```powershell
git add src/lib/constants/versionHistory.ts src/lib/constants/versionHistory.test.ts src/screens/SettingsScreen.tsx package.json package-lock.json
git commit -m "docs: add version 1.3.9 release history"
```

---

### Task 5: Add the external Supabase keep-alive workflow and setup documentation

**Files:**
- Create: `.github/workflows/supabase-keepalive.yml`
- Create: `src/lib/supabase/keepAliveWorkflow.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consume GitHub secret: `SUPABASE_URL`
- Consume GitHub secret: `SUPABASE_PUBLISHABLE_KEY`
- Query: `/rest/v1/wallets?select=uuid&limit=1`
- Schedule: `17 */12 * * *`
- Manual trigger: `workflow_dispatch`

- [ ] **Step 1: Add a failing workflow contract test**

Create `keepAliveWorkflow.test.ts` using `readFileSync` and `resolve(process.cwd(), ...)`:

```ts
const workflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/supabase-keepalive.yml'),
  'utf8',
);

test('runs a least-privileged Supabase database ping twice daily', () => {
  expect(workflow).toContain("cron: '17 */12 * * *'");
  expect(workflow).toContain('workflow_dispatch:');
  expect(workflow).toContain('secrets.SUPABASE_URL');
  expect(workflow).toContain('secrets.SUPABASE_PUBLISHABLE_KEY');
  expect(workflow).toContain('/rest/v1/wallets?select=uuid&limit=1');
  expect(workflow).toContain('--max-time 30');
  expect(workflow).toContain('--output /dev/null');
  expect(workflow.toLowerCase()).not.toContain('service_role');
});
```

- [ ] **Step 2: Run the workflow test and confirm RED**

```powershell
npm run test:run -- src/lib/supabase/keepAliveWorkflow.test.ts
```

Expected: file-not-found failure because the workflow does not exist.

- [ ] **Step 3: Create the workflow**

Create `.github/workflows/supabase-keepalive.yml` with this complete behavior:

```yaml
name: Supabase Keep-Alive

on:
  schedule:
    - cron: '17 */12 * * *'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  ping-database:
    runs-on: ubuntu-latest
    timeout-minutes: 2
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}
    steps:
      - name: Validate configuration
        shell: bash
        run: |
          test -n "$SUPABASE_URL" || { echo "SUPABASE_URL is not configured." >&2; exit 1; }
          test -n "$SUPABASE_PUBLISHABLE_KEY" || { echo "SUPABASE_PUBLISHABLE_KEY is not configured." >&2; exit 1; }
      - name: Ping Supabase database
        shell: bash
        run: |
          endpoint="${SUPABASE_URL%/}/rest/v1/wallets?select=uuid&limit=1"
          curl --fail --silent --show-error \
            --retry 2 --retry-all-errors \
            --connect-timeout 10 --max-time 30 \
            --output /dev/null \
            --header "apikey: ${SUPABASE_PUBLISHABLE_KEY}" \
            "$endpoint"
```

Do not add checkout, npm installation, a service-role secret, or output of the response body.

- [ ] **Step 4: Document manual setup and operational limits**

Add `## Supabase Keep-Alive` to README with these exact manual actions:

1. GitHub repository → Settings → Secrets and variables → Actions.
2. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` repository secrets.
3. Push/merge the workflow to the default branch and ensure Actions is enabled.
4. Open Actions → Supabase Keep-Alive → Run workflow.
5. Confirm the `Ping Supabase database` step succeeds.

State that it runs at 00:17 and 12:17 UTC, may be delayed by GitHub scheduler load, uses an RLS-protected anonymous read, and reduces inactivity risk but does not replace Supabase Pro's no-pause guarantee.

- [ ] **Step 5: Run the workflow contract test and confirm GREEN**

```powershell
npm run test:run -- src/lib/supabase/keepAliveWorkflow.test.ts
```

- [ ] **Step 6: Smoke-test the live request without exposing configuration**

Load `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env.local` into task-specific PowerShell variables without printing them. Invoke the exact endpoint with `Invoke-WebRequest`, discard the body, and print only the integer HTTP status. Expected: `200`.

Do not use `VITE_SUPABASE_ANON_KEY` unless the publishable key is absent, and never echo either key.

- [ ] **Step 7: Commit workflow and documentation**

```powershell
git add .github/workflows/supabase-keepalive.yml src/lib/supabase/keepAliveWorkflow.test.ts README.md
git commit -m "ci: keep Supabase project active"
```

---

### Task 6: Verify the complete release and inspect final scope

**Files:**
- Verify all files changed in Tasks 1–5
- Modify only files required to correct verification failures

**Interfaces:**
- No new interfaces
- Completion evidence comes from fresh full-suite commands

- [ ] **Step 1: Run the full test suite**

```powershell
npm run test:run
```

Expected: all test files and tests pass with zero unhandled promise rejections.

- [ ] **Step 2: Run lint**

```powershell
npm run lint
```

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: Run the production build**

```powershell
npm run build
```

Expected: TypeScript and Vite complete successfully. Record but do not expand scope for the existing large-chunk warning.

- [ ] **Step 4: Inspect release and keep-alive invariants**

```powershell
rg -n "location\.replace|useAppBootstrap\(true|service_role|17 \*/12|1\.3\.9" src .github README.md package.json package-lock.json
git diff --check
git status --short
```

Expected:

- No authentication success path uses `location.replace`.
- No route owns auto-start bootstrap.
- `service_role` appears nowhere in the workflow.
- The schedule and release version appear in their intended files.
- No whitespace errors or unrelated changes are present.

- [ ] **Step 5: Perform manual auth/PWA smoke checks**

Using the configured app and a test account:

1. Sign in from Settings; confirm the modal closes without a page reload or startup loader.
2. Sign out normally; confirm Settings stays usable in local mode and local financial data remains.
3. Complete password recovery; confirm navigation reaches the Settings sign-in modal without looping on offline loading.
4. With disposable cloud data, complete typed cloud deletion; confirm cloud rows and matching local rows are absent, the account is signed out, Settings remains usable, and no hard reload occurs.
5. Reload the installed PWA once; confirm ordinary startup still completes and offline data remains accessible.

- [ ] **Step 6: Review final diff against the spec**

Check every acceptance criterion in the spec against code or verification evidence. Specifically confirm that no schema migration, frontend keep-alive code, new runtime dependency, or unrelated redesign entered the diff.

- [ ] **Step 7: Re-run the owning task after any correction**

If a verification command fails, return to the task that owns the failing behavior, add a regression assertion there, make the minimal correction, rerun that task's focused command, and repeat Tasks 6 Steps 1–6. Use the owning task's explicit file list and commit message; do not create an empty verification commit.
