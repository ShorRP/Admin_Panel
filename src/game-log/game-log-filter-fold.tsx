import { filterChipsOf } from "@/ui/filter-fields"
import { FilterFold } from "@/ui/filter-fold"
import { SHEET_FIELD_CLASSES } from "@/ui/filter-layout"
import {
  GAME_LOG_FILTER_FIELDS,
  GameLogFilterFields,
} from "./game-log-filter-fields"
import { NO_FILTERS, type GameLogFilters } from "./game-log-filters"
import { gameLogHref, hiddenFieldsOf } from "./game-log-href"

export function GameLogFilterFold({ filters }: { filters: GameLogFilters }) {
  return (
    <FilterFold
      label="Filtres"
      chips={filterChipsOf(GAME_LOG_FILTER_FIELDS, filters, (name) =>
        gameLogHref({ ...filters, [name]: null })
      )}
      action="/game-log"
      hiddenFields={hiddenFieldsOf(filters)}
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
