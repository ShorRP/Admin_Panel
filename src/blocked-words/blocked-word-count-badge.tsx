import { cn } from "cn"

import { frenchNumber } from "@/ui/french-number"
import { counted } from "./french-text"

export function BlockedWordCountBadge({ count }: { count: number | null }) {
  if (count === null) {
    return null
  }
  return (
    <span
      className={cn(
        "ml-auto font-mono text-[0.6875rem] font-normal text-muted-foreground",
        "in-data-[slot=sidebar]:max-lg:absolute in-data-[slot=sidebar]:max-lg:top-0.75 in-data-[slot=sidebar]:max-lg:right-0.25 in-data-[slot=sidebar]:max-lg:min-w-4 in-data-[slot=sidebar]:max-lg:rounded-full in-data-[slot=sidebar]:max-lg:bg-sidebar in-data-[slot=sidebar]:max-lg:px-1 in-data-[slot=sidebar]:max-lg:text-center in-data-[slot=sidebar]:max-lg:leading-4 in-data-[slot=sidebar]:max-lg:ring-1 in-data-[slot=sidebar]:max-lg:ring-border"
      )}
    >
      <span aria-hidden>{frenchNumber(count)}</span>
      <span className="sr-only">{counted(count, "mot", "mots")}</span>
    </span>
  )
}
