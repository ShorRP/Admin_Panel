import { FilterPills } from "@/ui/filter-pills"
import {
  GAME_LOG_CATEGORIES,
  GAME_LOG_CATEGORY_KEYS,
} from "./game-log-categories"
import { hasFilter, NO_FILTERS, type GameLogFilters } from "./game-log-filters"
import { gameLogHref } from "./game-log-href"

const CATEGORY_LINKS = [
  { category: null, label: "Tout" },
  ...GAME_LOG_CATEGORY_KEYS.map((category) => ({
    category,
    label: GAME_LOG_CATEGORIES[category].label,
  })),
]

export function GameLogCategoryFilter({
  filters,
}: {
  filters: GameLogFilters
}) {
  return (
    <FilterPills
      label="Filtrer par catégorie"
      pills={CATEGORY_LINKS.map(({ category, label }) => ({
        label,
        href: gameLogHref({ ...filters, category }),
        current: category === filters.category,
      }))}
      resetHref={hasFilter(filters) ? gameLogHref(NO_FILTERS) : null}
    />
  )
}
