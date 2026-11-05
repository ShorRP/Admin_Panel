import type { FilterChip } from "@/ui/filter-chips"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import type { GameLogFilters } from "./game-log-filters"
import { gameLogHref } from "./game-log-href"

export function GameLogFilterFields({
  filters,
  idPrefix,
  className,
}: {
  filters: GameLogFilters
  idPrefix: string
  className: string
}) {
  return (
    <div className={className}>
      <Label htmlFor={`${idPrefix}-text`}>Texte</Label>
      <Input
        id={`${idPrefix}-text`}
        name="text"
        defaultValue={filters.text ?? ""}
        placeholder="Mots à chercher"
        autoComplete="off"
      />
    </div>
  )
}

export function gameLogChipsOf(filters: GameLogFilters): FilterChip[] {
  return filters.text === null
    ? []
    : [
        {
          name: "Texte",
          value: filters.text,
          href: gameLogHref({ ...filters, text: null }),
        },
      ]
}
