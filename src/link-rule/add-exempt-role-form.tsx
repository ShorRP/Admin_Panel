import { cn } from "cn"
import { LoaderCircle, Plus } from "lucide-react"

import { Button } from "@/ui/button"
import { Label } from "@/ui/label"
import { NativeSelect, NativeSelectOption } from "@/ui/native-select"
import { WriteFailureMessage } from "@/ui/write-failure-message"
import { CONTROL_CLASSES, ROLE_FIELD_ROW_CLASSES } from "./link-rule-layout"
import type { RoleChoice } from "./read-link-rule"
import type { RoleFields, WriteResult } from "./write-result"

const FIELD_ID = "exempt-role"

const ALERT_ID = "exempt-role-error"

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
  const chosen = state?.ok === false ? state.role : ""
  const none = roles.length === 0
  return (
    <form action={action} className="@container flex flex-col">
      <Label htmlFor={FIELD_ID} className="text-[0.8125rem] leading-4.5">
        Ajouter un rôle
      </Label>
      <div className={ROLE_FIELD_ROW_CLASSES}>
        <NativeSelect
          key={chosen}
          id={FIELD_ID}
          name="role"
          defaultValue={chosen}
          disabled={none}
          aria-describedby={ALERT_ID}
          className="w-full @md:min-w-0 @md:flex-1 [&>select]:h-9.5 [&>select]:touch:h-11"
        >
          <NativeSelectOption value="">
            {none ? "Aucun autre rôle" : "Choisir un rôle"}
          </NativeSelectOption>
          {roles.map(({ id, name }) => (
            <NativeSelectOption key={id} value={id}>
              {name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          type="submit"
          disabled={pending || none}
          className={cn(
            "w-full px-3.5 has-data-[icon=inline-start]:pl-3 @md:w-auto",
            CONTROL_CLASSES
          )}
        >
          {pending ? (
            <>
              <LoaderCircle
                aria-hidden
                data-icon="inline-start"
                className="motion-safe:animate-spin"
              />
              Ajout…
            </>
          ) : (
            <>
              <Plus aria-hidden data-icon="inline-start" />
              Ajouter
            </>
          )}
        </Button>
      </div>
      <p role="alert" id={ALERT_ID} className="text-sm not-empty:mt-2.5">
        {state?.ok === false && <WriteFailureMessage message={state.message} />}
      </p>
    </form>
  )
}
