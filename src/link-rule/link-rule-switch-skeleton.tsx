import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"
import { CARD_CLASSES, CONTROL_CLASSES } from "./link-rule-layout"

const PULSE_CLASSES = "motion-reduce:animate-none"

export function LinkRuleSwitchSkeleton() {
  return (
    <div role="status" className={cn(CARD_CLASSES, "gap-2")}>
      <span className="sr-only">Chargement de la règle des liens…</span>
      <Skeleton className={cn("h-3.5 w-24", PULSE_CLASSES)} />
      <Skeleton className={cn("h-6.5 w-36", PULSE_CLASSES)} />
      <Skeleton className={cn("h-10 w-full", PULSE_CLASSES)} />
      <Skeleton
        className={cn("mt-1.5 w-full sm:w-24", CONTROL_CLASSES, PULSE_CLASSES)}
      />
    </div>
  )
}
