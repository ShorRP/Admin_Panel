import type { ReactNode } from "react"

import { Overline } from "@/ui/overline"
import { SECTION_CLASSES, SECTION_SENTENCE_CLASSES } from "./link-rule-layout"
import type { NamedItem } from "./read-link-rule"

const LABEL_ID = "exempt-roles"

export function ExemptRolesSection({
  roles,
  staffRoleId,
  form,
  list,
}: {
  roles: NamedItem[]
  staffRoleId: string
  form: ReactNode
  list: ReactNode
}) {
  const holdsStaffRole = roles.some(({ id }) => id === staffRoleId)
  return (
    <section aria-labelledby={LABEL_ID} className={SECTION_CLASSES}>
      <Overline id={LABEL_ID}>Rôles exemptés</Overline>
      {form}
      <p className={SECTION_SENTENCE_CLASSES}>
        {roles.length === 0
          ? "Aucun rôle exempté."
          : `Les membres de ces rôles postent n’importe quel lien.${holdsStaffRole ? " Le rôle du staff est toujours exempté : il n’a pas de croix." : ""}`}
      </p>
      {list}
      <p className={SECTION_SENTENCE_CLASSES}>
        AutoMod laisse aussi passer le propriétaire du serveur Discord et les
        membres qui ont la permission « Administrateur » ou « Gérer le
        serveur ».
      </p>
    </section>
  )
}
