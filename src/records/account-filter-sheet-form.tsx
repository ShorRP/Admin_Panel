import { FilterSheetForm } from "@/ui/filter-sheet"
import { AccountChoiceFields } from "./account-choice-fields"
import { withoutChoices } from "./account-choices"
import type { AccountListFilters, RoleOption } from "./account-list-filters"
import { accountListHref } from "./account-list-href"
import { SHEET_CHOICE_FIELD_CLASSES } from "./account-search-form-layout"

export function AccountFilterSheetForm({
  filters,
  roles,
}: {
  filters: AccountListFilters
  roles: readonly RoleOption[]
}) {
  return (
    <FilterSheetForm
      action="/records"
      hiddenFields={[{ name: "query", value: filters.query ?? "" }]}
      resetHref={accountListHref(withoutChoices(filters), 1)}
      submitLabel="Appliquer"
    >
      <AccountChoiceFields
        filters={filters}
        roles={roles}
        idPrefix="account-sheet"
        fieldClassName={SHEET_CHOICE_FIELD_CLASSES}
      />
    </FilterSheetForm>
  )
}
