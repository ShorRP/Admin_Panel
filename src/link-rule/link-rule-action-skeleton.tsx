import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"
import {
  CHOICE_FIELD_ROW_CLASSES,
  CONTROL_CLASSES,
  SECTION_CLASSES,
} from "./link-rule-layout"

const PULSE_CLASSES = "motion-reduce:animate-none"

export function LinkRuleActionSkeleton() {
  return (
    <div role="status" className={SECTION_CLASSES}>
      <span className="sr-only">Chargement de l’action…</span>
      <Skeleton className={cn("h-3.5 w-24", PULSE_CLASSES)} />
      <div className="@container flex flex-col">
        <Skeleton className={cn("h-4.5 w-28", PULSE_CLASSES)} />
        <div className={CHOICE_FIELD_ROW_CLASSES}>
          <Skeleton
            className={cn("w-full @md:flex-1", CONTROL_CLASSES, PULSE_CLASSES)}
          />
          <Skeleton
            className={cn("w-full @md:w-24", CONTROL_CLASSES, PULSE_CLASSES)}
          />
        </div>
      </div>
      <Skeleton className={cn("h-10 w-full", PULSE_CLASSES)} />
    </div>
  )
}
