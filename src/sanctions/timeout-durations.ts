const ONE_HOUR = { seconds: "3600", label: "1 heure" } as const

export const TIMEOUT_DURATIONS = [
  { seconds: "60", label: "60 secondes" },
  { seconds: "300", label: "5 minutes" },
  { seconds: "600", label: "10 minutes" },
  ONE_HOUR,
  { seconds: "86400", label: "1 jour" },
  { seconds: "604800", label: "1 semaine" },
  { seconds: "2419200", label: "28 jours" },
] as const

export const DEFAULT_TIMEOUT_DURATION = ONE_HOUR.seconds
