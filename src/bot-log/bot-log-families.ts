export const BOT_LOG_FAMILY_KEYS = [
  "rules",
  "voice-channels",
  "tickets",
  "game-servers",
  "automatic-sanctions",
] as const

export type BotLogFamilyKey = (typeof BOT_LOG_FAMILY_KEYS)[number]

export const BOT_LOG_FAMILIES: Record<
  BotLogFamilyKey,
  { label: string; actions: readonly string[] }
> = {
  rules: { label: "Règlement", actions: ["Rôle Membre donné"] },
  "voice-channels": {
    label: "Vocaux",
    actions: [
      "Vocal créé",
      "Vocal supprimé",
      "Focus Mode activé",
      "Focus Mode désactivé",
      "Membre expulsé",
    ],
  },
  tickets: { label: "Tickets", actions: ["Ticket ouvert", "Ticket fermé"] },
  "game-servers": { label: "Serveurs de jeu", actions: [] },
  "automatic-sanctions": {
    label: "Sanctions automatiques",
    actions: ["Membre expulsé", "Compte banni"],
  },
}

export function familyKeyOfLabel(label: string): BotLogFamilyKey | null {
  return (
    BOT_LOG_FAMILY_KEYS.find((key) => BOT_LOG_FAMILIES[key].label === label) ??
    null
  )
}
