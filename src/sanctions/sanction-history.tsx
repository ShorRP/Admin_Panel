import { ParisTime } from "@/ui/paris-time"
import type {
  SanctionAuthor,
  SanctionHistoryEntry,
} from "./read-sanction-history"
import { SanctionChangeSummary } from "./sanction-change-summary"

const HEADING_ID = "sanction-history"

export function SanctionHistory({
  history,
}: {
  history: SanctionHistoryEntry[] | null
}) {
  if (history === null) {
    return null
  }
  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4">
      <h2 id={HEADING_ID} className="font-heading text-lg font-medium">
        Historique des sanctions
      </h2>
      <p>Discord ne garde l’historique que 45 jours.</p>
      {history.length === 0 ? (
        <p>Aucune sanction ni levée dans l’historique.</p>
      ) : (
        <ol className="flex flex-col divide-y">
          {history.map(({ id, date, change, author, reason }) => (
            <li key={id} className="flex flex-col gap-0.5 py-3">
              <p className="font-medium">
                <SanctionChangeSummary change={change} />
              </p>
              <p className="text-sm wrap-anywhere text-muted-foreground">
                Le <ParisTime date={date} />, par{" "}
                <AuthorSummary author={author} />
              </p>
              {reason !== null ? (
                <p className="wrap-anywhere">Motif : {reason}</p>
              ) : (
                author.kind !== "auto-moderation" && <p>Aucun motif</p>
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
