import { cn } from "cn"

export const SANCTION_ALERT_ID = "sanction-error"

export const CHOICE_CLASS = cn(
  "flex items-center gap-2.5 text-[0.84375rem] touch:min-h-11"
)

export const CHOICE_GROUP_CLASS = cn(
  "flex flex-wrap gap-x-4 gap-y-2 touch:grid touch:grid-cols-2 touch:gap-x-2 touch:gap-y-0 sm:touch:grid-cols-[repeat(auto-fill,minmax(10.625rem,1fr))]"
)

export const NATIVE_CONTROL_CLASS = cn("size-4 shrink-0 accent-primary")

export const LEGEND_CLASS = cn("mb-2.5 text-[0.8125rem] font-medium")

export const SENTENCE_CLASS = cn("text-[0.8125rem] text-muted-foreground")

export const CARD_BUTTON_CLASS = cn("h-9.5 w-full")

export const RED_BUTTON_CLASS = cn(
  "bg-destructive text-destructive-foreground hover:bg-destructive/90"
)
