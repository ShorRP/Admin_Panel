import { cn } from "cn"

export const LOG_FRAME_CLASSES = cn("flex flex-col gap-7")

export const LOG_DAY_CLASSES = cn("flex flex-col gap-2.5")

export const LOG_DAY_HEADER_CLASSES = cn("flex items-center gap-3")

export const LOG_DAY_LINES_CLASSES = cn("divide-y rounded-xl border bg-card")

export const LOG_ROW_CLASSES = cn(
  "grid grid-cols-[2rem_auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2.5 px-4 py-3.5 text-sm sm:grid-cols-[3rem_2rem_minmax(0,1fr)_minmax(0,9.375rem)] sm:px-4.5"
)

export const LOG_ROW_TIME_CLASSES = cn("max-sm:col-start-2 max-sm:row-start-1")

export const LOG_ROW_ICON_TILE_CLASSES = cn(
  "flex size-8 items-center justify-center rounded-lg bg-muted max-sm:col-start-1 max-sm:row-start-1"
)

export const LOG_ROW_BODY_CLASSES = cn(
  "flex min-w-0 flex-col gap-0.75 max-sm:col-span-full max-sm:row-start-2"
)

export const LOG_ROW_TRAILING_CLASSES = cn(
  "min-w-0 max-sm:col-start-3 max-sm:row-start-1"
)

export const LOG_PAGINATION_CLASSES = cn(
  "flex w-full gap-2 sm:ms-auto sm:w-auto sm:flex-wrap"
)

export const LOG_PAGINATION_LINK_CLASSES = cn(
  "max-sm:min-w-0 max-sm:flex-1 max-sm:text-center max-sm:whitespace-normal"
)
