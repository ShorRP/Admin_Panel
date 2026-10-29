import { counted, frenchNumber } from "./french-text"

export function BlockedWordCountBadge({ count }: { count: number | null }) {
  if (count === null) {
    return null
  }
  return (
    <span className="ml-auto font-mono text-[0.6875rem] font-normal text-muted-foreground">
      <span aria-hidden>{frenchNumber(count)}</span>
      <span className="sr-only">{counted(count, "mot", "mots")}</span>
    </span>
  )
}
