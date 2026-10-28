import { inspect } from "node:util"
import {
  AuditLogEvent,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"
import { expect, test, vi } from "vitest"

import { answering } from "./answering-fetch"
import { createDiscordApi, restDiscordApi } from "./discord-api"
import { DiscordError } from "./discord-error"

const GUILD_ID = "111111111111111111"
const USER_ID = "222222222222222222"
const ENV = { botToken: "a-bot-token", guildId: GUILD_ID }

const MEMBER = {
  user: {
    id: USER_ID,
    username: "gilles",
    discriminator: "0",
    global_name: "Gilles",
    avatar: null,
  },
  roles: ["333333333333333333"],
  joined_at: "2026-10-01T12:00:00.000000+00:00",
  deaf: false,
  mute: false,
  flags: 0,
}

test("getMember reads the member with the panel's application token", async () => {
  const { fetch, requests } = answering(Response.json(MEMBER))

  const member = await restDiscordApi(ENV, fetch).getMember(USER_ID)

  expect(member).toEqual(MEMBER)
  const [request] = requests
  expect(request?.method).toBe("GET")
  expect(request?.url).toBe(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${USER_ID}`
  )
  expect(request?.headers.get("Authorization")).toBe("Bot a-bot-token")
  expect(request?.headers.get("User-Agent")).toMatch(
    /^DiscordBot \(https:\/\/github\.com\/ShorRP\/Admin_Panel, [^)]+\)$/
  )
})

test("the API is bound to the Discord server its configuration names", () => {
  const { fetch } = answering(Response.json(MEMBER))

  expect(restDiscordApi(ENV, fetch).guildId).toBe(GUILD_ID)
})

test("getMember answers null for a user who is not on the Discord server", async () => {
  const { fetch } = answering(
    Response.json({ message: "Unknown Member", code: 10007 }, { status: 404 })
  )

  expect(await restDiscordApi(ENV, fetch).getMember(USER_ID)).toBeNull()
})

test("a refused call fails with Discord's code and message, under the route's pattern and never the member's ID", async () => {
  const { fetch } = answering(
    Response.json({ message: "Missing Access", code: 50001 }, { status: 403 })
  )

  const error = await restDiscordApi(ENV, fetch)
    .getMember(USER_ID)
    .catch((error: unknown) => error)

  expect(error).toBeInstanceOf(DiscordError)
  expect(error).toMatchObject({
    method: "GET",
    route: "/guilds/{guild.id}/members/{user.id}",
    status: 403,
    code: 50001,
    discordMessage: "Missing Access",
    unavailable: false,
  })
  expect(inspect(error)).not.toContain(USER_ID)
})

async function failureOf(call: Promise<unknown>) {
  return await call.then(
    () => {
      throw new Error("Expected a failure")
    },
    (error: unknown) => error
  )
}

test("a 5xx is Discord unavailable, and is not retried", async () => {
  const { fetch, requests } = answering(
    new Response("Service Unavailable", { status: 503 }),
    Response.json(MEMBER)
  )

  const error = await failureOf(restDiscordApi(ENV, fetch).getMember(USER_ID))

  expect(error).toMatchObject({ status: 503, unavailable: true })
  expect(requests).toHaveLength(1)
})

test("a network error is Discord unavailable", async () => {
  const { fetch } = answering(new TypeError("fetch failed"))

  const error = await failureOf(restDiscordApi(ENV, fetch).getMember(USER_ID))

  expect(error).toBeInstanceOf(DiscordError)
  expect(error).toMatchObject({ status: undefined, unavailable: true })
})

test("a call that times out is Discord unavailable", async () => {
  const { fetch } = answering(
    new DOMException("The operation was aborted due to timeout", "TimeoutError")
  )

  const error = await failureOf(restDiscordApi(ENV, fetch).getMember(USER_ID))

  expect(error).toBeInstanceOf(DiscordError)
  expect(error).toMatchObject({ unavailable: true })
})

function rateLimited(retryAfter: number) {
  return Response.json(
    {
      message: "You are being rate limited.",
      retry_after: retryAfter,
      global: false,
    },
    { status: 429 }
  )
}

test("a 429 of 2 s or less is retried once, after its delay", async () => {
  const { fetch, requests } = answering(
    rateLimited(0.005),
    Response.json(MEMBER)
  )

  const member = await restDiscordApi(ENV, fetch).getMember(USER_ID)

  expect(member).toEqual(MEMBER)
  expect(requests).toHaveLength(2)
})

test("a 429 that comes back is Discord unavailable", async () => {
  const { fetch, requests } = answering(rateLimited(0.005), rateLimited(0.005))

  const error = await failureOf(restDiscordApi(ENV, fetch).getMember(USER_ID))

  expect(error).toMatchObject({
    status: 429,
    retryAfter: 0.005,
    unavailable: true,
  })
  expect(requests).toHaveLength(2)
})

test("a 429 of more than 2 s is Discord unavailable, and is not retried", async () => {
  const { fetch, requests } = answering(rateLimited(2.5), Response.json(MEMBER))

  const error = await failureOf(restDiscordApi(ENV, fetch).getMember(USER_ID))

  expect(error).toMatchObject({
    status: 429,
    retryAfter: 2.5,
    unavailable: true,
  })
  expect(requests).toHaveLength(1)
})

test("an answer that is not JSON is a panel error, with its status", async () => {
  const { fetch } = answering(new Response("<html></html>", { status: 200 }))

  const error = await failureOf(restDiscordApi(ENV, fetch).getMember(USER_ID))

  expect(error).toBeInstanceOf(DiscordError)
  expect(error).toMatchObject({ status: 200, unavailable: false })
})

test("an answer cut short is Discord unavailable", async () => {
  const cutShort = new ReadableStream({
    start(controller) {
      controller.error(new TypeError("terminated"))
    },
  })
  const { fetch } = answering(new Response(cutShort, { status: 200 }))

  const error = await failureOf(restDiscordApi(ENV, fetch).getMember(USER_ID))

  expect(error).toBeInstanceOf(DiscordError)
  expect(error).toMatchObject({ status: undefined, unavailable: true })
})

const RULE_ID = "444444444444444444"

const RULE = {
  id: RULE_ID,
  guild_id: GUILD_ID,
  name: "Blocked words",
  creator_id: "555555555555555555",
  event_type: AutoModerationRuleEventType.MessageSend,
  trigger_type: AutoModerationRuleTriggerType.Keyword,
  trigger_metadata: {
    keyword_filter: ["foo"],
    regex_patterns: [],
    allow_list: [],
  },
  actions: [{ type: AutoModerationActionType.BlockMessage }],
  enabled: true,
  exempt_roles: [],
  exempt_channels: [],
}

test("listAutoModerationRules reads the Discord server's rules", async () => {
  const { fetch, requests } = answering(Response.json([RULE]))

  expect(await restDiscordApi(ENV, fetch).listAutoModerationRules()).toEqual([
    RULE,
  ])
  expect(requests[0]?.method).toBe("GET")
  expect(requests[0]?.url).toBe(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/auto-moderation/rules`
  )
})

test("createAutoModerationRule sends the rule with its reason, URL-encoded", async () => {
  const { fetch, requests } = answering(Response.json(RULE))
  const rule = {
    name: RULE.name,
    event_type: RULE.event_type,
    trigger_type: RULE.trigger_type,
    trigger_metadata: { keyword_filter: ["foo"] },
    actions: RULE.actions,
    enabled: true,
  }

  const created = await restDiscordApi(ENV, fetch).createAutoModerationRule(
    rule,
    "added é"
  )

  expect(created).toEqual(RULE)
  const [request] = requests
  expect(request?.method).toBe("POST")
  expect(request?.url).toBe(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/auto-moderation/rules`
  )
  expect(request?.headers.get("Content-Type")).toBe("application/json")
  expect(request?.headers.get("X-Audit-Log-Reason")).toBe("added%20%C3%A9")
  expect(await request?.json()).toEqual(rule)
})

test("modifyAutoModerationRule sends the changes to that rule, with its reason", async () => {
  const { fetch, requests } = answering(Response.json(RULE))
  const changes = { trigger_metadata: { keyword_filter: ["foo", "bar"] } }

  await restDiscordApi(ENV, fetch).modifyAutoModerationRule(
    RULE_ID,
    changes,
    "bar added"
  )

  const [request] = requests
  expect(request?.method).toBe("PATCH")
  expect(request?.url).toBe(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/auto-moderation/rules/${RULE_ID}`
  )
  expect(request?.headers.get("Content-Type")).toBe("application/json")
  expect(request?.headers.get("X-Audit-Log-Reason")).toBe("bar%20added")
  expect(await request?.json()).toEqual(changes)
})

test("getAuditLog reads the entries the query asks for", async () => {
  const auditLog = {
    application_commands: [],
    audit_log_entries: [],
    auto_moderation_rules: [],
    guild_scheduled_events: [],
    integrations: [],
    threads: [],
    users: [],
    webhooks: [],
  }
  const { fetch, requests } = answering(Response.json(auditLog))

  const read = await restDiscordApi(ENV, fetch).getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
    before: "666666666666666666",
    limit: 25,
  })

  expect(read).toEqual(auditLog)
  expect(requests[0]?.method).toBe("GET")
  expect(requests[0]?.url).toBe(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/audit-logs?action_type=141&before=666666666666666666&limit=25`
  )
})

test("searchMembers sends its query and its limit", async () => {
  const { fetch, requests } = answering(Response.json([MEMBER]))

  const found = await restDiscordApi(ENV, fetch).searchMembers({
    query: "gil é",
    limit: 26,
  })

  expect(found).toEqual([MEMBER])
  expect(requests[0]?.method).toBe("GET")
  expect(requests[0]?.url).toBe(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/members/search?query=gil+%C3%A9&limit=26`
  )
})

test("getUser reads a user by ID", async () => {
  const { fetch, requests } = answering(Response.json(MEMBER.user))

  expect(await restDiscordApi(ENV, fetch).getUser(USER_ID)).toEqual(MEMBER.user)
  expect(requests[0]?.method).toBe("GET")
  expect(requests[0]?.url).toBe(`https://discord.com/api/v10/users/${USER_ID}`)
})

test("getUser answers null for an ID that names no account", async () => {
  const { fetch } = answering(
    Response.json({ message: "Unknown User", code: 10013 }, { status: 404 })
  )

  expect(await restDiscordApi(ENV, fetch).getUser(USER_ID)).toBeNull()
})

test("getBan reads a user's ban on the Discord server", async () => {
  const ban = { user: MEMBER.user, reason: "spam" }
  const { fetch, requests } = answering(Response.json(ban))

  expect(await restDiscordApi(ENV, fetch).getBan(USER_ID)).toEqual(ban)
  expect(requests[0]?.method).toBe("GET")
  expect(requests[0]?.url).toBe(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/bans/${USER_ID}`
  )
})

test("getBan answers null for a user who is not banned", async () => {
  const { fetch } = answering(
    Response.json({ message: "Unknown Ban", code: 10026 }, { status: 404 })
  )

  expect(await restDiscordApi(ENV, fetch).getBan(USER_ID)).toBeNull()
})

test("listBans reads the bans after a user, up to its limit", async () => {
  const { fetch, requests } = answering(Response.json([]))

  expect(
    await restDiscordApi(ENV, fetch).listBans({
      after: USER_ID,
      limit: 1000,
    })
  ).toEqual([])
  expect(requests[0]?.method).toBe("GET")
  expect(requests[0]?.url).toBe(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/bans?after=${USER_ID}&limit=1000`
  )
})

test("listRoles reads the Discord server's roles", async () => {
  const { fetch, requests } = answering(Response.json([]))

  expect(await restDiscordApi(ENV, fetch).listRoles()).toEqual([])
  expect(requests[0]?.method).toBe("GET")
  expect(requests[0]?.url).toBe(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`
  )
})

test("removeMember kicks the member with its reason, URL-encoded, and takes Discord's empty answer", async () => {
  const { fetch, requests } = answering(new Response(null, { status: 204 }))

  await expect(
    restDiscordApi(ENV, fetch).removeMember(USER_ID, "kicked é")
  ).resolves.toBeUndefined()

  const [request] = requests
  expect(request?.method).toBe("DELETE")
  expect(request?.url).toBe(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${USER_ID}`
  )
  expect(request?.headers.get("X-Audit-Log-Reason")).toBe("kicked%20%C3%A9")
  expect(request?.headers.get("Content-Type")).toBeNull()
  expect(await request?.text()).toBe("")
})

test("removeMember fails with Discord's code when Discord refuses the kick", async () => {
  const { fetch } = answering(
    Response.json(
      { message: "Missing Permissions", code: 50013 },
      { status: 403 }
    )
  )

  await expect(
    restDiscordApi(ENV, fetch).removeMember(USER_ID, "kicked")
  ).rejects.toMatchObject({
    method: "DELETE",
    route: "/guilds/{guild.id}/members/{user.id}",
    status: 403,
    code: 50013,
  })
})

test("createDiscordApi validates Discord's variables when it is called", () => {
  vi.stubEnv("DISCORD_BOT_TOKEN", "a-bot-token")
  vi.stubEnv("DISCORD_GUILD_ID", "not-a-snowflake")

  expect(() => createDiscordApi()).toThrow(/DISCORD_GUILD_ID/)

  vi.stubEnv("DISCORD_GUILD_ID", GUILD_ID)

  expect(() => createDiscordApi()).not.toThrow()
})
