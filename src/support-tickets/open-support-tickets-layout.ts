import { cn } from "cn"

export const OPEN_SUPPORT_TICKETS_CLASSES = cn("flex flex-col gap-2.5")

export const OPEN_SUPPORT_TICKET_LIST_CLASSES = cn("grid gap-3 lg:grid-cols-2")

export const OPEN_SUPPORT_TICKET_CLASSES = cn(
  "@container flex min-w-0 flex-col gap-3.5 rounded-xl border bg-card px-5 py-4"
)

export const OPEN_SUPPORT_TICKET_HEADER_CLASSES = cn(
  "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
)

export const OPEN_SUPPORT_TICKET_FACTS_CLASSES = cn(
  "grid gap-3 @min-[28rem]:grid-cols-2"
)

export const OPEN_SUPPORT_TICKET_FACT_CLASSES = cn("flex min-w-0 flex-col")

export const OPEN_SUPPORT_TICKET_NAMES_CLASSES = cn(
  "flex flex-wrap gap-x-3.5 gap-y-0"
)

export const OPEN_SUPPORT_TICKET_NAME_CLASSES = cn(
  "w-fit max-w-full text-sm font-medium wrap-anywhere touch:min-w-11"
)
