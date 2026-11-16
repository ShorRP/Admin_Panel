import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import type { StaffMember } from "@/staff/staff-member"
import { allowedDomainsOf } from "./allowed-domains"
import { DEFAULT_ALLOWED_DOMAINS, linkRuleOf } from "./link-rule"
import { linkRuleActionOf, type LinkRuleActionId } from "./link-rule-action"

export type LinkRuleStatus = "absent" | "enabled" | "disabled"

export type NamedItem = { id: Snowflake; name: string | null }

export type LinkRuleSettings = {
  status: LinkRuleStatus
  allowedDomains: string[]
  otherExceptions: string[]
  exemptRoles: NamedItem[]
  exemptChannels: NamedItem[]
  action: LinkRuleActionId | null
}

const frenchOrder = new Intl.Collator("fr")

export async function readLinkRule(
  discord: DiscordApi,
  { staffRoleId }: Pick<StaffMember, "staffRoleId">
): Promise<LinkRuleSettings> {
  const rule = linkRuleOf(await discord.listAutoModerationRules())
  const exemptRoleIds = rule?.exempt_roles ?? [staffRoleId]
  const exemptChannelIds = rule?.exempt_channels ?? []
  const [roles, channels] = await Promise.all([
    discord.listRoles(),
    exemptChannelIds.length === 0 ? [] : discord.listChannels(),
  ])
  const { domains, otherExceptions } =
    rule === undefined
      ? { domains: DEFAULT_ALLOWED_DOMAINS, otherExceptions: [] }
      : allowedDomainsOf(rule.trigger_metadata.allow_list ?? [])
  return {
    status:
      rule === undefined ? "absent" : rule.enabled ? "enabled" : "disabled",
    allowedDomains: domains.toSorted(frenchOrder.compare),
    otherExceptions,
    exemptRoles: named(exemptRoleIds, roles),
    exemptChannels: named(exemptChannelIds, channels),
    action: rule === undefined ? "block" : linkRuleActionOf(rule),
  }
}

function named(ids: Snowflake[], known: { id: Snowflake; name: string }[]) {
  return ids.map((id) => ({
    id,
    name: known.find((candidate) => candidate.id === id)?.name ?? null,
  }))
}
