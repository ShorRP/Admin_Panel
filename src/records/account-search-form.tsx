import Form from "next/form"
import { Search } from "lucide-react"

import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { NativeSelect, NativeSelectOption } from "@/ui/native-select"
import {
  NO_ROLE,
  type AccountListFilters,
  type RoleOption,
} from "./account-list-filters"
import { accountListHref } from "./account-list-href"
import {
  CHOICE_FIELD_CLASSES,
  CHOICES_CLASSES,
  SEARCH_FIELD_CLASSES,
  SEARCH_FORM_CLASSES,
  SELECT_CLASSES,
  SUBMIT_CLASSES,
} from "./account-search-form-layout"

const FIELD_ID = "account-search"

type Choice = { value: string; label: string }

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

export function AccountSearchForm({
  filters,
  roles,
}: {
  filters: AccountListFilters
  roles: readonly RoleOption[]
}) {
  return (
    <Form
      key={accountListHref(filters, 1)}
      action="/records"
      prefetch={false}
      className={SEARCH_FORM_CLASSES}
    >
      <div className={SEARCH_FIELD_CLASSES}>
        <Label htmlFor={FIELD_ID}>Compte</Label>
        <div className="relative min-w-0">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={FIELD_ID}
            name="query"
            defaultValue={filters.query ?? ""}
            placeholder="Nom, pseudo, ID ou mention"
            autoComplete="off"
            className="h-11 pl-10.5"
          />
        </div>
      </div>
      <div className={CHOICES_CLASSES}>
        <ChoiceField
          name="role"
          label="Rôle"
          selected={filters.role}
          choices={[
            { value: "", label: "Tous les rôles" },
            { value: NO_ROLE, label: "Aucun rôle" },
            ...roles.map(({ id, name }) => ({ value: id, label: name })),
          ]}
        />
        <ChoiceField
          name="standing"
          label="État"
          selected={filters.standing}
          choices={STANDING_CHOICES}
        />
        <ChoiceField
          name="joined"
          label="Arrivée sur le serveur"
          selected={filters.joined}
          choices={JOINED_CHOICES}
        />
        <ChoiceField
          name="created"
          label="Âge du compte Discord"
          selected={filters.created}
          choices={CREATED_CHOICES}
        />
        <ChoiceField
          name="bots"
          label="Comptes de bot"
          selected={filters.bots}
          choices={BOTS_CHOICES}
        />
        <ChoiceField
          name="sort"
          label="Trier par"
          selected={filters.sort}
          choices={SORT_CHOICES}
        />
        <Button type="submit" className={SUBMIT_CLASSES}>
          <Search aria-hidden data-icon="inline-start" />
          Chercher
        </Button>
      </div>
    </Form>
  )
}

function ChoiceField({
  name,
  label,
  selected,
  choices,
}: {
  name: string
  label: string
  selected: string | null
  choices: readonly Choice[]
}) {
  const id = `account-${name}`
  return (
    <div className={CHOICE_FIELD_CLASSES}>
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        name={name}
        defaultValue={selected ?? ""}
        className={SELECT_CLASSES}
      >
        {choices.map(({ value, label: text }) => (
          <NativeSelectOption key={value} value={value}>
            {text}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
