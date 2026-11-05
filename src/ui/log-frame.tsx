import type { ReactNode } from "react"

import { FILTERS_CLASSES } from "@/ui/filter-layout"
import { LOG_FRAME_CLASSES } from "@/ui/log-layout"

export function LogFrame({
  filters,
  children,
}: {
  filters: ReactNode
  children: ReactNode
}) {
  return (
    <div className={LOG_FRAME_CLASSES}>
      <div className={FILTERS_CLASSES}>{filters}</div>
      {children}
    </div>
  )
}
