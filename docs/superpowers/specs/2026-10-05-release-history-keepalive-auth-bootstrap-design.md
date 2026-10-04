# Release History, Supabase Keep-Alive, and Auth Bootstrap Reliability Design

Date: 2026-10-05  
Status: Approved design, awaiting implementation plan

## Purpose

Finish the current release by documenting the recently shipped work in Settings, adding a lightweight external database keep-alive, and fixing authentication transitions that can leave the PWA stuck on `Loading your offline data...`.

Success means:

1. Version History accurately describes the current release.
2. Supabase receives one small database request every 12 hours without adding work to the PWA runtime.
3. Signing in, signing out, deleting cloud data, and completing password recovery never restart or strand offline bootstrap.
4. Local-first behavior, cloud synchronization, and destructive-action safeguards remain intact.

## Current-State Findings

### Release metadata

Settings currently marks `1.3.8` as the latest release while `package.json` still reports `1.3.7`. Recent commits add substantial work after those notes, including the daily-tracker refresh, budgeting improvements, OTP password recovery, cloud-data deletion, and the correction that makes low-balance alerts use only the combined balance.

### Supabase inactivity

Supabase Free Plan projects can be paused after a period of low activity. Supabase states that a few user database requests per day are typically sufficient to avoid automatic inactivity pausing, but only a paid plan guarantees that a project will not be paused.

An in-browser timer is unsuitable because it runs only while a user has the PWA open and may be suspended by the browser or operating system. A Supabase-internal cron job is also unsuitable for this purpose because the scheduler belongs to the same project whose external activity is being maintained.

### Authentication and bootstrap

Offline bootstrap is currently initiated by route-level consumers through `useAppBootstrap(true)`. Authentication completion uses several different transitions:

- Settings sign-in performs a hard reload after an arbitrary 120 ms delay.
- Normal Settings sign-out updates authentication in place.
- Cloud deletion signs out, then performs another delayed hard reload to refresh deleted local rows.
- Password recovery signs out and immediately navigates from an unbootstrapped recovery route into a route protected by `BootstrapBoundary`.

These flows couple authentication to route mounts and full-page reloads. A new route boundary can begin another database initialization cycle even though authentication itself does not require the local database to restart. The hard reload also tears down and recreates the SQLocal worker. Bootstrap completion is currently deferred with `startTransition`, allowing the bootstrap promise to resolve before the completed state is guaranteed to be visible to a destination route.

## Chosen Approach

Implement three focused changes as release `1.3.9`:

1. Add accurate release notes and synchronize package metadata.
2. Add a GitHub Actions keep-alive workflow that makes one RLS-protected database read every 12 hours.
3. Centralize offline bootstrap in one persistent coordinator and remove authentication-driven hard reloads.

This approach keeps scheduling outside the client bundle, avoids a new database object, and addresses the shared bootstrap lifecycle instead of adding separate loading workarounds to each authentication screen.

## Alternatives Considered

### Client-side interval

Rejected because browsers throttle background tabs, installed PWAs are not guaranteed to remain open, and the request would add unnecessary work to every active client.

### Supabase Cron

Rejected for keep-alive because it runs inside the project being kept active. Supabase Cron remains appropriate for database maintenance, but it is not the desired independent activity source.

### Vercel Cron

Not selected because the current application is a static Vite deployment and has no server function. Adding a function only to proxy a tiny request introduces more deployment surface than necessary and may depend on Vercel plan scheduling limits.

### Per-screen authentication patches

Rejected because sign-in, sign-out, cloud deletion, and recovery all share the same bootstrap lifecycle. Independent delays, reloads, or loading flags would preserve the underlying coupling and create more race conditions.

## Version History Design

Add a new latest entry:

- Version: `1.3.9`
- Title: `Daily Tracking, Budgeting & Cloud Reliability`
- Summary points:
  - Refreshed Home around balances, monthly spending, budget health, recent activity, and responsive navigation.
  - Simplified transaction entry, search, details, and category management with cleaner progressive disclosure.
  - Improved budgeting with plan-first navigation, hidden edit forms, and clearer allocation summaries and actions.
  - Added six-digit email OTP password recovery with password visibility controls.
  - Added authenticated cloud-data deletion with explicit destructive confirmation and local cleanup.
  - Corrected low-balance alerts so only the combined overall balance can trigger a warning.
  - Fixed authentication transitions that could strand the offline loading screen.
  - Added a lightweight external Supabase keep-alive schedule.

Only `1.3.9` carries `latest: true`; `1.3.8` remains in history without the latest marker. Update `package.json` and the npm lockfile to `1.3.9`. No database version or PWA cache version is introduced.

## Supabase Keep-Alive Design

### Scheduler

Create `.github/workflows/supabase-keepalive.yml` with:

- `schedule: "17 */12 * * *"` to run twice daily away from the top of the hour.
- `workflow_dispatch` so the owner can test it manually.
- A short job timeout.
- Minimal repository permissions.
- No checkout or third-party action because the job needs only the runner's built-in `curl`.

GitHub scheduled workflows can be delayed under load and run from the default branch. This workflow improves the likelihood that a Free Plan project remains active; it is not represented as the same guarantee as a paid Supabase plan.

### Request

The workflow sends a bounded GET request to:

`$SUPABASE_URL/rest/v1/wallets?select=uuid&limit=1`

It supplies only the Supabase publishable key in the `apikey` header. The existing `wallets` table has row-level security enabled, and an unauthenticated request has no user JWT, so it cannot retrieve a user's wallet rows. A successful empty result still performs a real Data API database query.

The request uses failure-on-HTTP-error, a connection/operation timeout, and limited retries for transient network failures. It does not print credentials or response data. No service-role key, secret database connection string, account login, schema migration, or user data is required.

### Manual configuration

The repository owner must add these GitHub Actions repository secrets:

- `SUPABASE_URL`: the project's Supabase URL.
- `SUPABASE_PUBLISHABLE_KEY`: the project's publishable key. A legacy anonymous key may be used only if the project has not adopted publishable keys, but the workflow contract remains least-privileged and must never use `service_role`.

After the workflow reaches the default branch, the owner manually runs `Supabase Keep-Alive` once from the Actions tab and confirms a successful response. Actions scheduling must remain enabled for the repository.

### Runtime impact

The web application imports no keep-alive code and adds no timer, dependency, API route, service worker task, or background request. Supabase receives two tiny reads per day.

## Auth and Bootstrap Reliability Design

### Persistent bootstrap ownership

Mount one bootstrap coordinator inside `AppBootstrapProvider` for the lifetime of the application. The coordinator starts bootstrap once and catches the returned promise because errors are already exposed through `bootstrapError`.

`BootstrapBoundary` and `SplashScreen` become status consumers only. They must call `useAppBootstrap()` without route-level auto-start. Navigating between public and protected routes or changing authentication state must not create a new automatic bootstrap owner.

### Stable bootstrap contract

`AppBootstrapProvider` must expose a stable `bootstrap(force?: boolean)` callback and memoized context value. It must:

- Return the active bootstrap promise whenever work is already running, including a forced request, so concurrent initialization cannot start.
- Skip work when bootstrap has completed and `force` is false.
- When no work is active, a forced run reloads every local context even if bootstrap previously completed. A forced request received during active work shares that work instead of starting a competing database load.
- Set `hasBootstrapped` before the returned promise resolves; bootstrap completion is not a low-priority transition.
- Clear loading state and expose a retryable error when initialization fails.

No authentication event resets `hasBootstrapped`.

### Sign-in

Successful Settings sign-in closes the modal, clears the password field, and updates account/sync UI in place. Remove the success copy that says the app is restarting, the 120 ms timer, and `window.location.replace('/')`.

The existing authentication state listener remains authoritative. Sync and the adoption prompt may react to the new user after bootstrap is ready. Sign-in failure keeps the modal and entered email available and shows the existing error feedback.

### Normal sign-out

Normal Settings sign-out remains on Settings in local mode. It clears account-specific presentation state and does not invoke, reset, or visually re-enter bootstrap. Existing local data remains available according to the current local-first model.

### Cloud-data deletion

The destructive sequence remains:

1. Suspend sync for the current account.
2. Delete the authenticated user's cloud rows through the existing RPC.
3. Clear that user's matching local rows.
4. Resume sync only after confirmed deletion and successful local cleanup.
5. Sign out.

After the sequence succeeds, Settings calls `bootstrap(true)` to refresh all in-memory local contexts from the now-clean local database. It then closes the destructive flow, remains on Settings in local mode, and shows the success message. Remove the delayed full-page reload.

Failure behavior and the current sync-suspension safeguards remain unchanged. A failed refresh surfaces the bootstrap error/retry state rather than an endless spinner.

### Password recovery

The persistent coordinator initializes the local database even while `/reset-password` is displayed. After password update and sign-out, the recovery screen awaits `bootstrap()` before navigating to `/app/settings?auth=signin`. Existing recovery session keys are cleared, and the sign-in modal handoff remains intact.

If bootstrap fails, the user receives a retryable startup error rather than navigating into a permanently loading boundary. Password visibility controls and OTP behavior remain unchanged.

## Data and Security Boundaries

- No Supabase schema change is needed.
- No RLS policy is loosened or added.
- The keep-alive request has no authenticated user session and cannot read user-owned rows.
- The workflow never uses a service-role key.
- Authentication does not clear ordinary offline data.
- Cloud deletion continues deleting only the authenticated user's synchronized data through the existing RPC.
- Bootstrap refresh reads only the local SQLocal database and existing local settings.
- Existing session persistence and Supabase token refresh behavior remain unchanged.

## Error Handling

- A keep-alive non-2xx response, timeout, or exhausted retry fails the workflow visibly in GitHub Actions.
- Missing GitHub secrets fail before a misleading successful ping is reported.
- Bootstrap rejects with its existing descriptive timeout/error and resets `isBootstrapping`.
- The persistent coordinator consumes the rejected bootstrap promise to prevent an unhandled rejection while the UI presents `bootstrapError`.
- Authentication failures do not trigger reloads or route changes.
- Cloud-deletion ambiguity continues signing out and keeping synchronization suspended until the user retries.
- Password-reset navigation happens only after password update, sign-out, and bootstrap readiness succeed.

## Testing Strategy

Add focused regression tests for:

- A persistent bootstrap coordinator starting exactly once across consumer rerenders.
- Concurrent normal and forced bootstrap calls sharing active work instead of starting overlapping database loads.
- The bootstrap promise resolving only after `hasBootstrapped` becomes true.
- Sign-in completing without `window.location.replace` and leaving the app usable on Settings.
- Normal sign-out retaining the Settings/local-mode UI without showing the offline startup loader.
- Cloud deletion preserving the remote-delete, local-clear, and sign-out order, then forcing a local context refresh without a hard reload.
- Password reset awaiting sign-out and bootstrap readiness before navigating to the sign-in handoff.
- Version `1.3.9` being the only latest release entry and containing the required release-note topics.
- Static workflow assertions for the 12-hour schedule, manual trigger, least-privileged request, timeouts, and absence of service-role credentials.

Verification before completion requires:

1. Observe relevant new tests fail before implementation and pass afterward.
2. Run the full Vitest suite.
3. Run ESLint.
4. Run the TypeScript and Vite production build.
5. Execute the same RLS-protected Data API request against the configured Supabase project without printing its key or response body.
6. Validate the workflow file and manually trigger it after the user adds GitHub secrets and the commit reaches the default branch.
7. Manually smoke-test sign-in, normal sign-out, password reset, and successful cloud deletion in the installed/mobile PWA flow.

## Expected Code Areas

- `src/context/AppBootstrapContext.tsx`
- `src/context/AppProviders.tsx`
- `src/hooks/useAppBootstrap.ts`
- `src/App.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/screens/ResetPasswordScreen.tsx`
- Focused tests beside the affected contexts and screens
- `.github/workflows/supabase-keepalive.yml`
- `src/screens/SettingsScreen.tsx` version-history data or a focused extracted release-history module
- `package.json`
- `package-lock.json`
- `README.md`

The implementation plan may narrow this list after creating test seams. It must not add a server function, new scheduler provider, database table, RLS exception, or frontend keep-alive timer without separate approval.

## Non-Goals

- Guaranteeing Free Plan availability at the same service level as Supabase Pro
- Adding a serverless backend solely for keep-alive
- Adding a Supabase Cron job for self-pinging
- Changing synchronization merge rules
- Deleting the Supabase Auth account during cloud-data deletion
- Clearing anonymous/offline-only rows when a user signs out
- Redesigning Settings or authentication modals
- Changing OTP delivery or password rules
- Deploying, pushing, or configuring GitHub repository secrets on the user's behalf

## Acceptance Criteria

The work is complete when:

- Settings shows `1.3.9` as the only latest version and accurately lists the recent work.
- Package metadata also reports `1.3.9`.
- GitHub Actions can manually and automatically issue one small RLS-protected database request every 12 hours.
- No keep-alive code is shipped in the PWA bundle.
- Sign-in completes in place without a hard reload or offline loading loop.
- Normal sign-out remains in local mode without a hard reload or offline loading loop.
- Cloud deletion refreshes cleared local state without a hard reload or stale in-memory financial rows.
- Password recovery returns to the Settings sign-in handoff without an offline loading loop.
- Route changes and auth state changes do not create competing bootstrap runs.
- Bootstrap failures produce a retryable error instead of an indefinite loading state.
- Existing local-first access, cloud sync, OTP recovery, cloud-deletion safeguards, and low-balance behavior continue to work.
- Tests, lint, and production build pass.
