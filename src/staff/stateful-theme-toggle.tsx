"use client"

import { useSyncExternalStore, type ComponentProps } from "react"

import { THEME_EVENT, THEME_STORAGE_KEY, type Theme } from "@/ui/theme"
import { ThemeToggle } from "./theme-toggle"

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange)
  return () => window.removeEventListener(THEME_EVENT, onChange)
}

function chosenTheme(): Theme {
  const theme = document.documentElement.dataset.theme
  return theme === "light" || theme === "dark" ? theme : "system"
}

function themeOnTheServer(): Theme {
  return "system"
}

function choose(theme: Theme) {
  const root = document.documentElement
  try {
    if (theme === "system") {
      delete root.dataset.theme
      localStorage.removeItem(THEME_STORAGE_KEY)
    } else {
      root.dataset.theme = theme
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    }
  } catch {}
  window.dispatchEvent(new Event(THEME_EVENT))
}

export function StatefulThemeToggle(
  props: Omit<ComponentProps<typeof ThemeToggle>, "theme" | "onChoose">
) {
  return (
    <ThemeToggle
      {...props}
      theme={useSyncExternalStore(subscribe, chosenTheme, themeOnTheServer)}
      onChoose={choose}
    />
  )
}
