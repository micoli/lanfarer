import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute("data-theme", resolved);
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(
    () => (localStorage.getItem("theme") as ThemePreference | null) ?? "system"
  );

  const setTheme = useCallback((pref: ThemePreference) => {
    localStorage.setItem("theme", pref);
    setPreference(pref);
    applyTheme(resolveTheme(pref));
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(resolveTheme("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  return { preference, setTheme };
}
