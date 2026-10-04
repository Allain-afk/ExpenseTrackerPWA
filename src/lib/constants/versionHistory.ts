export interface VersionHistoryEntry {
  version: string;
  title: string;
  description: readonly string[];
  accent: string;
  badgeBackground: string;
  surface: string;
  latest?: boolean;
}

export const versionHistory: readonly VersionHistoryEntry[] = [
  {
    version: '1.3.9',
    title: 'Daily Tracking, Budgeting & Cloud Reliability',
    description: [
      'Refreshed Home around daily balances, monthly spending, budget health, recent activity, and responsive navigation.',
      'Simplified transaction entry, search, details, and category management with cleaner progressive disclosure.',
      'Improved budgeting with plan-first navigation, hidden edit forms, and clearer allocation summaries and actions.',
      'Added six-digit email OTP password recovery with password visibility controls.',
      'Added authenticated cloud data deletion with explicit destructive confirmation and local cleanup.',
      'Corrected low-balance alerts so only the combined overall balance can trigger a warning.',
      'Fixed sign-in and sign-out transitions that could strand the offline loading screen.',
      'Added a lightweight external Supabase keep-alive schedule.',
    ],
    accent: '#2563eb',
    badgeBackground: 'rgba(37, 99, 235, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(239, 246, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
    latest: true,
  },
  {
    version: '1.3.8',
    title: 'Wide-Device Layout & Navigation Rail',
    description: [
      'Added a collapsible side navigation rail on tablets and desktops while keeping the floating dock on phones.',
      'Capped content in a centered column on larger screens so reading width stays comfortable.',
      'Unlocked portrait-only orientation so tablets, foldables, and laptops can use landscape naturally.',
      'Analytics and dashboard charts now scale by aspect ratio instead of fixed heights.',
      'Repositioned the Add Transaction save button to sit at the same bottom level as the navigation dock.',
      'Added safe-area aware spacing for the dock, FAB, and form submit bar on notched devices.',
      'Introduced subtle modal enter animations and respect prefers-reduced-motion for accessibility.',
    ],
    accent: '#0f766e',
    badgeBackground: 'rgba(15, 118, 110, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(240, 253, 250, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.3.7',
    title: 'Balance Visibility Control',
    description: [
      'Toggle visibility to hide sensitive balances behind asterisks for better privacy in public.',
      'Visibility state is per-card and is now persistent across all cards even when the app is reloaded.',
    ],
    accent: '#2563eb',
    badgeBackground: 'rgba(37, 99, 235, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(239, 246, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.3.6',
    title: 'Per-Wallet Low Balance Limits',
    description: [
      'Added individual low-balance thresholds for each wallet card.',
      'Enable a custom limit directly on the Add / Edit Card screen.',
      'Wallets without a custom limit continue to use the global fallback from Settings.',
      'Low-balance alerts now fire per wallet with the wallet name shown in the notification.',
      'Global Threshold Amount label updated to clarify it is a fallback.',
    ],
    accent: '#0f766e',
    badgeBackground: 'rgba(15, 118, 110, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(240, 253, 250, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
    latest: undefined,
  },
  {
    version: '1.3.5',
    title: 'Analytics & Sync Improvements',
    description: [
      'Added a reset-password screen with email-driven recovery flow.',
      'Refined the reset-password UI with a stronger layout and show/hide password control.',
      'Introduced analytics insights with budgets syncing support.',
      'Adjusted background sync to run every 5 minutes and auto-sync when local changes are detected.',
      'Trimmed Recent Transactions to three items for a cleaner dashboard.',
      'Added a Security section in Settings to request password reset emails.',
    ],
    accent: '#0f766e',
    badgeBackground: 'rgba(15, 118, 110, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(240, 253, 250, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
    latest: undefined,
  },
  {
    version: '1.3.4',
    title: 'Transaction UI Balance & Small Fixes',
    description: [
      'Softened transaction icons app-wide with a smaller, lower-opacity plus and minus badge style.',
      'Matched the Add Transaction sticky save button more closely to the main bottom navigation height.',
      'Fixed the Transaction date card layout so the calendar section and input stay inside the card cleanly.',
    ],
    accent: '#2563eb',
    badgeBackground: 'rgba(37, 99, 235, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(239, 246, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.3.3',
    title: 'Transaction Polish & Daily Tips',
    description: [
      'Added Allowance as an income category for easier personal budget tracking.',
      'Updated transaction icons with clearer plus and minus badges across Home and Transactions.',
      'Refined the Add Transaction screen with sectioned cards, a stronger amount input, a lower sticky save action, and cleaner header spacing.',
      'Replaced the Home screen expense groups section with a rotating Tip of the Day card that changes every day.',
    ],
    accent: '#0f766e',
    badgeBackground: 'rgba(15, 118, 110, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(240, 253, 250, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.3.2',
    title: 'Themes, Ordering & Delete Safeguards',
    description: [
      'Added app-wide blue, pink, mint, and dark theme presets in Settings.',
      'Added drag-and-drop card ordering so Home can follow your preferred card order.',
      'Deleting a card now also removes its linked transactions and shows a stronger warning first.',
      'Kept the main combined balance card pinned first while wallet cards can be rearranged.',
    ],
    accent: '#db2777',
    badgeBackground: 'rgba(219, 39, 119, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(255, 244, 250, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.3.1',
    title: 'Toast & Card Visibility Update',
    description: [
      'Added custom react-hot-toast notifications with a cleaner in-app alert style.',
      'Added card visibility controls for wallet cards and the default Total Money card.',
      'Improved Manage Cards and mobile card editor layouts for better readability.',
    ],
    accent: '#2563eb',
    badgeBackground: 'rgba(37, 99, 235, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(239, 246, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.3.0',
    title: 'Multi-Wallet & Modern UI',
    description: [
      'Introduced multi-wallet support with dedicated balances for each card.',
      'Upgraded the floating navigation dock and refreshed the dashboard presentation.',
      'Redesigned Settings and Transactions screens with a more modern glassmorphic feel.',
    ],
    accent: '#7c3aed',
    badgeBackground: 'rgba(124, 58, 237, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(245, 243, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.2.0',
    title: 'New user UI/UX functionalities',
    description: [
      'Added a notification system for low-budget thresholds.',
      'Personalized alert messages using the saved user name.',
      'Added customizable notification settings for message and threshold.',
    ],
    accent: '#ea580c',
    badgeBackground: 'rgba(249, 115, 22, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(255, 247, 237, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.0.3',
    title: 'App Animation Feature (Splash Screen) when opened',
    description: [
      'Added a more polished animated splash screen.',
      'Improved opening transitions for a smoother first impression.',
    ],
    accent: '#06b6d4',
    badgeBackground: 'rgba(6, 182, 212, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(236, 254, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.0.2',
    title: 'UI and UX Improvements',
    description: [
      'Enhanced the overall interface design system.',
      'Improved everyday usability across key screens.',
      'Included general performance optimizations.',
    ],
    accent: '#10b981',
    badgeBackground: 'rgba(16, 185, 129, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(236, 253, 245, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.0.1',
    title: 'App Icon Update',
    description: [
      'Updated the app icon with a cleaner visual identity.',
      'Improved recognizability on the home screen.',
    ],
    accent: '#ec4899',
    badgeBackground: 'rgba(236, 72, 153, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(253, 242, 248, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
  {
    version: '1.0.0',
    title: 'Basic Features for Expense Tracking',
    description: [
      'Launched the core expense tracking experience.',
      'Added transaction management essentials.',
      'Included the first set of basic reporting features.',
    ],
    accent: '#475569',
    badgeBackground: 'rgba(71, 85, 105, 0.12)',
    surface:
      'linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
  },
] as const;
