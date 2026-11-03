import type { FilterChip } from "@/ui/filter-chips"
import {
  NO_ROLE,
  type AccountListFilters,
  type RoleOption,
} from "./account-list-filters"
import { accountListHref } from "./account-list-href"

export type Choice = { value: string; label: string }

export type ChoiceName =
  "role" | "standing" | "joined" | "created" | "bots" | "sort"

export type ChoiceField = {
  name: ChoiceName
  label: string
  choices: Choice[]
}

const STANDING_CHOICES: Choice[] = [
  { value: "", label: "Tous les comptes" },
  { value: "members", label: "Membres" },
  { value: "timed-out", label: "Exclus en ce moment" },
  { value: "banned", label: "Bannis" },
]

const JOINED_CHOICES: Choice[] = [
  { value: "", label: "Toutes les dates" },
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "6m", label: "6 derniers mois" },
  { value: "over-1y", label: "Plus d’un an" },
]

const CREATED_CHOICES: Choice[] = [
  { value: "", label: "Tous les âges" },
  { value: "7d", label: "Moins de 7 jours" },
  { value: "30d", label: "Moins de 30 jours" },
]

const BOTS_CHOICES: Choice[] = [
  { value: "", label: "Masqués" },
  { value: "shown", label: "Affichés" },
]

const SORT_CHOICES: Choice[] = [
  { value: "", label: "Nom" },
  { value: "joined-recent", label: "Arrivée récente" },
  { value: "joined-old", label: "Arrivée ancienne" },
  { value: "role", label: "Rôle le plus haut" },
]

export function choiceFieldsOf(roles: readonly RoleOption[]): ChoiceField[] {
  return [
    {
      name: "role",
      label: "Rôle",
      choices: [
        { value: "", label: "Tous les rôles" },
        { value: NO_ROLE, label: "Aucun rôle" },
        ...roles.map(({ id, name }) => ({ value: id, label: name })),
      ],
    },
    { name: "standing", label: "État", choices: STANDING_CHOICES },
    {
      name: "joined",
      label: "Arrivée sur le serveur",
      choices: JOINED_CHOICES,
    },
    {
      name: "created",
      label: "Âge du compte Discord",
      choices: CREATED_CHOICES,
    },
    { name: "bots", label: "Comptes de bot", choices: BOTS_CHOICES },
    { name: "sort", label: "Trier par", choices: SORT_CHOICES },
  ]
}

export function choiceChipsOf(
  filters: AccountListFilters,
  roles: readonly RoleOption[]
): FilterChip[] {
  return choiceFieldsOf(roles).flatMap(({ name, label, choices }) => {
    const value = filters[name]
    const choice = choices.find((candidate) => candidate.value === value)
    return value === null || choice === undefined
      ? []
      : [
          {
            name: label,
            value: choice.label,
            href: accountListHref({ ...filters, [name]: null }, 1),
          },
        ]
  })
}

export function withoutChoices({
  query,
}: AccountListFilters): AccountListFilters {
  return {
    query,
    role: null,
    standing: null,
    joined: null,
    created: null,
    bots: null,
    sort: null,
  }
}
