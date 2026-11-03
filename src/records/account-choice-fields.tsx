import { Label } from "@/ui/label"
import { NativeSelect, NativeSelectOption } from "@/ui/native-select"
import { choiceFieldsOf } from "./account-choices"
import type { AccountListFilters, RoleOption } from "./account-list-filters"
import { SELECT_CLASSES } from "./account-search-form-layout"

export function AccountChoiceFields({
  filters,
  roles,
  idPrefix,
  fieldClassName,
}: {
  filters: AccountListFilters
  roles: readonly RoleOption[]
  idPrefix: string
  fieldClassName: string
}) {
  return choiceFieldsOf(roles).map(({ name, label, choices }) => {
    const id = `${idPrefix}-${name}`
    return (
      <div key={name} className={fieldClassName}>
        <Label htmlFor={id}>{label}</Label>
        <NativeSelect
          id={id}
          name={name}
          defaultValue={filters[name] ?? ""}
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
  })
}
