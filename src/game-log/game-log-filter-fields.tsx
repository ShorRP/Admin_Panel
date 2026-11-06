import {
  FilterFields,
  PERIOD_FIELDS,
  searchTextField,
  type FilterFieldSpec,
} from "@/ui/filter-fields"
import type { GameLogFilters } from "./game-log-filters"

export const GAME_LOG_FILTER_FIELDS: readonly FilterFieldSpec<
  keyof GameLogFilters
>[] = [searchTextField("Mots à chercher"), ...PERIOD_FIELDS]

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
    <FilterFields
      fields={GAME_LOG_FILTER_FIELDS}
      values={filters}
      idPrefix={idPrefix}
      className={className}
    />
  )
}
