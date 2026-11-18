import { cn } from "cn"

export const CARD_CLASSES = cn(
  "flex flex-col rounded-xl border bg-card px-5 py-4.5"
)

export const CONTROL_CLASSES = cn("h-9.5 touch:h-11")

export const DOMAIN_FIELD_ROW_CLASSES = cn(
  "mt-2.5 flex flex-col gap-3 sm:flex-row"
)

export const CHOICE_FIELD_ROW_CLASSES = cn(
  "mt-2 flex flex-col gap-3 @md:flex-row"
)

export const SECTION_CLASSES = cn("flex flex-col gap-2")

export const SECTION_SENTENCE_CLASSES = cn(
  "text-[0.84375rem] leading-5 text-pretty text-muted-foreground"
)

export const CHIPS_CLASSES = cn("flex flex-wrap gap-1.5")

export const CHIP_CLASSES = cn(
  "min-w-0 rounded-sm border px-2 py-0.75 text-[0.8125rem] wrap-anywhere"
)
