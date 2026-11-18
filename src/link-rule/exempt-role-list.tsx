import { quoted } from "@/blocked-words/french-text"
import { ExemptChipList } from "./exempt-chip-list"
import type { NamedItem } from "./read-link-rule"
import type { RoleFields, WriteResult } from "./write-result"

export function ExemptRoleList({
  roles,
  staffRoleId,
  state,
  pending,
  action,
}: {
  roles: NamedItem[]
  staffRoleId: string
  state: WriteResult<RoleFields> | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  return (
    <ExemptChipList
      chips={roles.map(({ id, name }) => {
        const label = name ?? "Rôle supprimé"
        return {
          id,
          label,
          crossName:
            name === null
              ? `Retirer ${quoted(label)} (${id})`
              : `Retirer ${quoted(label)}`,
          removable: id !== staffRoleId,
        }
      })}
      field="role"
      message={state?.ok === false ? state.message : null}
      pending={pending}
      action={action}
    />
  )
}
