import { ChannelType } from "discord-api-types/v10"

import type { GuildChannel } from "@/discord/discord-api"
import { groupedChannels, type ChannelChoiceGroup } from "./exemptable-channel"

const ALERT_TYPES: ChannelType[] = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
]

export function isAlertChannel({ type }: Pick<GuildChannel, "type">) {
  return ALERT_TYPES.includes(type)
}

export function alertChannelGroups(
  channels: GuildChannel[]
): ChannelChoiceGroup[] {
  return groupedChannels(channels, channels.filter(isAlertChannel))
}
