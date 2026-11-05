import { FilterForm } from "@/ui/filter-form"
import { GameLogFilterFields } from "./game-log-filter-fields"
import type { GameLogFilters } from "./game-log-filters"
import { FILTER_FIELD_CLASSES } from "./game-log-layout"

export function GameLogFilterForm({ filters }: { filters: GameLogFilters }) {
  return (
    <FilterForm action="/game-log" hiddenFields={[]} submitLabel="Filtrer">
      <GameLogFilterFields
        filters={filters}
        idPrefix="game-log"
        className={FILTER_FIELD_CLASSES}
      />
    </FilterForm>
  )
}
