import { cn } from "cn"

export const SEARCH_FORM_CLASSES = cn("flex flex-col gap-4")

export const SEARCH_FIELD_CLASSES = cn("flex flex-col gap-2")

export const CHOICES_CLASSES = cn("flex flex-wrap items-end gap-x-3 gap-y-3.5")

export const CHOICE_FIELD_CLASSES = cn(
  "flex min-w-0 flex-1 basis-full flex-col gap-2 sm:basis-44"
)

export const SELECT_CLASSES = cn("w-full [&>select]:h-9.5")

export const SUBMIT_CLASSES = cn(
  "h-9.5 px-4.5 has-data-[icon=inline-start]:pl-4"
)
