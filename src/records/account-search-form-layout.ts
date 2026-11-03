import { cn } from "cn"

export const SEARCH_FORM_CLASSES = cn("flex flex-col gap-4")

export const SEARCH_FIELD_CLASSES = cn("flex flex-col gap-2")

export const CHOICES_CLASSES = cn(
  "grid grid-cols-2 items-end gap-3 md:flex md:flex-wrap md:gap-x-3 md:gap-y-3.5"
)

export const CHOICE_FIELD_CLASSES = cn(
  "hidden min-w-0 flex-1 basis-44 flex-col gap-2 md:flex"
)

export const SHEET_CHOICE_FIELD_CLASSES = cn("flex min-w-0 flex-col gap-2")

export const SELECT_CLASSES = cn(
  "w-full [&>select]:h-9.5 [&>select]:touch:h-11"
)

export const SUBMIT_CLASSES = cn(
  "h-9.5 w-full px-4.5 has-data-[icon=inline-start]:pl-4 md:w-auto"
)

export const FILTERS_BUTTON_CLASSES = cn("md:hidden")

export const CHIPS_CLASSES = cn("md:hidden")
