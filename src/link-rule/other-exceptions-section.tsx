import { cn } from "cn"

import { Overline } from "@/ui/overline"
import {
  CHIP_CLASSES,
  CHIPS_CLASSES,
  SECTION_CLASSES,
  SECTION_SENTENCE_CLASSES,
} from "./link-rule-layout"

const LABEL_ID = "other-exceptions"

export function OtherExceptions({ entries }: { entries: string[] }) {
  if (entries.length === 0) {
    return null
  }
  return (
    <section aria-labelledby={LABEL_ID} className={SECTION_CLASSES}>
      <Overline id={LABEL_ID}>Autres exceptions</Overline>
      <p className={SECTION_SENTENCE_CLASSES}>
        Ces entrées de la liste permise ne suivent pas le modèle du panel :
        elles se modifient dans Discord, et le panel les garde.
      </p>
      <ul className={CHIPS_CLASSES}>
        {entries.map((entry) => (
          <li key={entry} className={cn(CHIP_CLASSES, "font-mono")}>
            {entry}
          </li>
        ))}
      </ul>
    </section>
  )
}
