import { Overline } from "@/ui/overline"
import { frenchNumber } from "./french-text"
import { MAX_BLOCKED_WORDS } from "./limits"

const LABEL_ID = "blocked-word-capacity"

export function BlockedWordCapacity({ count }: { count: number }) {
  return (
    <div
      role="group"
      aria-labelledby={LABEL_ID}
      className="flex min-w-52.5 flex-col gap-2"
    >
      <Overline id={LABEL_ID}>Capacité</Overline>
      <p className="flex items-baseline gap-1.5">
        <span className="font-heading text-[1.875rem] leading-none font-medium">
          {frenchNumber(count)}
        </span>
        <span className="text-[0.8125rem] text-muted-foreground">
          {`/ ${frenchNumber(MAX_BLOCKED_WORDS)} mots`}
        </span>
      </p>
      <div aria-hidden className="h-0.75 overflow-hidden rounded-xs bg-muted">
        <div
          className="h-full bg-primary"
          style={{ width: `${(count * 100) / MAX_BLOCKED_WORDS}%` }}
        />
      </div>
    </div>
  )
}
