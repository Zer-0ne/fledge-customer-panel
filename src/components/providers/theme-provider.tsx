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
  if (typeof window === 'undefined') return 'indigo';
  try {
    const stored = localStorage.getItem(COLOR_STORAGE_KEY) as ColorTheme | null;
    if (stored && ['indigo', 'blue', 'emerald', 'violet', 'amber', 'rose', 'slate'].includes(stored)) {
      return stored;
    }
  } catch {}
  return 'indigo';
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
