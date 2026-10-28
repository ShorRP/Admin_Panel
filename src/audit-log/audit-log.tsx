import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { buttonVariants } from "@/ui/button"
import { MemberAvatar } from "@/ui/member-avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/table"
import type { AuditLogPage } from "./read-audit-log"

const parisTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
})

export function AuditLog({ page }: { page: AuditLogPage }) {
  const { changes, before, older } = page
  return (
    <div className="flex flex-col gap-4">
      {changes.length === 0 ? (
        <p>
          {before === null
            ? "Aucun changement des mots interdits ces 45 derniers jours."
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
            {changes.map(({ id, date, memberName, avatarUrl, description }) => (
              <TableRow
                key={id}
                className="max-sm:flex max-sm:flex-col max-sm:py-2"
              >
                <TableCell className="max-sm:px-0 max-sm:py-0.5">
                  <time dateTime={date.toISOString()}>
                    {parisTime.format(date)}
                  </time>
                </TableCell>
                <TableCell className="whitespace-normal max-sm:px-0 max-sm:py-0.5">
                  <div className="flex items-center gap-2">
                    <MemberAvatar name={memberName} avatarUrl={avatarUrl} />
                    <div className="min-w-0 wrap-anywhere">{memberName}</div>
                  </div>
                </TableCell>
                <TableCell className="wrap-anywhere whitespace-normal max-sm:px-0 max-sm:py-0.5">
                  {description}
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
