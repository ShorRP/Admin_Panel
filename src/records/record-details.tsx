import type { ReactNode } from "react"
import { cn } from "cn"

import { Overline } from "@/ui/overline"
import { ParisTime } from "@/ui/paris-time"
import type { AccountRecord } from "./read-record"

const HEADING_ID = "record-details"

export function RecordDetails({ record }: { record: AccountRecord }) {
  const { globalName, username, id, createdAt, standing } = record
  return (
    <section aria-labelledby={HEADING_ID} className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5 border-b px-5 py-3.5">
        <h2
          id={HEADING_ID}
          className="font-heading text-xl leading-[1.2] font-medium"
        >
          Détails
        </h2>
        <Overline className="text-[0.625rem] tracking-[0.16em] whitespace-nowrap">
          Heures de Paris
        </Overline>
      </div>
      <dl className="grid gap-x-4 px-5 pt-1 pb-1.5 text-sm sm:grid-cols-[minmax(6.875rem,11.875rem)_minmax(0,1fr)]">
        {standing.kind === "banned" && (
          <>
            <Entry term="Motif du bannissement">
              {standing.reason ?? "Aucun motif"}
            </Entry>
            {standing.staffMemberName !== null && (
              <Entry term="Banni par">{standing.staffMemberName}</Entry>
            )}
          </>
        )}
        {standing.kind === "member" && (
          <Entry term="Pseudo sur le serveur">{record.nick ?? "Aucun"}</Entry>
        )}
        <Entry term="Nom d’affichage">{globalName ?? "Aucun"}</Entry>
        <Entry term="Nom d’utilisateur">{username}</Entry>
        <Entry term="ID" className="font-mono text-[0.78125rem]">
          {id}
        </Entry>
        <Entry term="Création du compte">
          <ParisTime date={createdAt} />
        </Entry>
        {standing.kind === "member" && (
          <>
            <Entry term="Arrivée sur le serveur">
              {standing.joinedAt === null ? (
                "Inconnue"
              ) : (
                <ParisTime date={standing.joinedAt} />
              )}
            </Entry>
            <Entry term="Rôles">
              {standing.roles.length === 0 ? (
                "Aucun"
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {standing.roles.map(({ id, name }) => (
                    <li
                      key={id}
                      className="rounded-md border border-input px-2 py-px text-[0.78125rem] wrap-anywhere"
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </Entry>
          </>
        )}
      </dl>
    </section>
  )
}

function Entry({
  term,
  className,
  children,
}: {
  term: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-y-0.5 border-t py-2.75 first:border-t-transparent sm:col-span-2 sm:grid sm:grid-cols-subgrid sm:items-baseline">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className={cn("wrap-anywhere", className)}>{children}</dd>
    </div>
  )
}
