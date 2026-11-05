import type { ReactNode } from "react"
import { cn } from "cn"
import type { LucideIcon } from "lucide-react"

import {
  LOG_ROW_BODY_CLASSES,
  LOG_ROW_CLASSES,
  LOG_ROW_ICON_TILE_CLASSES,
  LOG_ROW_TIME_CLASSES,
  LOG_ROW_TRAILING_CLASSES,
} from "@/ui/log-layout"
import { ParisTime } from "@/ui/paris-time"

export function LogRow({
  date,
  Icon,
  iconClassName,
  trailing,
  children,
}: {
  date: Date
  Icon: LucideIcon
  iconClassName: string
  trailing: ReactNode
  children: ReactNode
}) {
  return (
    <li className={LOG_ROW_CLASSES}>
      <span
        className={cn(
          LOG_ROW_TIME_CLASSES,
          "font-mono text-xs text-muted-foreground"
        )}
      >
        <ParisTime date={date} timeOnly />
      </span>
      <span
        aria-hidden
        className={cn(LOG_ROW_ICON_TILE_CLASSES, iconClassName)}
      >
        <Icon className="size-3.75" />
      </span>
      <div className={LOG_ROW_BODY_CLASSES}>{children}</div>
      <div className={LOG_ROW_TRAILING_CLASSES}>{trailing}</div>
    </li>
  )
}
