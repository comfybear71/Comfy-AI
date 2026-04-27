"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light")
  const [mounted, setMounted] = useState(false)

  // Load theme from Neon on mount
  useEffect(() => {
    setMounted(true)
    fetch("/api/user/prefs")
      .then((res) => res.json())
      .then((data) => {
        const t = data.theme || "system"
        setThemeState(t)
        applyTheme(t)
      })
      .catch(() => {
        applyTheme("system")
      })
  }, [])

  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
  }, [theme, mounted])

  function applyTheme(t: Theme) {
    const root = document.documentElement
    root.classList.remove("light", "dark")

    if (t === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      root.classList.add(systemDark ? "dark" : "light")
      setResolvedTheme(systemDark ? "dark" : "light")
    } else {
      root.classList.add(t)
      setResolvedTheme(t)
    }
  }

  function setTheme(t: Theme) {
    setThemeState(t)
    // Save to Neon
    fetch("/api/user/prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: t }),
    }).catch(() => {
      // Silently fail — will retry next toggle
    })
  }

  function toggleTheme() {
    const next = resolvedTheme === "light" ? "dark" : "light"
    setTheme(next)
  }

  // Listen for system changes when in system mode
  useEffect(() => {
    const listener = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        applyTheme("system")
      }
    }
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", listener)
    return () => window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", listener)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
