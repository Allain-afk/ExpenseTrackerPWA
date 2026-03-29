import { defaultThemeId, getThemePreset, type ThemeTokens } from '../constants/themes';
import type { ThemeId } from '../../types/models';

const cssVariableMap: Record<keyof ThemeTokens, string> = {
  backgroundStart: '--color-background-start',
  backgroundMid: '--color-background-mid',
  backgroundEnd: '--color-background-end',
  splashStart: '--color-splash-start',
  splashMid: '--color-splash-mid',
  splashEnd: '--color-splash-end',
  colorPrimary: '--color-primary',
  colorPrimaryLight: '--color-primary-light',
  colorPrimarySoft: '--color-primary-soft',
  colorPrimaryBorder: '--color-primary-border',
  colorSecondary: '--color-secondary',
  colorSurface: '--color-surface',
  colorSurfaceSoft: '--color-surface-soft',
  colorSurfaceTranslucent: '--color-surface-translucent',
  colorSurfaceElevated: '--color-surface-elevated',
  colorText: '--color-text',
  colorTextSecondary: '--color-text-secondary',
  colorBorder: '--color-border',
  colorOverlay: '--color-overlay',
  colorDockBackground: '--color-dock-bg',
  colorDockBorder: '--color-dock-border',
  buttonPrimaryStart: '--button-primary-start',
  buttonPrimaryEnd: '--button-primary-end',
  shadowStrong: '--shadow-strong',
  focusRing: '--focus-ring',
  themeColor: '--color-theme-meta',
};

function ensureThemeColorMeta(): HTMLMetaElement {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }

  return meta;
}

export function applyThemeToDocument(themeId: ThemeId = defaultThemeId): void {
  const theme = getThemePreset(themeId);
  const root = document.documentElement;

  root.dataset.theme = theme.id;

  Object.entries(cssVariableMap).forEach(([token, cssVar]) => {
    root.style.setProperty(cssVar, theme.tokens[token as keyof ThemeTokens]);
  });

  ensureThemeColorMeta().setAttribute('content', theme.tokens.themeColor);
}
