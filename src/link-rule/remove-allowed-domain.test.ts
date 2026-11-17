import {
  AuditLogEvent,
  AutoModerationActionType,
  RESTJSONErrorCodes,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { findStaffMember } from "@/staff/staff-member"
import { addAllowedDomain } from "./add-allowed-domain"
import { newLinkRule } from "./link-rule"
import { readLinkRule } from "./read-link-rule"
import { removeAllowedDomain } from "./remove-allowed-domain"
import { switchLinkRule } from "./switch-link-rule"

const STAFF_ROLE_ID = "1300000000000000000"

const GUARD_ROLE_ID = "1300000000000000010"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = { id: "1400000000000000002", username: "bryn" }

const DISCORD_UNAVAILABLE =
  "Discord n’a pas répondu : le changement est peut-être passé, peut-être pas. Recharge la page pour vérifier, puis réessaie."

function discordWithStaff() {
  return new FakeDiscord({
    roles: [
      { id: STAFF_ROLE_ID, name: "Staff" },
      { id: GUARD_ROLE_ID, name: "Garde" },
    ],
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID] },
      { user: BRYN, roles: [STAFF_ROLE_ID] },
    ],
  })
}

async function staffMemberOn(discord: FakeDiscord, user = ALDIS) {
  const staffMember = await findStaffMember(
    discord,
    { staffRoleId: STAFF_ROLE_ID, moderationRoleIds: [], banRoleIds: [] },
    user.id
  )
  if (staffMember === null) {
    throw new Error(`${user.username} is no staff member`)
  }
  return staffMember
}

function form(domain: string) {
  const data = new FormData()
  data.set("domain", domain)
  return data
}

function entriesOf(domain: string) {
  return [
    `https://${domain}`,
    `https://${domain}/*`,
    `https://www.${domain}`,
    `https://www.${domain}/*`,
  ]
}

async function withTheLinkRule() {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  const enabled = new FormData()
  enabled.set("enabled", "true")
  await switchLinkRule(discord, staffMember, enabled)
  return { discord, staffMember }
}

function createdLinkRuleWith(discord: FakeDiscord, allowList: string[]) {
  const rule = newLinkRule(STAFF_ROLE_ID)
  discord.createAutoModerationRuleAs(ALDIS.id, {
    ...rule,
    trigger_metadata: { ...rule.trigger_metadata, allow_list: allowList },
  })
}

async function allowListOf(discord: FakeDiscord) {
  const [rule] = await discord.listAutoModerationRules()
  return rule?.trigger_metadata.allow_list ?? []
}

test("a domain removed loses its four entries and them alone: the entries of the others, a stray entry that looks like it and the rest of the rule stay, with the audit log naming it", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  createdLinkRuleWith(discord, [
    "*youtube.com",
    ...entriesOf("youtube.com"),
    ...entriesOf("arte.tv"),
    "https://youtube.com/watch",
    ...entriesOf("youtube.com.example"),
  ])
  const [before] = await discord.listAutoModerationRules()

  const result = await removeAllowedDomain(
    discord,
    staffMember,
    form("youtube.com")
  )

  expect(result).toEqual({
    ok: true,
    message: "« youtube.com » n’est plus un domaine permis.",
  })
  const [rule] = await discord.listAutoModerationRules()
  expect(rule).toEqual({
    ...before,
    trigger_metadata: {
      ...before?.trigger_metadata,
      allow_list: [
        "*youtube.com",
        ...entriesOf("arte.tv"),
        "https://youtube.com/watch",
        ...entriesOf("youtube.com.example"),
      ],
    },
  })
  const read = await readLinkRule(discord, { staffRoleId: STAFF_ROLE_ID })
  expect(read.allowedDomains).toEqual(["arte.tv", "youtube.com.example"])
  expect(read.otherExceptions).toEqual([
    "*youtube.com",
    "https://youtube.com/watch",
  ])
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "aldis (1400000000000000001) : retrait du domaine permis « youtube.com »",
  ])
})

test("the write re-reads the rule and removes its own domain alone: what the staff changed in Discord stays", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const [created] = await discord.listAutoModerationRules()
  discord.modifyAutoModerationRuleAs(BRYN.id, created?.id ?? "", {
    enabled: false,
    exempt_roles: [STAFF_ROLE_ID, GUARD_ROLE_ID],
    exempt_channels: ["1500000000000000001"],
    actions: [
      {
        type: AutoModerationActionType.BlockMessage,
        metadata: { custom_message: "Écrit dans Discord" },
      },
    ],
  })
  const [edited] = await discord.listAutoModerationRules()
  await addAllowedDomain(discord, staffMember, form("arte.tv"))

  await removeAllowedDomain(discord, staffMember, form("twitch.tv"))

  const [rule] = await discord.listAutoModerationRules()
  expect(rule).toEqual({
    ...edited,
    trigger_metadata: {
      ...edited?.trigger_metadata,
      allow_list: [
        ...(edited?.trigger_metadata.allow_list ?? []).filter(
          (entry) => !entriesOf("twitch.tv").includes(entry)
        ),
        ...entriesOf("arte.tv"),
      ],
    },
  })
})

test("every allowed domain can be removed, which leaves an empty allow list", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const { allowedDomains } = await readLinkRule(discord, {
    staffRoleId: STAFF_ROLE_ID,
  })

  for (const domain of allowedDomains) {
    const result = await removeAllowedDomain(discord, staffMember, form(domain))
    expect(result.ok).toBe(true)
  }

  expect(await allowListOf(discord)).toEqual([])
  expect(
    (await readLinkRule(discord, { staffRoleId: STAFF_ROLE_ID })).allowedDomains
  ).toEqual([])
})

test("removing a domain frees the room of its four entries, so that another can be added at the 25th", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  for (let index = 1; index <= 17; index++) {
    await addAllowedDomain(discord, staffMember, form(`site${index}.com`))
  }
  const full = await addAllowedDomain(discord, staffMember, form("arte.tv"))

  await removeAllowedDomain(discord, staffMember, form("site1.com"))
  const added = await addAllowedDomain(discord, staffMember, form("arte.tv"))

  expect(full.ok).toBe(false)
  expect(added.ok).toBe(true)
  expect(await allowListOf(discord)).toHaveLength(100)
})

test("a domain that the rule no longer holds is removed with no write, as when two staff members press together", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const entriesBefore = (await discord.getAuditLog({})).audit_log_entries
  const before = await discord.listAutoModerationRules()

  const result = await removeAllowedDomain(
    discord,
    staffMember,
    form("arte.tv")
  )

  expect(result).toEqual({
    ok: true,
    message: "« arte.tv » n’est plus un domaine permis.",
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect((await discord.getAuditLog({})).audit_log_entries).toEqual(
    entriesBefore
  )
})

test("a domain held by half is no allowed domain: removing it writes nothing and leaves its entries", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  createdLinkRuleWith(discord, ["https://arte.tv", "https://arte.tv/*"])
  const before = await discord.listAutoModerationRules()

  const result = await removeAllowedDomain(
    discord,
    staffMember,
    form("arte.tv")
  )

  expect(result.ok).toBe(true)
  expect(await discord.listAutoModerationRules()).toEqual(before)
})

test("an empty domain is refused, and before the link rule exists nothing can be removed, the domain coming back as sent", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)

  const absent = await removeAllowedDomain(
    discord,
    staffMember,
    form("arte.tv")
  )
  const empty = await removeAllowedDomain(discord, staffMember, form(""))
  const missing = await removeAllowedDomain(
    discord,
    staffMember,
    new FormData()
  )

  expect(absent).toEqual({
    ok: false,
    message:
      "La règle des liens n’existe pas encore : active-la d’abord, puis retire le domaine.",
    domain: "arte.tv",
  })
  for (const result of [empty, missing]) {
    expect(result).toEqual({
      ok: false,
      message: "Choisis le domaine à retirer.",
      domain: "",
    })
  }
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("when Discord does not answer the write, or the read before it, the staff are told to reload and check, and the domain comes back as sent", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  discord.failNext(
    "modifyAutoModerationRule",
    new DiscordError({
      method: "PATCH",
      route: ROUTES.autoModerationRule,
      status: 503,
    })
  )
  const write = await removeAllowedDomain(
    discord,
    staffMember,
    form("youtube.com")
  )
  discord.failNext(
    "listAutoModerationRules",
    new DiscordError({ method: "GET", route: ROUTES.autoModerationRules })
  )

  const read = await removeAllowedDomain(
    discord,
    staffMember,
    form("youtube.com")
  )

  for (const result of [write, read]) {
    expect(result).toEqual({
      ok: false,
      message: DISCORD_UNAVAILABLE,
      domain: "youtube.com",
    })
  }
  expect(await allowListOf(discord)).toHaveLength(32)
})

test("a panel error is thrown, not returned", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const missingPermissions = new DiscordError({
    method: "PATCH",
    route: ROUTES.autoModerationRule,
    status: 403,
    code: RESTJSONErrorCodes.MissingPermissions,
    discordMessage: "Missing Permissions",
  })
  discord.failNext("modifyAutoModerationRule", missingPermissions)

  await expect(
    removeAllowedDomain(discord, staffMember, form("youtube.com"))
  ).rejects.toBe(missingPermissions)
})
