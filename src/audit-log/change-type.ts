export const CHANGE_TYPES = [
  "blocked-words",
  "timeouts",
  "kicks",
  "bans",
] as const

export type ChangeType = (typeof CHANGE_TYPES)[number]
