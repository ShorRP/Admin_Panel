import { cva } from "class-variance-authority"

import { ParisTime } from "@/ui/paris-time"
import type {
  SanctionAuthor,
  SanctionHistoryEntry,
} from "./read-sanction-history"
import { SanctionChangeSummary } from "./sanction-change-summary"

const HEADING_ID = "sanction-history"

const entryDiamond = cva(
  "absolute top-1.25 left-0 size-2.25 rotate-45 border-[1.5px] bg-background",
  {
    variants: {
      kind: {
        timeout: "border-warning",
        "timeout-lift": "border-success",
        kick: "border-destructive",
        ban: "border-destructive",
        "ban-lift": "border-success",
      },
    },
  }
)

export function SanctionHistory({
  history,
}: {
  history: SanctionHistoryEntry[] | null
}) {
  if (history === null) {
    return null
  }
  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id={HEADING_ID}
          className="font-heading text-2xl leading-[1.2] font-medium"
        >
          Historique des sanctions
        </h2>
        <p className="text-xs text-muted-foreground">
          Discord ne garde l’historique que 45 jours.
        </p>
      </div>
      {history.length === 0 ? (
        <p className="text-muted-foreground">
          Aucune sanction ni levée dans l’historique.
        </p>
      ) : (
        <ol>
          {history.map(({ id, date, change, author, reason }) => (
            <li
              key={id}
              className="group/entry relative flex flex-col gap-0.75 pb-6 pl-7.5"
            >
              <span
                aria-hidden
                className="absolute top-4 bottom-0 left-1 w-px bg-border group-last/entry:hidden"
              />
              <span
                aria-hidden
                className={entryDiamond({ kind: change.kind })}
              />
              <p className="font-medium">
                <SanctionChangeSummary change={change} />
              </p>
              <p className="text-[0.8125rem] wrap-anywhere text-muted-foreground">
                Le <ParisTime date={date} />, par{" "}
                <AuthorSummary author={author} />
              </p>
              {reason !== null ? (
                <p className="mt-1 text-[0.84375rem] text-pretty wrap-anywhere">
                  <span className="text-muted-foreground">Motif : </span>
                  {reason}
                </p>
              ) : (
                author.kind !== "auto-moderation" && (
                  <p className="mt-1 text-[0.84375rem] text-muted-foreground">
                    Aucun motif
                  </p>
                )
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function AuthorSummary({ author }: { author: SanctionAuthor }) {
  switch (author.kind) {
    case "panel":
      return `${author.staffMemberName}, depuis le panel`
    case "discord":
      return `${author.memberName}, dans Discord`
    case "auto-moderation":
      return author.ruleName === null
        ? "AutoMod"
        : `AutoMod, règle « ${author.ruleName} »`
  }
}
