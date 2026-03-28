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
