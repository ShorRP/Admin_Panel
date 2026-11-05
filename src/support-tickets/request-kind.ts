const NAME_SEPARATOR = "・"

const REQUEST_KINDS = [
  { emoji: "🔧", label: "Problème technique" },
  { emoji: "🚨", label: "Signaler un joueur" },
  { emoji: "🎭", label: "Demande RP" },
  { emoji: "❓", label: "Autre demande" },
] as const

export function requestKindOf(channelName: string): string | null {
  const kind = REQUEST_KINDS.find(({ emoji }) =>
    channelName.startsWith(`${emoji}${NAME_SEPARATOR}`)
  )
  return kind === undefined ? null : `${kind.emoji} ${kind.label}`
}
