import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

function getSystemTheme(): "dark" | "light" {
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme;
    return saved || "system";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === "system") {
      const systemTheme = getSystemTheme();
      root.classList.remove("light", "dark");
      root.classList.add(systemTheme);
    } else {
      root.classList.remove("light", "dark");
      root.classList.add(theme);
    }
    
    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, setTheme };
}
