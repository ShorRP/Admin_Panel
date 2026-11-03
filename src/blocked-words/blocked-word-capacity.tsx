import { frenchNumber } from "@/ui/french-number"
import { Overline } from "@/ui/overline"
import { BLOCKED_WORD_ACTIONS } from "./blocked-word-action"
import { MAX_WORDS_PER_RULE } from "./limits"

const LABEL_ID = "blocked-word-capacity"

const CAPACITY = MAX_WORDS_PER_RULE * BLOCKED_WORD_ACTIONS.length

export function BlockedWordCapacity({ count }: { count: number }) {
  return (
    <div
      role="group"
      aria-labelledby={LABEL_ID}
      className="flex w-full min-w-52.5 flex-col gap-2 sm:w-auto"
    >
      <Overline id={LABEL_ID}>Capacité</Overline>
      <p className="flex items-baseline gap-1.5">
        <span className="font-heading text-[1.875rem] leading-none font-medium">
          {frenchNumber(count)}
        </span>
        <span className="text-[0.8125rem] text-muted-foreground">
          {`/ ${frenchNumber(CAPACITY)} mots`}
        </span>
      </p>
      <div aria-hidden className="h-0.75 overflow-hidden rounded-xs bg-muted">
        <div
          className="h-full bg-primary"
          style={{ width: `${(count * 100) / CAPACITY}%` }}
        />
      </div>
    </div>
  )
}
