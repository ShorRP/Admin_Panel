import { EmptyListFrame } from "@/ui/empty-list-frame"

export function GameLogNotConfigured() {
  return (
    <EmptyListFrame>
      <p>Le journal du jeu n’est pas configuré pour ce serveur Discord.</p>
    </EmptyListFrame>
  )
}
