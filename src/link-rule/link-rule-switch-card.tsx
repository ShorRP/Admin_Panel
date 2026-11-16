import type { ReactNode } from "react"
import { cn } from "cn"

import { Overline } from "@/ui/overline"
import { CARD_CLASSES, SECTION_SENTENCE_CLASSES } from "./link-rule-layout"
import type { LinkRuleStatus } from "./read-link-rule"

const LABEL_ID = "link-rule-switch"

const STATUSES: Record<
  LinkRuleStatus,
  { name: string; description: string; dot: string }
> = {
  absent: {
    name: "Pas encore créée",
    description:
      "La règle des liens n’existe pas encore : aucun lien n’est bloqué. « Activer » la crée avec les réglages ci-dessous.",
    dot: "bg-muted-foreground",
  },
  enabled: {
    name: "Active",
    description:
      "Discord bloque les liens, sauf ceux des domaines permis, des membres exemptés et des salons exemptés.",
    dot: "bg-primary",
  },
  disabled: {
    name: "Coupée",
    description:
      "Tous les liens passent. Les domaines, les rôles et les salons de la règle sont gardés.",
    dot: "bg-muted-foreground",
  },
}

export function LinkRuleSwitchCard({
  status,
  form,
}: {
  status: LinkRuleStatus
  form: ReactNode
}) {
  const { name, description, dot } = STATUSES[status]
  return (
    <section aria-labelledby={LABEL_ID} className={cn(CARD_CLASSES, "gap-2")}>
      <Overline id={LABEL_ID}>Règle des liens</Overline>
      <p className="flex items-center gap-2.5 font-heading text-[1.375rem] leading-[1.2] font-medium">
        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dot)} />
        {name}
      </p>
      <p className={SECTION_SENTENCE_CLASSES}>{description}</p>
      <div className="mt-1.5">{form}</div>
    </section>
  )
}
