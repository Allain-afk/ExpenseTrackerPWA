import type { ThemeId } from '../../types/models';

export interface ThemeTokens {
  backgroundStart: string;
  backgroundMid: string;
  backgroundEnd: string;
  splashStart: string;
  splashMid: string;
  splashEnd: string;
  colorPrimary: string;
  colorPrimaryLight: string;
  colorPrimarySoft: string;
  colorPrimaryBorder: string;
  colorSecondary: string;
  colorSurface: string;
  colorSurfaceSoft: string;
  colorSurfaceTranslucent: string;
  colorSurfaceElevated: string;
  colorText: string;
  colorTextSecondary: string;
  colorBorder: string;
  colorOverlay: string;
  colorDockBackground: string;
  colorDockBorder: string;
  buttonPrimaryStart: string;
  buttonPrimaryEnd: string;
  shadowStrong: string;
  focusRing: string;
  themeColor: string;
}

export interface ThemePreset {
  id: ThemeId;
  label: string;
  description: string;
  preview: [string, string, string];
  tokens: ThemeTokens;
}

export const defaultThemeId: ThemeId = 'blue';

export const themePresets: Record<ThemeId, ThemePreset> = {
  blue: {
    id: 'blue',
    label: 'Ocean Blue',
    description: 'Bright, glassy, and close to the current look.',
    preview: ['#60a5fa', '#2563eb', '#14b8a6'],
    tokens: {
      backgroundStart: '#f8fbff',
      backgroundMid: '#f3f6fc',
      backgroundEnd: '#eff3f9',
      splashStart: '#2563eb',
      splashMid: '#1d4ed8',
      splashEnd: '#1e3a8a',
      colorPrimary: '#2563eb',
      colorPrimaryLight: '#60a5fa',
      colorPrimarySoft: 'rgba(37, 99, 235, 0.12)',
      colorPrimaryBorder: 'rgba(37, 99, 235, 0.24)',
      colorSecondary: '#14b8a6',
      colorSurface: '#ffffff',
      colorSurfaceSoft: '#f9fbff',
      colorSurfaceTranslucent: 'rgba(255, 255, 255, 0.92)',
      colorSurfaceElevated: 'rgba(249, 251, 255, 0.98)',
      colorText: '#1e293b',
      colorTextSecondary: '#64748b',
      colorBorder: 'rgba(217, 227, 240, 0.9)',
      colorOverlay: 'rgba(15, 23, 42, 0.48)',
      colorDockBackground: 'rgba(255, 255, 255, 0.84)',
      colorDockBorder: 'rgba(217, 227, 240, 0.85)',
      buttonPrimaryStart: '#3b82f6',
      buttonPrimaryEnd: '#2563eb',
      shadowStrong: '0 18px 28px rgba(37, 99, 235, 0.16)',
      focusRing: 'rgba(37, 99, 235, 0.14)',
      themeColor: '#2563eb',
    },
  },
  pink: {
    id: 'pink',
    label: 'Blush Pink',
    description: 'Warm pink highlights with softer rose surfaces.',
    preview: ['#f9a8d4', '#ec4899', '#f97316'],
    tokens: {
      backgroundStart: '#fff7fb',
      backgroundMid: '#fff1f7',
      backgroundEnd: '#fce7f3',
      splashStart: '#ec4899',
      splashMid: '#db2777',
      splashEnd: '#9d174d',
      colorPrimary: '#db2777',
      colorPrimaryLight: '#f472b6',
      colorPrimarySoft: 'rgba(219, 39, 119, 0.12)',
      colorPrimaryBorder: 'rgba(219, 39, 119, 0.24)',
      colorSecondary: '#fb7185',
      colorSurface: '#ffffff',
      colorSurfaceSoft: '#fff6fb',
      colorSurfaceTranslucent: 'rgba(255, 250, 253, 0.94)',
      colorSurfaceElevated: 'rgba(255, 247, 251, 0.98)',
      colorText: '#4a1230',
      colorTextSecondary: '#9d5c78',
      colorBorder: 'rgba(244, 192, 219, 0.9)',
      colorOverlay: 'rgba(76, 29, 55, 0.46)',
      colorDockBackground: 'rgba(255, 248, 252, 0.88)',
      colorDockBorder: 'rgba(244, 192, 219, 0.82)',
      buttonPrimaryStart: '#f472b6',
      buttonPrimaryEnd: '#db2777',
      shadowStrong: '0 18px 28px rgba(219, 39, 119, 0.18)',
      focusRing: 'rgba(219, 39, 119, 0.14)',
      themeColor: '#db2777',
    },
  },
  mint: {
    id: 'mint',
    label: 'Fresh Mint',
    description: 'Crisp green accents with airy, cool backgrounds.',
    preview: ['#6ee7b7', '#10b981', '#0f766e'],
    tokens: {
      backgroundStart: '#f4fffb',
      backgroundMid: '#edfdf7',
      backgroundEnd: '#e6fcf3',
      splashStart: '#10b981',
      splashMid: '#0f766e',
      splashEnd: '#115e59',
      colorPrimary: '#0f766e',
      colorPrimaryLight: '#34d399',
      colorPrimarySoft: 'rgba(15, 118, 110, 0.12)',
      colorPrimaryBorder: 'rgba(15, 118, 110, 0.24)',
      colorSecondary: '#10b981',
      colorSurface: '#ffffff',
      colorSurfaceSoft: '#f4fffb',
      colorSurfaceTranslucent: 'rgba(250, 255, 252, 0.93)',
      colorSurfaceElevated: 'rgba(246, 255, 251, 0.98)',
      colorText: '#134e4a',
      colorTextSecondary: '#4b7c75',
      colorBorder: 'rgba(181, 225, 213, 0.9)',
      colorOverlay: 'rgba(17, 94, 89, 0.42)',
      colorDockBackground: 'rgba(248, 255, 252, 0.88)',
      colorDockBorder: 'rgba(181, 225, 213, 0.84)',
      buttonPrimaryStart: '#14b8a6',
      buttonPrimaryEnd: '#0f766e',
      shadowStrong: '0 18px 28px rgba(15, 118, 110, 0.18)',
      focusRing: 'rgba(15, 118, 110, 0.14)',
      themeColor: '#0f766e',
    },
  },
};

export const themeOptions = Object.values(themePresets);

export function getThemePreset(themeId: ThemeId | string | undefined): ThemePreset {
  if (!themeId || !(themeId in themePresets)) {
    return themePresets[defaultThemeId];
  }

  return themePresets[themeId as ThemeId];
}
