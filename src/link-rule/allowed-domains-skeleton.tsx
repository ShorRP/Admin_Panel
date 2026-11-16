import { cn } from "cn"

import { Skeleton } from "@/ui/skeleton"
import { CHIPS_CLASSES } from "./link-rule-layout"

const PULSE_CLASSES = "motion-reduce:animate-none"

const DOMAIN_WIDTHS = ["w-28", "w-20", "w-24", "w-32", "w-22"]

export function AllowedDomainsSkeleton() {
  return (
    <div role="status" className="flex flex-col">
      <span className="sr-only">Chargement des domaines permis…</span>
      <Skeleton className={cn("h-6.5 w-44", PULSE_CLASSES)} />
      <Skeleton className={cn("mt-1.5 h-5 w-full", PULSE_CLASSES)} />
      <div className={cn("mt-3.5", CHIPS_CLASSES)}>
        {DOMAIN_WIDTHS.map((width) => (
          <Skeleton
            key={width}
            className={cn("h-7 rounded-sm", width, PULSE_CLASSES)}
          />
        ))}
      </div>
    </div>
  )
}
