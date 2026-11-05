export const REQUEST_KIND_KEYS = [
  "technical-issue",
  "player-report",
  "rp-request",
  "other-request",
] as const

export type RequestKindKey = (typeof REQUEST_KIND_KEYS)[number]

export const REQUEST_KINDS: Record<
  RequestKindKey,
  { emoji: string; label: string }
> = {
  "technical-issue": { emoji: "🔧", label: "Problème technique" },
  "player-report": { emoji: "🚨", label: "Signaler un joueur" },
  "rp-request": { emoji: "🎭", label: "Demande RP" },
  "other-request": { emoji: "❓", label: "Autre demande" },
}

export function requestKindKeyOf(requestKind: string | null) {
  if (requestKind === null) {
    return null
  }
  return (
    REQUEST_KIND_KEYS.find((key) =>
      requestKind.startsWith(REQUEST_KINDS[key].emoji)
    ) ?? null
  )
}
