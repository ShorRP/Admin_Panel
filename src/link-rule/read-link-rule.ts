import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import { rolesByHierarchy } from "@/records/role-hierarchy"
import type { StaffMember } from "@/staff/staff-member"
import { allowedDomainsOf, inFrenchOrder } from "./allowed-domains"
import {
  exemptableChannelGroups,
  isCategory,
  type ChannelChoiceGroup,
} from "./exemptable-channel"
import { isExemptableRole } from "./exemptable-role"
import { allowListOf, DEFAULT_ALLOWED_DOMAINS, linkRuleOf } from "./link-rule"
import { linkRuleActionOf, type LinkRuleActionId } from "./link-rule-action"

export type LinkRuleStatus = "absent" | "enabled" | "disabled"

export type NamedItem = { id: Snowflake; name: string | null }

export type RoleChoice = { id: Snowflake; name: string }

export type ExemptChannel = {
  id: Snowflake
  name: string | null
  category: boolean
}

export type LinkRuleSettings = {
  status: LinkRuleStatus
  allowedDomains: string[]
  otherExceptions: string[]
  exemptRoles: NamedItem[]
  exemptableRoles: RoleChoice[]
  staffRoleId: Snowflake
  exemptChannels: ExemptChannel[]
  exemptableChannels: ChannelChoiceGroup[]
  action: LinkRuleActionId | null
}

export async function readLinkRule(
  discord: DiscordApi,
  { staffRoleId }: Pick<StaffMember, "staffRoleId">
): Promise<LinkRuleSettings> {
  const rule = linkRuleOf(await discord.listAutoModerationRules())
  const exemptRoleIds = rule?.exempt_roles ?? [staffRoleId]
  const exemptChannelIds = rule?.exempt_channels ?? []
  const [roles, channels] = await Promise.all([
    discord.listRoles(),
    discord.listChannels(),
  ])
  const { domains, otherExceptions } =
    rule === undefined
      ? { domains: inFrenchOrder(DEFAULT_ALLOWED_DOMAINS), otherExceptions: [] }
      : allowedDomainsOf(allowListOf(rule))
  return {
    status:
      rule === undefined ? "absent" : rule.enabled ? "enabled" : "disabled",
    allowedDomains: domains,
    otherExceptions,
    exemptRoles: named(exemptRoleIds, roles),
    exemptableRoles: rolesByHierarchy(roles)
      .filter(
        (role) =>
          isExemptableRole(role, discord.guildId) &&
          !exemptRoleIds.includes(role.id)
      )
      .map(({ id, name }) => ({ id, name })),
    staffRoleId,
    exemptChannels: exemptChannelIds.map((id) => {
      const channel = channels.find((candidate) => candidate.id === id)
      return {
        id,
        name: channel?.name ?? null,
        category: channel !== undefined && isCategory(channel),
      }
    }),
    exemptableChannels: exemptableChannelGroups(channels, exemptChannelIds),
    action: rule === undefined ? "block" : linkRuleActionOf(rule),
  }
}

function named(ids: Snowflake[], known: { id: Snowflake; name: string }[]) {
  return ids.map((id) => ({
    id,
    name: known.find((candidate) => candidate.id === id)?.name ?? null,
  }))
}
