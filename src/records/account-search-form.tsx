import Form from "next/form"
import { Search } from "lucide-react"

import { Button } from "@/ui/button"
import { FilterChips } from "@/ui/filter-chips"
import { FilterSheetContent, FilterSheetTrigger } from "@/ui/filter-sheet"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { Sheet } from "@/ui/sheet"
import { AccountChoiceFields } from "./account-choice-fields"
import { choiceChipsOf } from "./account-choices"
import { AccountFilterSheetForm } from "./account-filter-sheet-form"
import type { AccountListFilters, RoleOption } from "./account-list-filters"
import { accountListHref } from "./account-list-href"
import {
  CHIPS_CLASSES,
  CHOICE_FIELD_CLASSES,
  CHOICES_CLASSES,
  FILTERS_BUTTON_CLASSES,
  SEARCH_FIELD_CLASSES,
  SEARCH_FORM_CLASSES,
  SUBMIT_CLASSES,
} from "./account-search-form-layout"

const FIELD_ID = "account-search"

const FILTERS_LABEL = "Filtres"

export function AccountSearchForm({
  filters,
  roles,
}: {
  filters: AccountListFilters
  roles: readonly RoleOption[]
}) {
  const chips = choiceChipsOf(filters, roles)
  return (
    <Sheet key={accountListHref(filters, 1)}>
      <Form action="/records" prefetch={false} className={SEARCH_FORM_CLASSES}>
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
          <FilterSheetTrigger
            label={FILTERS_LABEL}
            activeCount={chips.length}
            className={FILTERS_BUTTON_CLASSES}
          />
          <AccountChoiceFields
            filters={filters}
            roles={roles}
            idPrefix="account"
            fieldClassName={CHOICE_FIELD_CLASSES}
          />
          <Button type="submit" className={SUBMIT_CLASSES}>
            <Search aria-hidden data-icon="inline-start" />
            Chercher
          </Button>
        </div>
        <FilterChips chips={chips} className={CHIPS_CLASSES} />
      </Form>
      <FilterSheetContent label={FILTERS_LABEL} rightFromSm>
        <AccountFilterSheetForm filters={filters} roles={roles} />
      </FilterSheetContent>
    </Sheet>
  )
}
