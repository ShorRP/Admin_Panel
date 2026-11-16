import { Overline } from "@/ui/overline"
import { linkRuleActionLabel, type LinkRuleActionId } from "./link-rule-action"
import { SECTION_CLASSES, SECTION_SENTENCE_CLASSES } from "./link-rule-layout"

const LABEL_ID = "link-rule-action"

export function LinkRuleActionSection({
  action,
}: {
  action: LinkRuleActionId | null
}) {
  return (
    <section aria-labelledby={LABEL_ID} className={SECTION_CLASSES}>
      <Overline id={LABEL_ID}>Action</Overline>
      <p className="text-[0.9375rem] font-medium">
        {action === null ? "Réglée dans Discord" : linkRuleActionLabel(action)}
      </p>
      <p className={SECTION_SENTENCE_CLASSES}>
        {action === null
          ? "Cette action n’est pas l’une de celles du panel : elle se change dans Discord."
          : "Ce qui arrive à un message qui contient un lien bloqué."}
      </p>
    </section>
  )
}
