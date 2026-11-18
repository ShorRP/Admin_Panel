import { ChannelType, type Snowflake } from "discord-api-types/v10"

import type { GuildChannel } from "@/discord/discord-api"

export type ChannelChoice = {
  id: Snowflake
  name: string
  category: boolean
}

export type ChannelChoiceGroup = {
  id: Snowflake | null
  label: string | null
  choices: ChannelChoice[]
}

const EXEMPTABLE_TYPES: ChannelType[] = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildCategory,
]

const FRENCH_ORDER = new Intl.Collator("fr")

export function isExemptableChannel({ type }: Pick<GuildChannel, "type">) {
  return EXEMPTABLE_TYPES.includes(type)
}

export function isCategory({ type }: Pick<GuildChannel, "type">) {
  return type === ChannelType.GuildCategory
}

export function channelLabel({
  name,
  category,
}: {
  name: string
  category: boolean
}) {
  return category ? `${name} (catégorie)` : `#${name}`
}

export function labelOfChannel(channel: Pick<GuildChannel, "name" | "type">) {
  return channelLabel({ name: channel.name, category: isCategory(channel) })
}

function choiceOf({ id, name, type }: GuildChannel): ChannelChoice {
  return { id, name, category: type === ChannelType.GuildCategory }
}

function byName(left: { name: string }, right: { name: string }) {
  return FRENCH_ORDER.compare(left.name, right.name)
}

export function exemptableChannelGroups(
  channels: GuildChannel[],
  exemptIds: Snowflake[]
): ChannelChoiceGroup[] {
  const categories = channels.filter(isCategory).toSorted(byName)
  const offered = channels.filter(
    (channel) => isExemptableChannel(channel) && !exemptIds.includes(channel.id)
  )
  const inCategory = (categoryId: Snowflake) =>
    offered
      .filter(({ parent_id }) => parent_id === categoryId)
      .map(choiceOf)
      .toSorted(byName)
  const alone = offered
    .filter(
      (channel) =>
        !isCategory(channel) &&
        !categories.some(({ id }) => id === channel.parent_id)
    )
    .map(choiceOf)
    .toSorted(byName)
  return [
    { id: null, label: null, choices: alone },
    ...categories.map((category) => ({
      id: category.id,
      label: category.name,
      choices: [
        ...offered.filter(({ id }) => id === category.id).map(choiceOf),
        ...inCategory(category.id),
      ],
    })),
  ].filter(({ choices }) => choices.length > 0)
}
