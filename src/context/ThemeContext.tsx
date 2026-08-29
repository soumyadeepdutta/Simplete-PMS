import React, { createContext, useContext, useEffect, useState } from 'react';
import { readMigratedLocalStorage } from '../services/storageService';
import {
  ColorThemeId,
  DEFAULT_COLOR_THEME,
  isColorThemeId,
} from '../themes/colorThemes';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  colorTheme: ColorThemeId;
  setColorTheme: (id: ColorThemeId) => void;
}

const COLOR_THEME_KEY = 'simplete_color_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function readStoredColorTheme(): ColorThemeId {
  try {
    const saved = localStorage.getItem(COLOR_THEME_KEY);
    if (isColorThemeId(saved)) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_COLOR_THEME;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = readMigratedLocalStorage('simplete_theme', 'taskorbit_theme') as Theme;
    return saved || 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(false);
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>(() => readStoredColorTheme());

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let resolvedDark = false;
      if (theme === 'system') {
        resolvedDark = mediaQuery.matches;
      } else {
        resolvedDark = theme === 'dark';
      }

      setIsDark(resolvedDark);
      if (resolvedDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    localStorage.setItem('simplete_theme', theme);

    const listener = () => {
      if (theme === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-color-theme', colorTheme);
    try {
      localStorage.setItem(COLOR_THEME_KEY, colorTheme);
    } catch {
      /* ignore */
    }
  }, [colorTheme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  const setColorTheme = (id: ColorThemeId) => {
    setColorThemeState(id);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
