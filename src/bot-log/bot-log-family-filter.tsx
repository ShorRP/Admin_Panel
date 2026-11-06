import { FilterPills } from "@/ui/filter-pills"
import { BOT_LOG_FAMILIES, BOT_LOG_FAMILY_KEYS } from "./bot-log-families"
import { hasFilter, NO_FILTERS, type BotLogFilters } from "./bot-log-filters"
import { botLogHref } from "./bot-log-href"

const FAMILY_LINKS = [
  { family: null, label: "Tout" },
  ...BOT_LOG_FAMILY_KEYS.map((family) => ({
    family,
    label: BOT_LOG_FAMILIES[family].label,
  })),
]

export function BotLogFamilyFilter({ filters }: { filters: BotLogFilters }) {
  return (
    <FilterPills
      label="Filtrer par famille"
      pills={FAMILY_LINKS.map(({ family, label }) => ({
        label,
        href: botLogHref({ ...filters, family }),
        current: family === filters.family,
      }))}
      resetHref={hasFilter(filters) ? botLogHref(NO_FILTERS) : null}
    />
  )
}
