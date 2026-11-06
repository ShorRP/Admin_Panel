import {
  FilterFields,
  PERIOD_FIELDS,
  searchTextField,
  type FilterFieldSpec,
} from "@/ui/filter-fields"
import type { GameLogFilters } from "./game-log-filters"

export type GameLogFieldName = Exclude<keyof GameLogFilters, "category">

export const GAME_LOG_FILTER_FIELDS: readonly FilterFieldSpec<GameLogFieldName>[] =
  [
    {
      name: "action",
      label: "Action",
      type: "text",
      placeholder: "Ex. : heal",
    },
    {
      name: "character",
      label: "Personnage",
      type: "text",
      placeholder: "Nom du personnage",
    },
    {
      name: "account",
      label: "Compte de jeu",
      type: "text",
      placeholder: "Numéro du compte",
    },
    {
      name: "target",
      label: "Cible",
      type: "text",
      placeholder: "Ex. : 4278190080",
    },
    {
      name: "cell",
      label: "Cellule",
      type: "text",
      placeholder: "Ex. : 3c",
    },
    {
      name: "plugin",
      label: "Plugin",
      type: "text",
      placeholder: "Ex. : Skyrim.esm",
    },
    {
      name: "reason",
      label: "Motif",
      type: "text",
      placeholder: "Mots du motif",
    },
    searchTextField("Mots à chercher"),
    ...PERIOD_FIELDS,
  ]

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
