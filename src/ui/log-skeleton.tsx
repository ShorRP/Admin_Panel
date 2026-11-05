import type { ReactNode } from "react"
import { cn } from "cn"

import {
  FILTER_PILL_LIST_CLASSES,
  FILTER_PILL_SIZE_CLASSES,
  FILTER_PILLS_CLASSES,
  FILTERS_CLASSES,
} from "@/ui/filter-layout"
import {
  LOG_DAY_CLASSES,
  LOG_DAY_HEADER_CLASSES,
  LOG_DAY_LINES_CLASSES,
  LOG_FRAME_CLASSES,
  LOG_ROW_AUTHOR_CLASSES,
  LOG_ROW_BODY_CLASSES,
  LOG_ROW_CLASSES,
  LOG_ROW_ICON_TILE_CLASSES,
  LOG_ROW_TIME_CLASSES,
  LOG_ROW_TRAILING_CLASSES,
} from "@/ui/log-layout"
import { Skeleton } from "@/ui/skeleton"

const DAYS = [
  {
    headingWidth: "w-44",
    lines: [
      { titleWidth: "w-44", detail: false },
      { titleWidth: "w-64", detail: true },
    ],
  },
  {
    headingWidth: "w-40",
    lines: [
      { titleWidth: "w-36", detail: true },
      { titleWidth: "w-52", detail: false },
      { titleWidth: "w-40", detail: false },
    ],
  },
] as const

export function LogSkeleton({
  loading,
  pillWidths,
  form,
}: {
  loading: string
  pillWidths: readonly string[]
  form: ReactNode
}) {
  return (
    <div role="status" className={LOG_FRAME_CLASSES}>
      <span className="sr-only">{loading}</span>
      <div className={FILTERS_CLASSES}>
        <div className={FILTER_PILLS_CLASSES}>
          <div className={FILTER_PILL_LIST_CLASSES}>
            {pillWidths.map((width) => (
              <Skeleton
                key={width}
                className={cn(
                  FILTER_PILL_SIZE_CLASSES,
                  "motion-reduce:animate-none",
                  width
                )}
              />
            ))}
          </div>
        </div>
        {form}
      </div>
      {DAYS.map(({ headingWidth, lines }) => (
        <div key={headingWidth} className={LOG_DAY_CLASSES}>
          <div className={LOG_DAY_HEADER_CLASSES}>
            <Skeleton
              className={cn("h-5.5 motion-reduce:animate-none", headingWidth)}
            />
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className={LOG_DAY_LINES_CLASSES}>
            {lines.map(({ titleWidth, detail }) => (
              <div key={titleWidth} className={LOG_ROW_CLASSES}>
                <div className={LOG_ROW_TIME_CLASSES}>
                  <Skeleton className="h-3.5 w-10 motion-reduce:animate-none" />
                </div>
                <Skeleton
                  className={cn(
                    LOG_ROW_ICON_TILE_CLASSES,
                    "motion-reduce:animate-none"
                  )}
                />
                <div className={LOG_ROW_BODY_CLASSES}>
                  <Skeleton
                    className={cn(
                      "h-4 max-w-full motion-reduce:animate-none",
                      titleWidth
                    )}
                  />
                  {detail && (
                    <Skeleton className="mt-1 h-3.5 w-full max-w-80 motion-reduce:animate-none" />
                  )}
                </div>
                <div className={LOG_ROW_TRAILING_CLASSES}>
                  <div className={LOG_ROW_AUTHOR_CLASSES}>
                    <Skeleton className="size-6 shrink-0 rounded-full motion-reduce:animate-none" />
                    <Skeleton className="h-3.5 w-16 motion-reduce:animate-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
