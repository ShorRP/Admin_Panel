import { cn } from "cn"

import { Overline } from "@/ui/overline"
import {
  CHIP_CLASSES,
  CHIPS_CLASSES,
  SECTION_CLASSES,
  SECTION_SENTENCE_CLASSES,
} from "./link-rule-layout"
import type { NamedItem } from "./read-link-rule"

const LABEL_ID = "exempt-roles"

export function ExemptRolesSection({ roles }: { roles: NamedItem[] }) {
  return (
    <section aria-labelledby={LABEL_ID} className={SECTION_CLASSES}>
      <Overline id={LABEL_ID}>Rôles exemptés</Overline>
      {roles.length === 0 ? (
        <p className={SECTION_SENTENCE_CLASSES}>Aucun rôle exempté.</p>
      ) : (
        <p className={SECTION_SENTENCE_CLASSES}>
          Les membres de ces rôles postent n’importe quel lien.
        </p>
      )}
      <ul className={cn("empty:hidden", CHIPS_CLASSES)}>
        {roles.map(({ id, name }) => (
          <li key={id} className={CHIP_CLASSES}>
            {name ?? "Rôle supprimé"}
          </li>
        ))}
      </ul>
      <p className={SECTION_SENTENCE_CLASSES}>
        AutoMod laisse aussi passer le propriétaire du serveur Discord et les
        membres qui ont la permission « Administrateur » ou « Gérer le
        serveur ».
      </p>
    </section>
  )
}
