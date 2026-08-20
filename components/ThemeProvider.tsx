"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "cynthy-gozy-theme";

type Theme = "light" | "dark";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const nextTheme = (event as CustomEvent<Theme>).detail;
      if (nextTheme === "light" || nextTheme === "dark") setTheme(nextTheme);
    };
    window.addEventListener("theme-change", handleThemeChange);
    return () => window.removeEventListener("theme-change", handleThemeChange);
  }, []);

  return children;
}

export function setTheme(theme: Theme) {
  window.localStorage.setItem(THEME_KEY, theme);
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new CustomEvent("theme-change", { detail: theme }));
}
