import type { APIEmbed, Snowflake } from "discord-api-types/v10"

const TITLE = "\u{1F5C4}️ ARCHIVE D'UN TICKET"

const OPENED_BY = "Ouvert par"

const CLOSED_BY = "Fermé par"

const REQUEST_KIND = "Type de demande"

const OPENED_AT = "Ouvert le"

const CLOSED_AT = "Fermé le"

const REASON = "Motif"

const UNKNOWN_REQUEST_KIND = "Inconnu"

const PLAIN_TEXT_ID = /`(\d{17,20})`/

const LONG_TIMESTAMP = /^<t:(\d+):F>$/

export type TicketArchive = {
  messageId: Snowflake
  openerId: Snowflake
  closerId: Snowflake
  requestKind: string | null
  openedAt: Date
  closedAt: Date
  reason: string
}

export function ticketArchiveOf(
  messageId: Snowflake,
  embeds: APIEmbed[]
): TicketArchive | null {
  const embed = embeds.find(({ title }) => title === TITLE)
  const field = (name: string) =>
    embed?.fields?.find((candidate) => candidate.name === name)?.value
  const openerId = memberIdOf(field(OPENED_BY))
  const closerId = memberIdOf(field(CLOSED_BY))
  const requestKind = field(REQUEST_KIND)
  const openedAt = momentOf(field(OPENED_AT))
  const closedAt = momentOf(field(CLOSED_AT))
  const reason = field(REASON)
  if (
    openerId === null ||
    closerId === null ||
    requestKind === undefined ||
    openedAt === null ||
    closedAt === null ||
    reason === undefined
  ) {
    return null
  }
  return {
    messageId,
    openerId,
    closerId,
    requestKind: requestKind === UNKNOWN_REQUEST_KIND ? null : requestKind,
    openedAt,
    closedAt,
    reason,
  }
}

function memberIdOf(value: string | undefined) {
  return value === undefined ? null : (PLAIN_TEXT_ID.exec(value)?.[1] ?? null)
}

function momentOf(value: string | undefined) {
  const seconds =
    value === undefined ? undefined : LONG_TIMESTAMP.exec(value)?.[1]
  if (seconds === undefined) {
    return null
  }
  const moment = new Date(Number(seconds) * 1000)
  return Number.isNaN(moment.getTime()) ? null : moment
}
