import type { ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { ParisTime } from "@/ui/paris-time"
import type { AccountStanding } from "./account-standing"

const standingDot = cva("size-1.5 shrink-0 rounded-full", {
  variants: {
    tone: {
      member: "bg-success",
      timedOut: "bg-warning",
      banned: "bg-destructive",
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
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.75 rounded-full border px-2.5 py-0.5 text-xs text-foreground",
        className
      )}
    >
      <span aria-hidden className={standingDot({ tone })} />
      <span>{label}</span>
    </span>
  )
}

function lookOf(standing: AccountStanding): { tone: Tone; label: ReactNode } {
  if (standing.kind === "banned") {
    return { tone: "banned", label: "Compte banni" }
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
