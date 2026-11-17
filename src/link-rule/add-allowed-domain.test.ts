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
  await switchLinkRule(discord, staffMember, formOf("enabled", "true"))
  return { discord, staffMember }
}

function formOf(name: string, value: string) {
  const data = new FormData()
  data.set(name, value)
  return data
}

async function allowListOf(discord: FakeDiscord) {
  const [rule] = await discord.listAutoModerationRules()
  return rule?.trigger_metadata.allow_list ?? []
}

test("a domain added gives the four entries of the model, which read back as an allowed domain among the others, with the audit log naming it", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const before = await allowListOf(discord)

  const result = await addAllowedDomain(discord, staffMember, form("arte.tv"))

  expect(result).toEqual({
    ok: true,
    message: "« arte.tv » est maintenant un domaine permis.",
  })
  expect(await allowListOf(discord)).toEqual([
    ...before,
    ...entriesOf("arte.tv"),
  ])
  const { allowedDomains, otherExceptions } = await readLinkRule(discord, {
    staffRoleId: STAFF_ROLE_ID,
  })
  expect(allowedDomains).toContain("arte.tv")
  expect(allowedDomains).toHaveLength(9)
  expect(otherExceptions).toEqual([])
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "aldis (1400000000000000001) : ajout du domaine permis « arte.tv »",
  ])
})

const EMPTY_REFUSAL = "Saisis un domaine, comme « twitch.tv »."

const SCHEME_REFUSAL =
  "Saisis le domaine seul, sans schéma : « twitch.tv », pas « https://twitch.tv »."

const PATH_REFUSAL =
  "Saisis le domaine seul, sans chemin : « twitch.tv », pas « twitch.tv/directory »."

const WWW_REFUSAL =
  "Saisis le domaine sans « www. » : le panel permet « twitch.tv » comme « www.twitch.tv »."

const MALFORMED_REFUSAL =
  "Ce n’est pas un domaine bien formé : utilise des lettres, des chiffres, des tirets et des points, comme « twitch.tv »."

test.each([
  ["", EMPTY_REFUSAL],
  ["   ", EMPTY_REFUSAL],
  ["https://twitch.tv", SCHEME_REFUSAL],
  ["HTTP://Twitch.tv/x", SCHEME_REFUSAL],
  ["twitch.tv/directory", PATH_REFUSAL],
  ["twitch.tv/", PATH_REFUSAL],
  ["twitch.tv?lang=fr", PATH_REFUSAL],
  ["twitch.tv#top", PATH_REFUSAL],
  ["www.twitch.tv", WWW_REFUSAL],
  ["WWW.Twitch.TV", WWW_REFUSAL],
  ["twitch", MALFORMED_REFUSAL],
  ["twitch..tv", MALFORMED_REFUSAL],
  ["twitch.tv.", MALFORMED_REFUSAL],
  ["-twitch.tv", MALFORMED_REFUSAL],
  ["twitch-.tv", MALFORMED_REFUSAL],
  ["twi tch.tv", MALFORMED_REFUSAL],
  ["tw_itch.tv", MALFORMED_REFUSAL],
  ["twitch.t", MALFORMED_REFUSAL],
  ["twitch.t1", MALFORMED_REFUSAL],
  ["192.168.0.1", MALFORMED_REFUSAL],
  ["twitch.tv:8080", MALFORMED_REFUSAL],
  ["évian.fr", MALFORMED_REFUSAL],
])(
  "the domain %j is refused in French and handed back as typed, and nothing is written",
  async (typed, message) => {
    const { discord, staffMember } = await withTheLinkRule()
    const before = await discord.listAutoModerationRules()
    const entriesBefore = (await discord.getAuditLog({})).audit_log_entries

    const result = await addAllowedDomain(discord, staffMember, form(typed))

    expect(result).toEqual({ ok: false, message, domain: typed })
    expect(await discord.listAutoModerationRules()).toEqual(before)
    expect((await discord.getAuditLog({})).audit_log_entries).toEqual(
      entriesBefore
    )
  }
)

test("a domain in capitals is accepted and written in lower case, a domain of a subdomain and of several labels too", async () => {
  const { discord, staffMember } = await withTheLinkRule()

  const upper = await addAllowedDomain(discord, staffMember, form("  Arte.TV "))
  const subdomain = await addAllowedDomain(
    discord,
    staffMember,
    form("m.youtube.com")
  )

  expect(upper).toEqual({
    ok: true,
    message: "« arte.tv » est maintenant un domaine permis.",
  })
  expect(subdomain.ok).toBe(true)
  const { allowedDomains, otherExceptions } = await readLinkRule(discord, {
    staffRoleId: STAFF_ROLE_ID,
  })
  expect(allowedDomains).toEqual(
    expect.arrayContaining(["arte.tv", "m.youtube.com"])
  )
  expect(otherExceptions).toEqual([])
  expect(await allowListOf(discord)).not.toContain("https://Arte.TV")
})

test("a domain whose longest entry makes 60 characters is accepted, one of 47 characters is refused as too long, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const longest = `${"a".repeat(42)}.com`
  const tooLong = `${"a".repeat(43)}.com`
  expect(entriesOf(longest).map((entry) => entry.length)).toContain(60)

  const accepted = await addAllowedDomain(discord, staffMember, form(longest))
  const before = await discord.listAutoModerationRules()
  const refused = await addAllowedDomain(discord, staffMember, form(tooLong))

  expect(accepted.ok).toBe(true)
  expect(refused).toEqual({
    ok: false,
    message:
      "Raccourcis ce domaine : AutoMod limite chaque entrée de la liste permise à 60 caractères, ce qui borne le domaine à 46.",
    domain: tooLong,
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
})

test("a domain already allowed is refused, whatever its case, and handed back as typed, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  await addAllowedDomain(discord, staffMember, form("arte.tv"))
  const before = await discord.listAutoModerationRules()
  const entriesBefore = (await discord.getAuditLog({})).audit_log_entries

  const same = await addAllowedDomain(discord, staffMember, form("arte.tv"))
  const upper = await addAllowedDomain(discord, staffMember, form("Arte.TV"))
  const fromTheDefaults = await addAllowedDomain(
    discord,
    staffMember,
    form(" YouTube.com")
  )

  expect(same).toEqual({
    ok: false,
    message: "« arte.tv » est déjà un domaine permis.",
    domain: "arte.tv",
  })
  expect(upper).toEqual({
    ok: false,
    message: "« arte.tv » est déjà un domaine permis.",
    domain: "Arte.TV",
  })
  expect(fromTheDefaults).toEqual({
    ok: false,
    message: "« youtube.com » est déjà un domaine permis.",
    domain: " YouTube.com",
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect((await discord.getAuditLog({})).audit_log_entries).toEqual(
    entriesBefore
  )
})

test("the rule holds 25 allowed domains, 100 entries: the 26th is refused in the panel's own message, which counts the entries, and nothing is written", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  for (let index = 1; index <= 17; index++) {
    const added = await addAllowedDomain(
      discord,
      staffMember,
      form(`site${index}.com`)
    )
    expect(added.ok).toBe(true)
  }
  const before = await discord.listAutoModerationRules()

  const refused = await addAllowedDomain(
    discord,
    staffMember,
    form("site18.com")
  )

  expect(await allowListOf(discord)).toHaveLength(100)
  expect(
    (await readLinkRule(discord, { staffRoleId: STAFF_ROLE_ID })).allowedDomains
  ).toHaveLength(25)
  expect(refused).toEqual({
    ok: false,
    message:
      "La liste permise de la règle des liens compte déjà 100 entrées sur 100, et « site18.com » en demande 4 de plus. Retire un domaine, puis réessaie.",
    domain: "site18.com",
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
})

function createdLinkRuleWith(discord: FakeDiscord, allowList: string[]) {
  const rule = newLinkRule(STAFF_ROLE_ID)
  discord.createAutoModerationRuleAs(ALDIS.id, {
    ...rule,
    trigger_metadata: { ...rule.trigger_metadata, allow_list: allowList },
  })
}

function strays(count: number) {
  return Array.from({ length: count }, (_, index) => `*stray${index}.example`)
}

test("the entries of « Autres exceptions » count in the 100: with 97 entries, among which a domain held by half, a domain that needs 4 is refused, in a message that is true when no domain is allowed, and the half-held domain that needs 2 is completed with its missing entries alone", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  createdLinkRuleWith(discord, [
    ...strays(95),
    "https://arte.tv",
    "https://arte.tv/*",
  ])
  const before = await discord.listAutoModerationRules()

  const refused = await addAllowedDomain(
    discord,
    staffMember,
    form("twitch.tv")
  )

  expect(refused).toEqual({
    ok: false,
    message:
      "La liste permise de la règle des liens compte déjà 97 entrées sur 100, et « twitch.tv » en demande 4 de plus. Retire une entrée d’« Autres exceptions » dans Discord, puis réessaie.",
    domain: "twitch.tv",
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)

  const completed = await addAllowedDomain(
    discord,
    staffMember,
    form("arte.tv")
  )

  expect(completed).toEqual({
    ok: true,
    message: "« arte.tv » est maintenant un domaine permis.",
  })
  const allowList = await allowListOf(discord)
  expect(allowList).toHaveLength(99)
  expect(new Set(allowList).size).toBe(99)
  expect(allowList.slice(0, 95)).toEqual(strays(95))
  expect(allowList.slice(95)).toEqual(
    expect.arrayContaining(entriesOf("arte.tv"))
  )
  const read = await readLinkRule(discord, { staffRoleId: STAFF_ROLE_ID })
  expect(read.allowedDomains).toEqual(["arte.tv"])
  expect(read.otherExceptions).toEqual(strays(95))
})

test("when the entries of « Autres exceptions » and the allowed domains fill the 100, the refusal says what frees room, a domain or an entry of the others", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  createdLinkRuleWith(discord, [
    ...strays(92),
    ...entriesOf("arte.tv"),
    ...entriesOf("twitch.tv"),
  ])

  const refused = await addAllowedDomain(
    discord,
    staffMember,
    form("tenor.com")
  )

  expect(refused).toEqual({
    ok: false,
    message:
      "La liste permise de la règle des liens compte déjà 100 entrées sur 100, et « tenor.com » en demande 4 de plus. Retire un domaine ou une entrée d’« Autres exceptions » dans Discord, puis réessaie.",
    domain: "tenor.com",
  })
})

test("the write re-reads the rule and adds its own domain alone: what the staff changed in Discord, and the domains that another staff member added since, stay", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const bryn = await staffMemberOn(discord, BRYN)
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
      {
        type: AutoModerationActionType.Timeout,
        metadata: { duration_seconds: 60 },
      },
    ],
    trigger_metadata: {
      ...created?.trigger_metadata,
      allow_list: [
        ...(created?.trigger_metadata.allow_list ?? []),
        "*youtube.com",
      ],
    },
  })
  const [edited] = await discord.listAutoModerationRules()

  await addAllowedDomain(discord, staffMember, form("arte.tv"))
  await addAllowedDomain(discord, bryn, form("kick.com"))
  await addAllowedDomain(discord, bryn, form("example.org"))

  const [rule] = await discord.listAutoModerationRules()
  expect(rule).toEqual({
    ...edited,
    trigger_metadata: {
      ...edited?.trigger_metadata,
      allow_list: [
        ...(edited?.trigger_metadata.allow_list ?? []),
        ...entriesOf("arte.tv"),
        ...entriesOf("kick.com"),
        ...entriesOf("example.org"),
      ],
    },
  })
})

test("each addition is recorded in the audit log under the staff member's name and Discord ID, naming the domain in lower case", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  const bryn = await staffMemberOn(discord, BRYN)

  await addAllowedDomain(discord, staffMember, form("arte.tv"))
  await addAllowedDomain(discord, bryn, form("Kick.COM"))

  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "bryn (1400000000000000002) : ajout du domaine permis « kick.com »",
    "aldis (1400000000000000001) : ajout du domaine permis « arte.tv »",
  ])
})

test("before the link rule exists, the domain is refused, handed back as typed, and the rule is not created", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)

  const result = await addAllowedDomain(discord, staffMember, form("Arte.tv"))

  expect(result).toEqual({
    ok: false,
    message:
      "La règle des liens n’existe pas encore : active-la d’abord, puis ajoute le domaine.",
    domain: "Arte.tv",
  })
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("when Discord does not answer the write, or the read before it, the staff are told to reload and check, and the domain comes back as typed", async () => {
  const { discord, staffMember } = await withTheLinkRule()
  discord.failNext(
    "modifyAutoModerationRule",
    new DiscordError({
      method: "PATCH",
      route: ROUTES.autoModerationRule,
      status: 503,
    })
  )
  const write = await addAllowedDomain(discord, staffMember, form("Arte.tv"))
  discord.failNext(
    "listAutoModerationRules",
    new DiscordError({ method: "GET", route: ROUTES.autoModerationRules })
  )

  const read = await addAllowedDomain(discord, staffMember, form("Arte.tv"))

  expect(write).toEqual({
    ok: false,
    message: DISCORD_UNAVAILABLE,
    domain: "Arte.tv",
  })
  expect(read).toEqual({
    ok: false,
    message: DISCORD_UNAVAILABLE,
    domain: "Arte.tv",
  })
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
    addAllowedDomain(discord, staffMember, form("arte.tv"))
  ).rejects.toBe(missingPermissions)
})

test("a domain that the staff added in Discord in capitals is already allowed, since AutoMod compares the allow list whatever the case: typing it in lower case is refused as a duplicate, and nothing is written", async () => {
  const discord = discordWithStaff()
  const staffMember = await staffMemberOn(discord)
  createdLinkRuleWith(discord, entriesOf("Arte.TV"))
  const before = await discord.listAutoModerationRules()
  const entriesBefore = (await discord.getAuditLog({})).audit_log_entries

  const result = await addAllowedDomain(discord, staffMember, form("arte.tv"))

  expect(result).toEqual({
    ok: false,
    message: "« arte.tv » est déjà un domaine permis.",
    domain: "arte.tv",
  })
  expect(await discord.listAutoModerationRules()).toEqual(before)
  expect((await discord.getAuditLog({})).audit_log_entries).toEqual(
    entriesBefore
  )
})
