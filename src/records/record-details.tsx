import type { ReactNode } from "react"

import { MemberAvatar } from "@/ui/member-avatar"
import { ParisTime } from "@/ui/paris-time"
import type { AccountRecord, Standing } from "./read-record"

export function RecordDetails({ record }: { record: AccountRecord | null }) {
  if (record === null) {
    return <p>Aucun compte Discord n’a cet ID.</p>
  }
  const { name, avatarUrl, globalName, username, id, createdAt, standing } =
    record
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <MemberAvatar name={name} avatarUrl={avatarUrl} />
        <h2 className="min-w-0 font-heading text-lg font-medium wrap-anywhere">
          {name}
        </h2>
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr]">
        <Entry term="État">
          <StandingSummary standing={standing} />
        </Entry>
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
        <Entry term="ID">{id}</Entry>
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
                      className="rounded-sm border px-1.5 text-sm wrap-anywhere"
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
      <p>Heures de Paris.</p>
    </div>
  )
}

function Entry({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:col-span-2 sm:grid sm:grid-cols-subgrid">
      <dt className="text-sm text-muted-foreground sm:text-base">{term}</dt>
      <dd className="wrap-anywhere">{children}</dd>
    </div>
  )
}

function StandingSummary({ standing }: { standing: Standing }) {
  switch (standing.kind) {
    case "member":
      return standing.timedOutUntil === null ? (
        "Membre du serveur"
      ) : (
        <>
          Membre exclu temporairement jusqu’au{" "}
          <ParisTime date={standing.timedOutUntil} />
        </>
      )
    case "banned":
      return "Compte banni"
    case "absent":
      return "Compte absent du serveur"
  }
}
