import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import sqlocal from 'sqlocal/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defaultThemeId, getThemePreset } from './src/lib/constants/themes';

const crossOriginHeaders = {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
};
const defaultTheme = getThemePreset(defaultThemeId);

export default defineConfig({
  plugins: [
    sqlocal(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Expense Tracker PWA',
        short_name: 'ExpenseTracker',
        description: 'Offline-first expense tracking with groups, cards, and alerts.',
        theme_color: defaultTheme.tokens.themeColor,
        background_color: defaultTheme.tokens.backgroundMid,
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,woff,woff2}'],
        navigateFallback: 'index.html',
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    headers: crossOriginHeaders,
  },
  preview: {
    headers: crossOriginHeaders,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
