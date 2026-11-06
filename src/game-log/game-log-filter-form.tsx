import { FilterForm } from "@/ui/filter-form"
import { FILTER_FIELD_CLASSES } from "@/ui/filter-layout"
import { GameLogFilterFields } from "./game-log-filter-fields"
import type { GameLogFilters } from "./game-log-filters"

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
