import { cn } from "cn"

export const FILTERS_CLASSES = cn("flex flex-col gap-4")

export const FILTER_PILLS_CLASSES = cn(
  "flex flex-wrap items-center justify-between gap-x-4 gap-y-3"
)

export const FILTER_PILL_LIST_CLASSES = cn("flex flex-wrap gap-1.5")

export const FILTER_PILL_SIZE_CLASSES = cn("h-7.5 rounded-full touch:h-11")

export const FILTER_CONTROL_HEIGHT_CLASSES = cn("h-8 touch:h-11")

export const FILTER_FORM_CLASSES = cn(
  "hidden flex-wrap items-end gap-x-3 gap-y-3.5 md:flex"
)

export const FILTER_FOLD_CLASSES = cn("flex flex-col gap-3 md:hidden")

export const SHEET_FIELD_CLASSES = cn("flex min-w-0 flex-col gap-2")
