import type { ReactNode } from "react"

import {
  LOG_DAY_CLASSES,
  LOG_DAY_HEADER_CLASSES,
  LOG_DAY_LINES_CLASSES,
} from "@/ui/log-layout"
import { ParisDay } from "@/ui/paris-day"

export function LogDay({
  date,
  children,
}: {
  date: Date
  children: ReactNode
}) {
  return (
    <section className={LOG_DAY_CLASSES}>
      <div className={LOG_DAY_HEADER_CLASSES}>
        <h2 className="font-heading text-lg leading-[1.2] font-medium">
          <ParisDay date={date} dateStyle="full" />
        </h2>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
      <ol className={LOG_DAY_LINES_CLASSES}>{children}</ol>
    </section>
  )
}
