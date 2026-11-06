import { FilterForm } from "@/ui/filter-form"
import { FILTER_FIELD_CLASSES } from "@/ui/filter-layout"
import { BotLogFilterFields } from "./bot-log-filter-fields"
import type { BotLogFilters } from "./bot-log-filters"
import { hiddenFieldsOf } from "./bot-log-href"

export function BotLogFilterForm({ filters }: { filters: BotLogFilters }) {
  return (
    <FilterForm
      action="/bot-log"
      hiddenFields={hiddenFieldsOf(filters)}
      submitLabel="Filtrer"
    >
      <BotLogFilterFields
        filters={filters}
        idPrefix="bot-log"
        className={FILTER_FIELD_CLASSES}
      />
    </FilterForm>
  )
}
