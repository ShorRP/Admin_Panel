import { cn } from "cn"

export const TYPE_FILTER_CLASSES = cn(
  "flex flex-wrap items-center justify-between gap-x-4 gap-y-3"
)

export const TYPE_LINKS_CLASSES = cn("flex flex-wrap gap-1.5")

export const RESET_LINK_CLASSES = cn(
  "text-[0.8125rem] underline decoration-input underline-offset-3 hover:decoration-primary"
)

export const NO_CHANGE_CLASSES = cn(
  "rounded-xl border border-dashed border-input px-5 py-7 text-center text-muted-foreground"
)

export const DAY_HEADER_CLASSES = cn("flex items-center gap-3")

export const DAY_CHANGES_CLASSES = cn("divide-y rounded-xl border bg-card")

export const CHANGE_ROW_CLASSES = cn(
  "grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3.5 gap-y-1 px-4 py-3.5 text-sm sm:grid-cols-[3rem_2rem_minmax(0,1fr)_minmax(0,9.375rem)] sm:px-4.5"
)

export const CHANGE_TIME_CLASSES = cn(
  "max-sm:col-start-2 max-sm:row-start-1 sm:pt-1.5"
)

export const CHANGE_ICON_TILE_CLASSES = cn(
  "flex size-8 items-center justify-center rounded-lg bg-muted max-sm:col-start-1 max-sm:row-span-3 max-sm:row-start-1"
)

export const CHANGE_BODY_CLASSES = cn(
  "flex min-w-0 flex-col gap-0.75 max-sm:col-start-2 max-sm:row-start-2 sm:pt-px"
)

export const CHANGE_STAFF_MEMBER_CLASSES = cn(
  "flex min-w-0 items-center gap-2 max-sm:col-start-2 max-sm:row-start-3 max-sm:mt-1 sm:flex-row-reverse sm:pt-1"
)
