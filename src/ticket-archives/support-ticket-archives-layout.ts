import { cn } from "cn"

import { TICKET_ARCHIVE_ENTRY_CLASSES } from "./ticket-archive-layout"

export const SUPPORT_TICKET_ARCHIVES_LAYOUT_CLASSES = cn("flex flex-col gap-7")

export const SUPPORT_TICKET_ARCHIVES_CLASSES = cn("flex flex-col gap-2.5")

export const SUPPORT_TICKET_ENTRY_CLASSES = cn(
  TICKET_ARCHIVE_ENTRY_CLASSES,
  "gap-3"
)

export const SUPPORT_TICKET_EVENTS_CLASSES = cn("grid gap-3 sm:grid-cols-2")

export const SUPPORT_TICKET_NAME_CLASSES = cn(
  "w-fit max-w-full text-sm font-medium wrap-anywhere touch:w-full"
)
