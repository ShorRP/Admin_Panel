import { cn } from "cn"
import { X } from "lucide-react"

import { quoted } from "@/blocked-words/french-text"
import { Button } from "@/ui/button"
import { WriteFailureMessage } from "@/ui/write-failure-message"
import { CHIP_CLASSES, CHIPS_CLASSES } from "./link-rule-layout"
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
    <div className="flex flex-col">
      {roles.length > 0 && (
        <ul className={CHIPS_CLASSES}>
          {roles.map(({ id, name }) => {
            const label = name ?? "Rôle supprimé"
            const removable = id !== staffRoleId
            return (
              <li
                key={id}
                className={cn(
                  CHIP_CLASSES,
                  removable && "flex items-center gap-0.5 py-0 pr-0.5"
                )}
              >
                <span className="min-w-0 py-1">{label}</span>
                {removable && (
                  <form action={action} className="flex shrink-0">
                    <input type="hidden" name="role" value={id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      className="text-muted-foreground"
                    >
                      <X aria-hidden className="size-3.75" />
                      <span className="sr-only">{`Retirer ${quoted(label)}`}</span>
                    </Button>
                  </form>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <p role="status" className="text-sm not-empty:mt-2">
        {pending && "Envoi en cours…"}
      </p>
      <p role="alert" className="text-sm not-empty:mt-2">
        {state?.ok === false && <WriteFailureMessage message={state.message} />}
      </p>
    </div>
  )
}
