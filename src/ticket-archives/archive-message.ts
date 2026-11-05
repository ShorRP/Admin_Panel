import type { APIEmbed, Snowflake } from "discord-api-types/v10"

type Archive = {
  openerId: Snowflake
  closerId?: Snowflake
  kind?: string | null
  openedAt?: Date
  closedAt?: Date
  reason?: string
}

const DEFAULT_CLOSER_ID = "1400000000000000050"

function memberField(id: Snowflake) {
  return `<@${id}> (\`${id}\`)`
}

function timestampField(moment: Date) {
  return `<t:${Math.floor(moment.getTime() / 1000)}:F>`
}

export function archiveEmbed({
  openerId,
  closerId = DEFAULT_CLOSER_ID,
  kind = "🔧 Problème technique",
  openedAt = new Date("2026-11-03T14:32:00Z"),
  closedAt = new Date("2026-11-03T15:10:00Z"),
  reason = "Résolu",
}: Archive): APIEmbed {
  return {
    title: "🗄️ ARCHIVE D'UN TICKET",
    color: 0xffffff,
    footer: { text: "Shor — archives des tickets" },
    fields: [
      { name: "Ouvert par", value: memberField(openerId), inline: true },
      { name: "Fermé par", value: memberField(closerId), inline: true },
      { name: "Type de demande", value: kind ?? "Inconnu", inline: true },
      { name: "Ouvert le", value: timestampField(openedAt), inline: true },
      { name: "Fermé le", value: timestampField(closedAt), inline: true },
      { name: "Motif", value: reason, inline: false },
    ],
  }
}

type ArchiveMessage = {
  channelId: Snowflake
  authorId?: Snowflake
  sentAt?: Date
  embeds: APIEmbed[]
}

export function archiveMessage({
  channelId,
  authorId,
  sentAt,
  ...archive
}: Archive & {
  channelId: Snowflake
  authorId?: Snowflake
  sentAt?: Date
}): ArchiveMessage {
  return {
    channelId,
    ...(authorId === undefined ? {} : { authorId }),
    ...(sentAt === undefined ? {} : { sentAt }),
    embeds: [archiveEmbed(archive)],
  }
}
