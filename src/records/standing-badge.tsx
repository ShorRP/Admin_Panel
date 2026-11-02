import type { ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { ParisTime } from "@/ui/paris-time"
import type { AccountStanding } from "./account-standing"
import { BADGE_CLASSES } from "./badge-classes"

const standingDot = cva("size-1.5 shrink-0 rounded-full", {
  variants: {
    tone: {
      member: "bg-success",
      timedOut: "bg-warning",
      banned: "bg-destructive",
      absent: "bg-muted-foreground",
    },
  },
})

type Tone = NonNullable<VariantProps<typeof standingDot>["tone"]>

export function StandingBadge({
  standing,
  className,
}: {
  standing: AccountStanding
  className?: string
}) {
  const { tone, label } = lookOf(standing)
  return (
    <span className={cn(BADGE_CLASSES, className)}>
      <span aria-hidden className={standingDot({ tone })} />
      <span>{label}</span>
    </span>
  )
}

function lookOf(standing: AccountStanding): { tone: Tone; label: ReactNode } {
  if (standing.kind === "banned") {
    return { tone: "banned", label: "Compte banni" }
  }
  if (standing.kind === "absent") {
    return { tone: "absent", label: "Absent du serveur" }
  }
  if (standing.timedOutUntil === null) {
    return { tone: "member", label: "Membre du serveur" }
  }
  return {
    tone: "timedOut",
    label: (
      <>
        Exclu jusqu’au <ParisTime date={standing.timedOutUntil} />
      </>
    ),
  }
}
