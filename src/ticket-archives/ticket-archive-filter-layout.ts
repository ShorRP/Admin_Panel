import { cn } from "cn"

export const FILTERS_CLASSES = cn("flex flex-col gap-4")

export const KIND_FILTER_CLASSES = cn(
  "flex flex-wrap items-center justify-between gap-x-4 gap-y-3"
)

export const KIND_LINKS_CLASSES = cn("flex flex-wrap gap-1.5")

export const FILTER_FORM_CLASSES = cn(
  "hidden flex-wrap items-end gap-x-3 gap-y-3.5 md:flex"
)

export const FILTER_FIELD_CLASSES = cn(
  "flex min-w-0 flex-1 basis-44 flex-col gap-2 md:max-w-60"
)

export const FILTER_FOLD_CLASSES = cn("flex flex-col gap-3 md:hidden")

export const SHEET_FIELD_CLASSES = cn("flex min-w-0 flex-col gap-2")
