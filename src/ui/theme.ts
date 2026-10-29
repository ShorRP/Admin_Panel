export type Theme = "system" | "light" | "dark"

export const THEME_STORAGE_KEY = "shor-panel-theme"

export const THEME_EVENT = "shor-panel-theme-change"

export const APPLY_STORED_THEME = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`
