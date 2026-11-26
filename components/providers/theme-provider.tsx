"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: Theme
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

function subscribeSystemTheme(callback: () => void) {
  const mql = window.matchMedia("(prefers-color-scheme: dark)")
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getServerSystemTheme(): ResolvedTheme {
  return "light"
}

function applyThemeClass(resolved: ResolvedTheme, disableTransitionOnChange?: boolean) {
  const root = document.documentElement
  let style: HTMLStyleElement | undefined

  if (disableTransitionOnChange) {
    style = document.createElement("style")
    style.appendChild(
      document.createTextNode(
        "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}"
      )
    )
    document.head.appendChild(style)
  }

  root.classList.remove("light", "dark")
  root.classList.add(resolved)
  root.style.colorScheme = resolved

  if (style) {
    window.getComputedStyle(document.body)
    requestAnimationFrame(() => style?.remove())
  }
}

/**
 * React 19-safe theme provider for light/dark/system theme switching without inline client `<script>` tags.
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const systemTheme = React.useSyncExternalStore(
    subscribeSystemTheme,
    getSystemTheme,
    getServerSystemTheme
  )

  React.useEffect(() => {
    const stored = window.localStorage.getItem("theme") as Theme | null
    const initial: Theme =
      stored === "light" || stored === "dark" || stored === "system" ? stored : defaultTheme
    if (initial !== defaultTheme) {
      queueMicrotask(() => setThemeState(initial))
    }
  }, [defaultTheme])

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (enableSystem ? systemTheme : "light") : theme

  React.useEffect(() => {
    applyThemeClass(resolvedTheme, disableTransitionOnChange)
  }, [resolvedTheme, disableTransitionOnChange])

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
    window.localStorage.setItem("theme", next)
  }, [])

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Returns the current theme state and setter from {@link ThemeProvider}.
 */
export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    return { theme: "system", resolvedTheme: "light", setTheme: () => {} }
  }
  return ctx
}