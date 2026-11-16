import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"
import { SECTION_CLASSES } from "./link-rule-layout"

const PULSE_CLASSES = "motion-reduce:animate-none"

export function LinkRuleSideSectionSkeleton({ loading }: { loading: string }) {
  return (
    <div role="status" className={SECTION_CLASSES}>
      <span className="sr-only">{loading}</span>
      <Skeleton className={cn("h-3.5 w-24", PULSE_CLASSES)} />
      <Skeleton className={cn("h-10 w-full", PULSE_CLASSES)} />
      <Skeleton className={cn("h-7 w-28 rounded-sm", PULSE_CLASSES)} />
    </div>
  )
}
