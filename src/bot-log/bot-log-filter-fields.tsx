import {
  FilterFields,
  PERIOD_FIELDS,
  searchTextField,
  type FilterFieldSpec,
} from "@/ui/filter-fields"
import type { BotLogFilters } from "./bot-log-filters"

export type BotLogFieldName = Exclude<keyof BotLogFilters, "family">

export const BOT_LOG_FILTER_FIELDS: readonly FilterFieldSpec<BotLogFieldName>[] =
  [
    {
      name: "action",
      label: "Action",
      type: "text",
      placeholder: "Ex. : Ticket fermé",
    },
    {
      name: "account",
      label: "Compte",
      type: "text",
      placeholder: "Nom, ID ou mention",
    },
    {
      name: "channel",
      label: "Salon",
      type: "text",
      placeholder: "Nom, ID ou mention",
    },
    searchTextField("Mots à chercher"),
    ...PERIOD_FIELDS,
  ]

export function BotLogFilterFields({
  filters,
  idPrefix,
  className,
}: {
  filters: BotLogFilters
  idPrefix: string
  className: string
}) {
  return (
    <FilterFields
      fields={BOT_LOG_FILTER_FIELDS}
      values={filters}
      idPrefix={idPrefix}
      className={className}
    />
  )
}
