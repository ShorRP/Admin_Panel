import { FilterFold } from "@/ui/filter-fold"
import { SHEET_FIELD_CLASSES } from "@/ui/filter-layout"
import { gameLogChipsOf, GameLogFilterFields } from "./game-log-filter-fields"
import { NO_FILTERS, type GameLogFilters } from "./game-log-filters"
import { gameLogHref } from "./game-log-href"

export function GameLogFilterFold({ filters }: { filters: GameLogFilters }) {
  return (
    <FilterFold
      label="Filtres"
      chips={gameLogChipsOf(filters)}
      action="/game-log"
      hiddenFields={[]}
      resetHref={gameLogHref(NO_FILTERS)}
      submitLabel="Filtrer"
    >
      <GameLogFilterFields
        filters={filters}
        idPrefix="game-log-sheet"
        className={SHEET_FIELD_CLASSES}
      />
    </FilterFold>
  )
}
