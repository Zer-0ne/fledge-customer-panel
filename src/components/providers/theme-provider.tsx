'use client';

import * as React from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>('light');

  // Sync theme with localStorage & document element
  React.useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as Theme) || 'system';
    const timer = window.setTimeout(() => setThemeState(savedTheme), 0);
    return () => window.clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const actualTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    const timer = window.setTimeout(() => setResolvedTheme(actualTheme), 0);

    if (actualTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    return () => window.clearTimeout(timer);
  }, [theme]);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
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
