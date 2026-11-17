import { cn } from "cn"
import { LoaderCircle, Plus } from "lucide-react"

import { quoted } from "@/blocked-words/french-text"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { WriteFailureMessage } from "@/ui/write-failure-message"
import {
  CARD_CLASSES,
  CONTROL_CLASSES,
  DOMAIN_FIELD_ROW_CLASSES,
  SECTION_SENTENCE_CLASSES,
} from "./link-rule-layout"
import type { DomainFields, WriteResult } from "./write-result"

const FIELD_ID = "allowed-domain"

const HINT_ID = "allowed-domain-hint"

const ALERT_ID = "allowed-domain-error"

export function AddAllowedDomainForm({
  state,
  pending,
  action,
}: {
  state: WriteResult<DomainFields> | null
  pending: boolean
  action: (formData: FormData) => void
}) {
  return (
    <form action={action} className={CARD_CLASSES}>
      <Label htmlFor={FIELD_ID} className="text-[0.8125rem] leading-4.5">
        Ajouter un domaine
      </Label>
      <div className={DOMAIN_FIELD_ROW_CLASSES}>
        <Input
          id={FIELD_ID}
          name="domain"
          defaultValue={state?.ok === false ? state.domain : ""}
          aria-describedby={`${HINT_ID} ${ALERT_ID}`}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Ex. : twitch.tv"
          className={cn("px-3", CONTROL_CLASSES)}
        />
        <Button
          type="submit"
          disabled={pending}
          className={cn(
            "w-full px-3.5 has-data-[icon=inline-start]:pl-3 sm:w-auto",
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
      <p id={HINT_ID} className={cn("mt-2.5", SECTION_SENTENCE_CLASSES)}>
        {`Saisis le domaine seul, comme ${quoted("twitch.tv")}. La règle bloque quand même, pour un domaine permis : un lien en ${quoted("http://")}, un sous-domaine autre que ${quoted("www.")} (ajoute-le à part, comme ${quoted("m.youtube.com")}) et un lien collé à une ponctuation.`}
      </p>
      <p role="alert" id={ALERT_ID} className="text-sm not-empty:mt-2.5">
        {state?.ok === false && <WriteFailureMessage message={state.message} />}
      </p>
    </form>
  )
}
