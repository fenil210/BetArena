/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'betarena_theme';
const ThemeContext = createContext(null);

function getInitialTheme() {
    if (typeof window === 'undefined') return 'dark';
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
    const root = document.documentElement;
    root.classList.toggle('theme-dark', theme === 'dark');
    root.classList.toggle('theme-light', theme === 'light');
    root.style.colorScheme = theme;
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(getInitialTheme);

    const toggleTheme = useCallback(() => {
        document.documentElement.classList.add('theme-switching');
        setTheme((current) => current === 'dark' ? 'light' : 'dark');
        window.setTimeout(() => {
            document.documentElement.classList.remove('theme-switching');
        }, 220);
    }, []);

    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    const value = useMemo(() => ({
        theme,
        isDark: theme === 'dark',
        toggleTheme,
    }), [theme, toggleTheme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const value = useContext(ThemeContext);
    if (!value) {
        throw new Error('useTheme must be used inside ThemeProvider');
    }
    return value;
}
