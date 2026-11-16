import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  type RESTPostAPIAutoModerationRuleJSONBody,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { DiscordError } from "@/discord/discord-error"
import { FakeDiscord, type FakeDiscordState } from "@/discord/fake-discord"
import { ROUTES } from "@/discord/routes"
import { readLinkRule } from "./read-link-rule"

const STAFF_ROLE_ID = "1300000000000000000"

const GUARD_ROLE_ID = "1300000000000000010"

const GALLERY_ID = "1500000000000000001"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const STAFF = { id: STAFF_ROLE_ID, name: "Staff" }

function discordOn(state: FakeDiscordState = {}) {
  return new FakeDiscord({
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
    ...state,
  })
}

function linkRule(
  overrides: Partial<RESTPostAPIAutoModerationRuleJSONBody> = {}
): RESTPostAPIAutoModerationRuleJSONBody {
  return {
    name: "Liens bloqués du panel",
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { regex_patterns: ["https?://[^\\s/?#]+"] },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
    enabled: true,
    ...overrides,
  }
}

function entriesOf(domain: string) {
  return [
    `https://${domain}`,
    `https://${domain}/*`,
    `https://www.${domain}`,
    `https://www.${domain}/*`,
  ]
}

async function readOn(discord: FakeDiscord) {
  return await readLinkRule(discord, { staffRoleId: STAFF_ROLE_ID })
}

test("before the link rule exists, the settings are the ones that « Activer » creates, with the rule's status absent, and reading creates nothing", async () => {
  const discord = discordOn({ roles: [STAFF] })

  const settings = await readOn(discord)

  expect(settings).toEqual({
    status: "absent",
    allowedDomains: [
      "cdn.discordapp.com",
      "giphy.com",
      "klipy.com",
      "media.discordapp.net",
      "tenor.com",
      "twitch.tv",
      "youtu.be",
      "youtube.com",
    ],
    otherExceptions: [],
    exemptRoles: [{ id: STAFF_ROLE_ID, name: "Staff" }],
    exemptChannels: [],
    action: "block",
  })
  expect(await discord.listAutoModerationRules()).toEqual([])
})

test("a rule that is on or off reads as so, and the rule's own settings replace the defaults", async () => {
  const discord = discordOn({ roles: [STAFF] })
  const rule = discord.createAutoModerationRuleAs(
    ALDIS.id,
    linkRule({
      trigger_metadata: {
        regex_patterns: ["https?://[^\\s/?#]+"],
        allow_list: [...entriesOf("twitch.tv"), ...entriesOf("arte.tv")],
      },
    })
  )

  const enabled = await readOn(discord)
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule.id, { enabled: false })
  const disabled = await readOn(discord)

  expect(enabled).toMatchObject({
    status: "enabled",
    allowedDomains: ["arte.tv", "twitch.tv"],
    otherExceptions: [],
    exemptRoles: [],
    exemptChannels: [],
    action: "block",
  })
  expect(disabled.status).toBe("disabled")
})

test("an allow list entry that is not part of a domain's four entries is an other exception, in the rule's order, and a domain missing one of its four is no allowed domain", async () => {
  const discord = discordOn()
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    linkRule({
      trigger_metadata: {
        regex_patterns: ["https?://[^\\s/?#]+"],
        allow_list: [
          "*youtube.com",
          ...entriesOf("youtube.com"),
          "https://m.youtube.com/*",
          "https://arte.tv",
          "https://arte.tv/*",
          "https://www.arte.tv",
          "bit.ly",
        ],
      },
    })
  )

  const { allowedDomains, otherExceptions } = await readOn(discord)

  expect(allowedDomains).toEqual(["youtube.com"])
  expect(otherExceptions).toEqual([
    "*youtube.com",
    "https://m.youtube.com/*",
    "https://arte.tv",
    "https://arte.tv/*",
    "https://www.arte.tv",
    "bit.ly",
  ])
})

test("the exempt roles and channels read with their names, one that Discord does not list with none", async () => {
  const discord = discordOn({
    roles: [STAFF, { id: GUARD_ROLE_ID, name: "Garde" }],
    channels: [{ id: GALLERY_ID, name: "galerie" }],
  })
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    linkRule({
      exempt_roles: [STAFF_ROLE_ID, GUARD_ROLE_ID, "1300000000000000999"],
      exempt_channels: [GALLERY_ID, "1500000000000000999"],
    })
  )

  const { exemptRoles, exemptChannels } = await readOn(discord)

  expect(exemptRoles).toEqual([
    { id: STAFF_ROLE_ID, name: "Staff" },
    { id: GUARD_ROLE_ID, name: "Garde" },
    { id: "1300000000000000999", name: null },
  ])
  expect(exemptChannels).toEqual([
    { id: GALLERY_ID, name: "galerie" },
    { id: "1500000000000000999", name: null },
  ])
})

test("with no exempt channel, a read of the channels that fails does not fail the page", async () => {
  const discord = discordOn({ roles: [STAFF] })
  discord.createAutoModerationRuleAs(ALDIS.id, linkRule())
  discord.failNext(
    "listChannels",
    new DiscordError({ method: "GET", route: ROUTES.guildChannels })
  )

  const settings = await readOn(discord)

  expect(settings.exemptChannels).toEqual([])
})

test("the action is read from the rule's actions: blocking alone, with a timeout of an hour or of a day, or one that Discord's own settings made, which reads as none, an alert to a channel being left out of the reading", async () => {
  const discord = discordOn()
  const block = { type: AutoModerationActionType.BlockMessage }
  const timeout = (seconds: number) => ({
    type: AutoModerationActionType.Timeout,
    metadata: { duration_seconds: seconds },
  })
  const alert = {
    type: AutoModerationActionType.SendAlertMessage,
    metadata: { channel_id: GALLERY_ID },
  }
  const rule = discord.createAutoModerationRuleAs(ALDIS.id, linkRule())
  const actionAfter = async (
    actions: RESTPostAPIAutoModerationRuleJSONBody["actions"]
  ) => {
    discord.modifyAutoModerationRuleAs(ALDIS.id, rule.id, { actions })
    return (await readOn(discord)).action
  }

  expect(await actionAfter([block])).toBe("block")
  expect(await actionAfter([block, timeout(3600)])).toBe("timeout-1h")
  expect(await actionAfter([block, timeout(86400)])).toBe("timeout-1d")
  expect(await actionAfter([block, alert])).toBe("block")
  expect(await actionAfter([alert, block, timeout(86400)])).toBe("timeout-1d")
  expect(await actionAfter([block, timeout(60)])).toBeNull()
  expect(await actionAfter([timeout(3600)])).toBeNull()
  expect(await actionAfter([alert])).toBeNull()
})

test("only a keyword rule of exactly that name is the link rule", async () => {
  const discord = discordOn()
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    linkRule({
      trigger_type: AutoModerationRuleTriggerType.MentionSpam,
      trigger_metadata: { mention_total_limit: 5 },
    })
  )
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    linkRule({ name: "Liens bloqués du panel " })
  )

  expect((await readOn(discord)).status).toBe("absent")
})
