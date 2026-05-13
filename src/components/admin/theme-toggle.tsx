"use client";

import { Moon, SunMedium } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);

  useEffect(() => {
    applyResolvedTheme(readInitialTheme(), false);
  }, []);

  function chooseTheme(next: Theme) {
    applyTheme(next);
  }

  return (
    <div className="grid grid-cols-2 rounded-[22px] bg-[#eeeeef] p-1.5 dark:bg-white/10">
      <button
        type="button"
        aria-pressed={theme === "light"}
        onClick={() => chooseTheme("light")}
        className={[
          "flex items-center justify-center gap-2 rounded-[17px] px-3 py-3 text-sm font-bold transition",
          theme === "light"
            ? "bg-white text-[#1f2024] shadow-sm dark:bg-white dark:text-[#1f2024]"
            : "text-[#777e89] hover:text-[#1f2024] dark:text-white/55 dark:hover:text-white",
        ].join(" ")}
      >
        <SunMedium className="h-4 w-4" />
        浅色
      </button>
      <button
        type="button"
        aria-pressed={theme === "dark"}
        onClick={() => chooseTheme("dark")}
        className={[
          "flex items-center justify-center gap-2 rounded-[17px] px-3 py-3 text-sm font-bold transition",
          theme === "dark"
            ? "bg-[#ff6b4a] text-white shadow-sm dark:bg-[#ff6b4a] dark:text-white"
            : "text-[#777e89] hover:text-[#1f2024] dark:text-white/55 dark:hover:text-white",
        ].join(" ")}
      >
        <Moon className="h-4 w-4" />
        深色
      </button>
    </div>
  );
}

function applyTheme(next: Theme) {
  applyResolvedTheme(next, true);
}

function applyResolvedTheme(next: Theme, persist: boolean) {
  document.documentElement.classList.toggle("dark", next === "dark");
  if (persist) {
    window.localStorage.setItem("lopuo-admin-theme", next);
  }
  window.dispatchEvent(new Event("lopuo-admin-theme-change"));
}

function readInitialTheme(): Theme {
  const stored = window.localStorage.getItem("lopuo-admin-theme");
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getThemeSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

function subscribeTheme(onStoreChange: () => void) {
  window.addEventListener("lopuo-admin-theme-change", onStoreChange);
  return () => window.removeEventListener("lopuo-admin-theme-change", onStoreChange);
}
