import type { APIEmbed } from "discord-api-types/v10"
import { expect, test } from "vitest"

import examples from "./bot-log-examples.json"

const FAMILIES = [
  "Règlement",
  "Vocaux",
  "Tickets",
  "Serveurs de jeu",
  "Sanctions automatiques",
]

const TITLE = /^([^·]+) · ([^·]+)$/

const MENTION = /<(?:@&|@|#)(\d+)>/g

const ISO_8601_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

const embeds: Record<string, APIEmbed> = examples

test.each(Object.entries(embeds))(
  "the Bot log example %s is titled with a family of the Bot log and an action",
  (_name, embed) => {
    const title = TITLE.exec(embed.title ?? "")

    expect(title).not.toBeNull()
    expect(FAMILIES).toContain(title?.[1])
  }
)

test.each(Object.entries(embeds))(
  "the Bot log example %s has named fields and no text of its own",
  (_name, embed) => {
    expect(embed.fields?.length).toBeGreaterThan(0)
    for (const field of embed.fields ?? []) {
      expect(field.name).not.toBe("")
      expect(field.value).not.toBe("")
    }
    expect(embed.description).toBeUndefined()
  }
)

test.each(Object.entries(embeds))(
  "the Bot log example %s has the ID in plain text beside each mention",
  (_name, embed) => {
    const values = (embed.fields ?? []).map(({ value }) => value)
    const mentions = values.flatMap((value) =>
      [...value.matchAll(MENTION)].map((mention) => ({ mention, value }))
    )

    expect(mentions.length).toBeGreaterThan(0)
    for (const { mention, value } of mentions) {
      const id = mention[1]
      expect(value.slice((mention.index ?? 0) + mention[0].length)).toMatch(
        new RegExp(`^ \\(\`${id}\`\\)`)
      )
    }
  }
)

test.each(Object.entries(embeds))(
  "the Bot log example %s gives the time of the event as an ISO 8601 timestamp with an offset",
  (_name, embed) => {
    expect(embed.timestamp).toMatch(ISO_8601_WITH_OFFSET)
    expect(Number.isNaN(Date.parse(embed.timestamp ?? ""))).toBe(false)
  }
)
