import { useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./theme-context";

const THEME_STORAGE_KEY = "takiply-theme";

function readInitialTheme() {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === "dark" || savedTheme === "light" ? savedTheme : "light";
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const initialTheme = readInitialTheme();
    applyTheme(initialTheme);
    return initialTheme;
  });

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark"))
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
