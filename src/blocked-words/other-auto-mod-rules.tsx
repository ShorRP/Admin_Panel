import { ChevronDown } from "lucide-react"

import { Overline } from "@/ui/overline"
import { counted } from "./french-text"
import type { OtherAutoModRule } from "./read-blocked-words"

const LABEL_ID = "other-auto-mod-rules"

export function OtherAutoModRules({ rules }: { rules: OtherAutoModRule[] }) {
  if (rules.length === 0) {
    return null
  }
  return (
    <section aria-labelledby={LABEL_ID} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Overline id={LABEL_ID}>Autres règles AutoMod</Overline>
        <p className="text-[0.8125rem] text-muted-foreground">
          Elles se modifient dans Discord.
        </p>
      </div>
      <ul className="flex flex-col border-t">
        {rules.map(({ id, name, keywords }) => (
          <li key={id} className="border-b py-2.75 text-[0.84375rem]">
            {keywords !== null && keywords.length > 0 ? (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2.5 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  <span className="min-w-0 wrap-anywhere">{name}</span>
                  <span className="flex shrink-0 items-center gap-1 text-xs whitespace-nowrap text-muted-foreground group-hover:text-foreground">
                    {counted(keywords.length, "mot-clé", "mots-clés")}
                    <ChevronDown
                      aria-hidden
                      className="size-3.25 duration-200 ease-out group-open:rotate-180 motion-safe:transition-transform"
                    />
                  </span>
                </summary>
                <ul className="mt-2 flex flex-wrap gap-1">
                  {keywords.map((keyword) => (
                    <li
                      key={keyword}
                      className="rounded-sm border px-1.75 py-0.5 font-mono text-[0.71875rem] wrap-anywhere text-muted-foreground"
                    >
                      {keyword}
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <span className="wrap-anywhere">{name}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
