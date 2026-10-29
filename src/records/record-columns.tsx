import type { ReactNode } from "react"
import { cn } from "cn"

export function RecordColumns({
  details,
  sanctions,
  sanctionsShown,
  history,
}: {
  details: ReactNode
  sanctions: ReactNode
  sanctionsShown: boolean
  history: ReactNode
}) {
  return (
    <div className="@container">
      <div
        className={cn(
          "grid gap-x-8 gap-y-9",
          sanctionsShown &&
            "@min-[50.75rem]:grid-cols-[minmax(27.5rem,1fr)_minmax(21.25rem,27.5rem)] @min-[50.75rem]:grid-rows-[auto_1fr]"
        )}
      >
        <div className="min-w-0 @min-[50.75rem]:col-start-1">{details}</div>
        <div
          hidden={!sanctionsShown}
          className="min-w-0 @min-[50.75rem]:sticky @min-[50.75rem]:top-6 @min-[50.75rem]:col-start-2 @min-[50.75rem]:row-span-2 @min-[50.75rem]:row-start-1 @min-[50.75rem]:self-start"
        >
          {sanctions}
        </div>
        <div className="min-w-0 self-start @min-[50.75rem]:col-start-1">
          {history}
        </div>
      </div>
    </div>
  )
}
