import type { ReactNode } from "react"
import { cn } from "cn"

import { quoted } from "@/blocked-words/french-text"
import { Overline } from "@/ui/overline"
import { ALERT_SET_IN_DISCORD } from "./alert-channel-refusals"
import { channelLabel } from "./exemptable-channel"
import { SECTION_CLASSES, SECTION_SENTENCE_CLASSES } from "./link-rule-layout"
import type { LinkRuleAlert } from "./read-link-rule"

const LABEL_ID = "link-rule-alert"

const NO_ALERT =
  "Aucun salon d’alerte : les liens bloqués ne laissent pas de trace."

function sentenceOf(alert: Exclude<LinkRuleAlert, { kind: "set-in-discord" }>) {
  if (alert.kind === "none") {
    return NO_ALERT
  }
  const where =
    alert.name === null
      ? "un salon que le panel ne trouve plus"
      : quoted(channelLabel({ name: alert.name, category: false }))
  return `AutoMod recopie chaque message bloqué dans ${where}.`
}

export function LinkRuleAlertSection({
  alert,
  form,
}: {
  alert: LinkRuleAlert
  form: ReactNode
}) {
  if (alert.kind === "set-in-discord") {
    return (
      <section aria-labelledby={LABEL_ID} className={SECTION_CLASSES}>
        <Overline id={LABEL_ID}>Salon d’alerte</Overline>
        <p className="text-[0.9375rem] font-medium">Réglé dans Discord</p>
        <p className={SECTION_SENTENCE_CLASSES}>{ALERT_SET_IN_DISCORD}</p>
      </section>
    )
  }
  return (
    <section aria-labelledby={LABEL_ID} className={SECTION_CLASSES}>
      <Overline id={LABEL_ID}>Salon d’alerte</Overline>
      <p className={cn(SECTION_SENTENCE_CLASSES, "wrap-anywhere")}>
        {sentenceOf(alert)}
      </p>
      {form}
    </section>
  )
}
