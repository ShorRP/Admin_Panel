import { cn } from "cn"

import { ParisTime } from "@/ui/paris-time"
import type { FoundAccount } from "./search-accounts"

export function StandingBadge({
  standing,
  className,
}: {
  standing: FoundAccount["standing"]
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.75 rounded-full border px-2.5 py-0.5 text-xs text-foreground",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          standing.kind === "banned"
            ? "bg-destructive"
            : standing.timedOutUntil === null
              ? "bg-success"
              : "bg-warning"
        )}
      />
      <StandingText standing={standing} />
    </span>
  )
}

function StandingText({ standing }: { standing: FoundAccount["standing"] }) {
  if (standing.kind === "banned") {
    return <span>Compte banni</span>
  }
  if (standing.timedOutUntil === null) {
    return <span>Membre du serveur</span>
  }
  return (
    <span>
      Exclu jusqu’au <ParisTime date={standing.timedOutUntil} />
    </span>
  )
}
