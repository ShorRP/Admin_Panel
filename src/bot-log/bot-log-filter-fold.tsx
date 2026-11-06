import { filterChipsOf } from "@/ui/filter-fields"
import { FilterFold } from "@/ui/filter-fold"
import { SHEET_FIELD_CLASSES } from "@/ui/filter-layout"
import {
  BOT_LOG_FILTER_FIELDS,
  BotLogFilterFields,
} from "./bot-log-filter-fields"
import { NO_FILTERS, type BotLogFilters } from "./bot-log-filters"
import { botLogHref, hiddenFieldsOf } from "./bot-log-href"

export function BotLogFilterFold({ filters }: { filters: BotLogFilters }) {
  return (
    <FilterFold
      label="Filtres"
      chips={filterChipsOf(BOT_LOG_FILTER_FIELDS, filters, (name) =>
        botLogHref({ ...filters, [name]: null })
      )}
      action="/bot-log"
      hiddenFields={hiddenFieldsOf(filters)}
      resetHref={botLogHref(NO_FILTERS)}
      submitLabel="Filtrer"
    >
      <BotLogFilterFields
        filters={filters}
        idPrefix="bot-log-sheet"
        className={SHEET_FIELD_CLASSES}
      />
    </FilterFold>
  )
}
