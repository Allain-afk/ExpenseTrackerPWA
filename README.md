# ExpenseTrackerPWA

Progressive Web App port of the Flutter Expense Tracker, built with React, TypeScript, Vite, SQLocal, and `vite-plugin-pwa`.

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npm run test:run
```

## Important Deployment Note

SQLocal persistence requires cross-origin isolation for OPFS-backed SQLite. Your production host must send the same headers used in `vite.config.ts`:

```http
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

Without those headers, the app will still load, but SQLocal will not be able to persist the database to the origin private file system.

## Vercel Deployment

This repository includes `vercel.json` configured for:

- Vite static build output (`dist`)
- SPA fallback routing to `index.html` for extensionless app routes
- Required SQLocal isolation headers (`COEP` and `COOP`)

Manual deployment settings in Vercel can be:

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

## Supabase Keep-Alive

The `Supabase Keep-Alive` GitHub Actions workflow makes one lightweight, read-only database request every 12 hours. It runs outside the web app, so it does not add client-side traffic or bundle code.

To configure it after pushing this repository:

1. Open the GitHub repository, then go to **Settings > Secrets and variables > Actions**.
2. Add a repository secret named `SUPABASE_URL` with the project's Supabase URL.
3. Add a repository secret named `SUPABASE_PUBLISHABLE_KEY` with the project's publishable (anon) key. Never use the service-role key.
4. Ensure GitHub Actions is enabled and this workflow exists on the default branch.
5. Open **Actions > Supabase Keep-Alive**, choose **Run workflow**, and confirm that both steps pass.

The scheduled runs are requested at 00:17 and 12:17 UTC. GitHub may delay scheduled jobs during busy periods. The request reads at most one wallet UUID and remains subject to the database's Row Level Security policies; an empty result is still a successful ping.

For public repositories, GitHub automatically disables scheduled workflows after 60 days without repository activity. If this applies, check the workflow periodically and re-enable it from **Actions > Supabase Keep-Alive > Enable workflow**.

This reduces the likelihood of an inactive free project being paused, but it is not a service guarantee. Supabase's paid plans are the supported option when a project must never be paused.
