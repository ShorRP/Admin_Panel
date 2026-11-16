import { cn } from "cn"

import { Overline } from "@/ui/overline"
import {
  CHIP_CLASSES,
  CHIPS_CLASSES,
  SECTION_CLASSES,
  SECTION_SENTENCE_CLASSES,
} from "./link-rule-layout"
import type { NamedItem } from "./read-link-rule"

const LABEL_ID = "exempt-channels"

export function ExemptChannels({ channels }: { channels: NamedItem[] }) {
  return (
    <section aria-labelledby={LABEL_ID} className={SECTION_CLASSES}>
      <Overline id={LABEL_ID}>Salons exemptés</Overline>
      <p className={SECTION_SENTENCE_CLASSES}>
        {channels.length === 0
          ? "Aucun salon exempté : un lien est bloqué dans tous les salons."
          : "Un lien est permis dans ces salons."}
      </p>
      <ul className={cn("empty:hidden", CHIPS_CLASSES)}>
        {channels.map(({ id, name }) => (
          <li key={id} className={CHIP_CLASSES}>
            {name === null ? "Salon introuvable" : `#${name}`}
          </li>
        ))}
      </ul>
    </section>
  )
}
