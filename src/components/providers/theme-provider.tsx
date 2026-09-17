'use client';

import * as React from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ColorTheme = 'indigo' | 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate';
export type FontScale = 'normal' | 'medium' | 'large';

export interface ColorThemeOption {
  value: ColorTheme;
  label: string;
  dotClass: string;
}

export const COLOR_THEME_OPTIONS: ColorThemeOption[] = [
  { value: 'indigo', label: 'Indigo Modern', dotClass: 'bg-indigo-600' },
  { value: 'blue', label: 'Ocean Blue', dotClass: 'bg-blue-600' },
  { value: 'emerald', label: 'Emerald Green', dotClass: 'bg-emerald-600' },
  { value: 'violet', label: 'Royal Violet', dotClass: 'bg-purple-600' },
  { value: 'amber', label: 'Warm Amber', dotClass: 'bg-amber-600' },
  { value: 'rose', label: 'Sunset Rose', dotClass: 'bg-rose-600' },
  { value: 'slate', label: 'Monochrome Slate', dotClass: 'bg-slate-700 dark:bg-slate-300' },
];

export interface FontScaleOption {
  value: FontScale;
  label: string;
  description: string;
  sizeLabel: string;
}

export const FONT_SCALE_OPTIONS: FontScaleOption[] = [
  { value: 'normal', label: 'Standard', description: 'Default clean size (16px)', sizeLabel: 'A' },
  { value: 'medium', label: 'Comfortable', description: 'Enlarged for relaxed reading (+7%)', sizeLabel: 'A+' },
  { value: 'large', label: 'Large', description: 'Maximum clarity & legibility (+15%)', sizeLabel: 'A++' },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  colorTheme: ColorTheme;
  setColorTheme: (color: ColorTheme) => void;
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme';
const COLOR_STORAGE_KEY = 'theme-color';
const FONT_SCALE_STORAGE_KEY = 'theme-font-scale';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored;
    }
  } catch {}
  return 'system';
}

function getInitialColorTheme(): ColorTheme {
  // Default accent palette = Monochrome Slate.
  if (typeof window === 'undefined') return 'slate';
  try {
    const stored = localStorage.getItem(COLOR_STORAGE_KEY) as ColorTheme | null;
    if (stored && ['indigo', 'blue', 'emerald', 'violet', 'amber', 'rose', 'slate'].includes(stored)) {
      return stored;
    }
  } catch {}
  return 'slate';
}

function getInitialFontScale(): FontScale {
  if (typeof window === 'undefined') return 'normal';
  try {
    const stored = localStorage.getItem(FONT_SCALE_STORAGE_KEY) as FontScale | null;
    if (stored && ['normal', 'medium', 'large'].includes(stored)) {
      return stored;
    }
  } catch {}
  return 'normal';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(getInitialTheme);
  const [colorTheme, setColorThemeState] = React.useState<ColorTheme>(getInitialColorTheme);
  const [fontScale, setFontScaleState] = React.useState<FontScale>(getInitialFontScale);
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>('light');

  // Handle Mode (Light/Dark/System)
  React.useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let active: 'light' | 'dark' = 'light';
      if (theme === 'dark') {
        active = 'dark';
      } else if (theme === 'light') {
        active = 'light';
      } else {
        active = mediaQuery.matches ? 'dark' : 'light';
      }

      setResolvedTheme(active);

      if (active === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    const handleChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Handle Color Theme
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme-color', colorTheme);
  }, [colorTheme]);

  // Handle Font Scale
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-font-scale', fontScale);
  }, [fontScale]);

  // Keep the browser/PWA status-bar tint in sync with the IN-APP theme (the
  // user can force light/dark regardless of the OS setting; the static
  // media-based theme-color metas only cover the first paint).
  //
  // CRITICAL (2026-09-17): never remove() the meta tags here. Next renders the
  // `theme-color` metas as part of its metadata tree, and React hydrates the
  // whole document — removing a React-managed node behind its back makes the
  // next commit call removeChild on a node whose parent is already gone:
  // "Uncaught TypeError: can't access property removeChild, n.stateNode.parentNode
  // is null". React's render loop dies with it and every later router update
  // (navigation clicks) silently stops working until a manual reload.
  // Instead: update `content` in place (Chrome re-reads theme-color on
  // attribute change), and keep one dedicated tag we own for fallback.
  React.useEffect(() => {
    const probe = document.createElement('div');
    probe.style.color = 'var(--background)';
    probe.style.display = 'none';
    // Append → read → remove are synchronous in a single task, so React never
    // sees this node between commits.
    document.body.appendChild(probe);
    const color =
      window.getComputedStyle(probe).color || (resolvedTheme === 'dark' ? '#0a0a0a' : '#ffffff');
    probe.remove();

    // Update every existing theme-color meta in place — no removals.
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    if (metas.length > 0) {
      metas.forEach((el) => {
        if (el.getAttribute('content') !== color) el.setAttribute('content', color);
      });
      return;
    }
    // No metadata tag at all (unusual) — add one we own, once.
    const existing = document.querySelector<HTMLMetaElement>('meta[data-app-theme-color]');
    if (existing) {
      if (existing.getAttribute('content') !== color) existing.setAttribute('content', color);
      return;
    }
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.setAttribute('data-app-theme-color', 'true');
    meta.content = color;
    document.head.appendChild(meta);
  }, [resolvedTheme]);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {}
  };

  const setColorTheme = (nextColor: ColorTheme) => {
    setColorThemeState(nextColor);
    try {
      localStorage.setItem(COLOR_STORAGE_KEY, nextColor);
    } catch {}
  };

  const setFontScale = (nextScale: FontScale) => {
    setFontScaleState(nextScale);
    try {
      localStorage.setItem(FONT_SCALE_STORAGE_KEY, nextScale);
    } catch {}
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resolvedTheme,
        colorTheme,
        setColorTheme,
        fontScale,
        setFontScale,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
