import { EmptyListFrame } from "@/ui/empty-list-frame"

export function BotLogNotConfigured() {
  return (
    <EmptyListFrame>
      <p>Le Journal du Bot n’est pas configuré pour ce serveur Discord.</p>
    </EmptyListFrame>
  )
}
