import { quoted } from "@/blocked-words/french-text"
import { frenchNumber } from "@/ui/french-number"
import { MAX_EXEMPT_CHANNELS } from "./limits"

export const NO_CHANNEL_CHOSEN_REFUSAL = "Choisis le salon à exempter."

export const NO_CHANNEL_TO_REMOVE_REFUSAL = "Choisis le salon à retirer."

export const GONE_CHANNEL_REFUSAL =
  "Le panel ne trouve plus ce salon sur le serveur Discord : recharge la page, puis choisis-en un autre."

export const UNEXEMPTABLE_CHANNEL_REFUSAL =
  "Ce salon ne peut pas être exempté : le panel exempte un salon textuel, un salon d’annonces ou une catégorie."

export function alreadyExemptChannelRefusal(channel: string) {
  return `${quoted(channel)} est déjà un salon exempté.`
}

export const FULL_CHANNELS_REFUSAL = `La règle des liens exempte déjà ${frenchNumber(MAX_EXEMPT_CHANNELS)} salons sur ${frenchNumber(MAX_EXEMPT_CHANNELS)}. Retire un salon exempté, puis réessaie.`
