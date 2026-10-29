import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { SanctionChangeSummary } from "@/sanctions/sanction-change-summary"
import { buttonVariants } from "@/ui/button"
import { MemberAvatar } from "@/ui/member-avatar"
import { ParisTime } from "@/ui/paris-time"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table"
import type { AuditLogChange, AuditLogPage } from "./read-audit-log"

export function AuditLog({
  page,
  opensModeration,
}: {
  page: AuditLogPage
  opensModeration: boolean
}) {
  const { changes, before, older } = page
  return (
    <div className="flex flex-col gap-4">
      {changes.length === 0 ? (
        <p>
          {before === null
            ? "Aucun changement des mots interdits, aucune sanction ni levée ces 45 derniers jours."
            : "Aucun changement plus ancien."}
        </p>
      ) : (
        <Table className="max-sm:block">
          <TableHeader className="max-sm:sr-only">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Membre du staff</TableHead>
              <TableHead>Changement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="max-sm:block">
            {changes.map((change) => (
              <TableRow
                key={change.id}
                className="max-sm:flex max-sm:flex-col max-sm:py-2"
              >
                <TableCell className="max-sm:px-0 max-sm:py-0.5">
                  <ParisTime date={change.date} />
                </TableCell>
                <TableCell className="whitespace-normal max-sm:px-0 max-sm:py-0.5">
                  <div className="flex items-center gap-2">
                    <MemberAvatar
                      name={change.memberName}
                      avatarUrl={change.avatarUrl}
                    />
                    <div className="min-w-0 wrap-anywhere">
                      {change.memberName}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="wrap-anywhere whitespace-normal max-sm:px-0 max-sm:py-0.5">
                  {change.kind === "rule" ? (
                    change.description
                  ) : (
                    <SanctionChangeDescription
                      change={change}
                      opensModeration={opensModeration}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {(before !== null || older !== null) && (
        <nav
          aria-label="Pages du journal d’audit"
          className="flex flex-wrap gap-2"
        >
          {before !== null && (
            <Link
              href="/audit-log"
              className={buttonVariants({ variant: "outline" })}
            >
              <ArrowLeft aria-hidden data-icon="inline-start" />
              Revenir aux plus récents
            </Link>
          )}
          {older !== null && (
            <Link
              href={`/audit-log?before=${older}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <ArrowRight aria-hidden data-icon="inline-start" />
              Plus anciens
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}

function SanctionChangeDescription({
  change: { sanctionChange, account, reason },
  opensModeration,
}: {
  change: Extract<AuditLogChange, { kind: "sanction-change" }>
  opensModeration: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p>
        <SanctionChangeSummary change={sanctionChange} />
      </p>
      <p>
        Compte :{" "}
        {opensModeration ? (
          <Link
            href={`/records/${account.id}`}
            prefetch={false}
            className="underline underline-offset-4"
          >
            {account.name}
          </Link>
        ) : (
          account.name
        )}
      </p>
      <p>{reason === null ? "Aucun motif" : `Motif : ${reason}`}</p>
    </div>
  )
}
