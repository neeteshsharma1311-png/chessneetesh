import { useState, useEffect, useCallback } from 'react';
import { Theme } from '@/types/chess';

const THEME_KEY = 'chess-theme';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(THEME_KEY) as Theme) || 'default';
    }
    return 'default';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('theme-classic', 'theme-ocean', 'theme-forest', 'theme-sunset');
    
    // Add new theme class if not default
    if (theme !== 'default') {
      root.classList.add(`theme-${theme}`);
    }
    
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const changeTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, []);

  return { theme, changeTheme };
};
