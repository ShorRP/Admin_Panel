import type { ReactNode } from "react"

import { Overline } from "@/ui/overline"
import {
  ACTION_SET_IN_DISCORD,
  linkRuleActionLabel,
  type LinkRuleActionId,
} from "./link-rule-action"
import { SECTION_CLASSES, SECTION_SENTENCE_CLASSES } from "./link-rule-layout"

const LABEL_ID = "link-rule-action"

const WHAT_HAPPENS = "Ce qui arrive à un message qui contient un lien bloqué."

export function LinkRuleActionSection({
  action,
  form,
}: {
  action: LinkRuleActionId | null
  form: ReactNode
}) {
  if (action === null) {
    return (
      <section aria-labelledby={LABEL_ID} className={SECTION_CLASSES}>
        <Overline id={LABEL_ID}>Action</Overline>
        <p className="text-[0.9375rem] font-medium">Réglée dans Discord</p>
        <p className={SECTION_SENTENCE_CLASSES}>{ACTION_SET_IN_DISCORD}</p>
      </section>
    )
  }
  return (
    <section aria-labelledby={LABEL_ID} className={SECTION_CLASSES}>
      <Overline id={LABEL_ID}>Action</Overline>
      {form === null ? (
        <>
          <p className="text-[0.9375rem] font-medium">
            {linkRuleActionLabel(action)}
          </p>
          <p className={SECTION_SENTENCE_CLASSES}>
            {WHAT_HAPPENS} Choisir ou quitter une exclusion demande un rôle de
            modération.
          </p>
        </>
      ) : (
        <>
          {form}
          <p className={SECTION_SENTENCE_CLASSES}>{WHAT_HAPPENS}</p>
        </>
      )}
    </section>
  )
}
