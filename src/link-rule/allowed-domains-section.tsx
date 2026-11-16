import { cn } from "cn"

import { counted } from "@/blocked-words/french-text"
import { EmptyListFrame } from "@/ui/empty-list-frame"
import {
  CHIP_CLASSES,
  CHIPS_CLASSES,
  SECTION_SENTENCE_CLASSES,
} from "./link-rule-layout"

const HEADING_ID = "allowed-domains"

export function AllowedDomainsSection({ domains }: { domains: string[] }) {
  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h2
          id={HEADING_ID}
          className="font-heading text-[1.375rem] leading-[1.2] font-medium whitespace-nowrap"
        >
          Domaines permis
        </h2>
        <p className="text-[0.8125rem] whitespace-nowrap text-muted-foreground">
          {counted(domains.length, "domaine", "domaines")}
        </p>
      </div>
      {domains.length === 0 ? (
        <EmptyListFrame className="mt-3.5">
          <p>Aucun domaine permis : tout lien est bloqué.</p>
        </EmptyListFrame>
      ) : (
        <p className={cn("mt-1.5", SECTION_SENTENCE_CLASSES)}>
          Les liens en https vers ces domaines, avec ou sans « www. », passent.
        </p>
      )}
      <ul className={cn("mt-3.5 empty:hidden", CHIPS_CLASSES)}>
        {domains.map((domain) => (
          <li key={domain} className={cn(CHIP_CLASSES, "font-mono")}>
            {domain}
          </li>
        ))}
      </ul>
    </section>
  )
}
