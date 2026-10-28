import { formatParisTime } from "@/ui/paris-time"

export function timeoutDirectMessage(end: Date, reason: string) {
  return [
    `Tu as reçu une exclusion temporaire du serveur Discord de Shor, jusqu’au ${formatParisTime(end)} (heure de Paris).`,
    `Motif : ${reason}`,
    "Pour la contester, ouvre un ticket de support « ❓ Autre demande » sur le serveur Discord une fois ton exclusion temporaire terminée : d’ici là, tu ne peux plus y écrire.",
    "Ne réponds pas à ce message : personne ne le lit.",
    "Le staff de Shor",
  ].join("\n\n")
}
