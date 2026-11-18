import type { ReactNode } from "react"

import { Overline } from "@/ui/overline"
import { SECTION_CLASSES, SECTION_SENTENCE_CLASSES } from "./link-rule-layout"
import type { ExemptChannel } from "./read-link-rule"

const LABEL_ID = "exempt-channels"

export function ExemptChannelsSection({
  channels,
  form,
  list,
}: {
  channels: ExemptChannel[]
  form: ReactNode
  list: ReactNode
}) {
  return (
    <section aria-labelledby={LABEL_ID} className={SECTION_CLASSES}>
      <Overline id={LABEL_ID}>Salons exemptés</Overline>
      {form}
      <p className={SECTION_SENTENCE_CLASSES}>
        {channels.length === 0
          ? "Aucun salon exempté : un lien est bloqué dans tous les salons."
          : "Un lien est permis dans ces salons."}
      </p>
      {list}
    </section>
  )
}
