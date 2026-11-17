import { cn } from "cn"
import { X } from "lucide-react"

import { quoted } from "@/blocked-words/french-text"
import { Button } from "@/ui/button"
import { WriteFailureMessage } from "@/ui/write-failure-message"
import { CHIP_CLASSES, CHIPS_CLASSES } from "./link-rule-layout"
import type { DomainFields, WriteResult } from "./write-result"

export function AllowedDomainList({
  domains,
  state,
  pending,
  action,
}: {
  domains: string[]
  state: WriteResult<DomainFields> | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  return (
    <>
      <ul className={cn("mt-3.5 empty:hidden", CHIPS_CLASSES)}>
        {domains.map((domain) => (
          <li
            key={domain}
            className={cn(
              CHIP_CLASSES,
              "flex items-center gap-0.5 py-0 pr-0.5"
            )}
          >
            <span className="min-w-0 py-1 font-mono">{domain}</span>
            <form action={action} className="flex shrink-0">
              <input type="hidden" name="domain" value={domain} />
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                className="text-muted-foreground"
              >
                <X aria-hidden className="size-3.75" />
                <span className="sr-only">{`Retirer ${quoted(domain)}`}</span>
              </Button>
            </form>
          </li>
        ))}
      </ul>
      <p role="status" className="text-sm not-empty:mt-3.5">
        {pending && "Envoi en cours…"}
      </p>
      <p role="alert" className="text-sm not-empty:mt-3.5">
        {state?.ok === false && <WriteFailureMessage message={state.message} />}
      </p>
    </>
  )
}
