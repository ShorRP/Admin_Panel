import { NativeSelectOption } from "@/ui/native-select"
import { ExemptChoiceForm } from "./exempt-choice-form"
import type { RoleChoice } from "./read-link-rule"
import type { RoleFields, WriteResult } from "./write-result"

export function AddExemptRoleForm({
  roles,
  state,
  pending,
  action,
}: {
  roles: RoleChoice[]
  state: WriteResult<RoleFields> | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  return (
    <ExemptChoiceForm
      label="Ajouter un rôle"
      fieldId="exempt-role"
      name="role"
      prompt="Choisir un rôle"
      nothingLeft="Aucun autre rôle"
      chosen={state?.ok === false ? state.role : ""}
      empty={roles.length === 0}
      message={state?.ok === false ? state.message : null}
      pending={pending}
      action={action}
    >
      {roles.map(({ id, name }) => (
        <NativeSelectOption key={id} value={id}>
          {name}
        </NativeSelectOption>
      ))}
    </ExemptChoiceForm>
  )
}
