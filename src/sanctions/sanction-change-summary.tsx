import { ParisTime } from "@/ui/paris-time"
import type { SanctionChange } from "./sanction-events"

export function SanctionChangeSummary({ change }: { change: SanctionChange }) {
  switch (change.kind) {
    case "timeout":
      return change.end === null ? (
        "Exclusion temporaire"
      ) : (
        <>
          Exclusion temporaire jusqu’au <ParisTime date={change.end} />
        </>
      )
    case "timeout-lift":
      return "Levée de l’exclusion temporaire"
    case "kick":
      return "Expulsion"
    case "ban":
      return "Bannissement"
    case "ban-lift":
      return "Levée du bannissement"
  }
}
