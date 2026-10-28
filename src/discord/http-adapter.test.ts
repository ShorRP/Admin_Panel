import {
  AuditLogEvent,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { restDiscordApi } from "./discord-api"
import { describeDiscordApiContract } from "./discord-api-contract"
import { DiscordError } from "./discord-error"
import { restDiscordOAuth } from "./discord-oauth"
import { FakeDiscord } from "./fake-discord"
import { httpAdapter } from "./http-adapter"
import { ROUTES } from "./routes"

const OUTSIDER = { id: "222222222222222222", username: "outsider" }

const OWNER = { id: "222222222222222223", username: "owner" }

const MEMBER = { id: "222222222222222224", username: "member" }

const PANEL_ROLE = { id: "333333333333333333", name: "Shor Panel", position: 1 }

function apiOver(fake: FakeDiscord) {
  return restDiscordApi(
    { botToken: "a-bot-token", guildId: fake.guildId },
    httpAdapter(fake, fake)
  )
}

function oauthOver(fake: FakeDiscord) {
  return restDiscordOAuth(
    {
      clientId: fake.applicationUser.id,
      clientSecret: "a-client-secret",
      redirectUri: "http://localhost:3000/login/callback",
    },
    httpAdapter(fake, fake)
  )
}

describeDiscordApiContract("The real DiscordApi over the HTTP adapter", () => ({
  discord: apiOver(
    new FakeDiscord({
      ownerId: OWNER.id,
      roles: [PANEL_ROLE],
      applicationRoles: [PANEL_ROLE.id],
      members: [{ user: OWNER }, { user: MEMBER }],
      users: [OUTSIDER],
    })
  ),
  outsider: OUTSIDER.id,
  member: MEMBER.id,
  deleteMessage: () => Promise.resolve(),
  cleanUp: () => Promise.resolve(),
}))

const CODE_VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"

const GILLES = { id: "222222222222222222", username: "gilles" }

function consentedCode(fake: FakeDiscord, codeVerifier: string) {
  const authorization = new URL(
    oauthOver(fake).authorizationUrl("a-state", codeVerifier)
  )
  return fake.issueOAuth2Code(
    GILLES,
    authorization.searchParams.get("code_challenge") ?? ""
  )
}

test("the real DiscordOAuth logs a member in over the HTTP adapter", async () => {
  const fake = new FakeDiscord()
  const oauth = oauthOver(fake)
  const code = consentedCode(fake, CODE_VERIFIER)

  const token = await oauth.exchangeCode(code, CODE_VERIFIER)

  expect(await oauth.getCurrentUser(token.access_token)).toMatchObject(GILLES)
})

test("a code the fake did not issue is refused over the HTTP adapter", async () => {
  await expect(
    oauthOver(new FakeDiscord()).exchangeCode("a-code", CODE_VERIFIER)
  ).rejects.toMatchObject({ status: 400, unavailable: false })
})

test("a code exchanged with another code verifier, or with none, is refused as Discord refuses it", async () => {
  const fake = new FakeDiscord()
  const code = consentedCode(fake, CODE_VERIFIER)

  await expect(
    oauthOver(fake).exchangeCode(code, `${CODE_VERIFIER.slice(1)}x`)
  ).rejects.toMatchObject({
    status: 400,
    discordMessage: "invalid_grant: Code challenge failed.",
  })
  await expect(oauthOver(fake).exchangeCode(code, "")).rejects.toMatchObject({
    status: 400,
    discordMessage: 'invalid_request: Missing "code_verifier"',
  })
})

test("Discord unavailable reaches the real DiscordApi with its status", async () => {
  const fake = new FakeDiscord()
  fake.failNext(
    "listAutoModerationRules",
    new DiscordError({
      method: "GET",
      route: ROUTES.autoModerationRules,
      status: 503,
    })
  )

  await expect(apiOver(fake).listAutoModerationRules()).rejects.toMatchObject({
    status: 503,
    unavailable: true,
  })
})

test("a failure without a response reaches the real DiscordApi as one", async () => {
  const fake = new FakeDiscord()
  fake.failNext(
    "listAutoModerationRules",
    new DiscordError({ method: "GET", route: ROUTES.autoModerationRules })
  )

  await expect(apiOver(fake).listAutoModerationRules()).rejects.toMatchObject({
    status: undefined,
    unavailable: true,
  })
})

test("a 429 carries its delay, which the real DiscordApi waits out before it retries", async () => {
  const fake = new FakeDiscord()
  fake.failNext(
    "listAutoModerationRules",
    new DiscordError({
      method: "GET",
      route: ROUTES.autoModerationRules,
      status: 429,
      retryAfter: 0.01,
    })
  )

  expect(await apiOver(fake).listAutoModerationRules()).toEqual([])
})

test("a route the panel does not call is answered as Discord answers an unknown one", async () => {
  const fake = new FakeDiscord()
  const adapter = httpAdapter(fake, fake)

  const response = await adapter("https://discord.com/api/v10/gateway")

  expect(response.status).toBe(404)
  expect(await response.json()).toEqual({ message: "404: Not Found", code: 0 })
})

test("a user who is not on the Discord server is answered as Discord answers, with Unknown Member", async () => {
  const fake = new FakeDiscord()
  const adapter = httpAdapter(fake, fake)

  const response = await adapter(
    `https://discord.com/api/v10/guilds/${fake.guildId}/members/222222222222222222`
  )

  expect(response.status).toBe(404)
  expect(await response.json()).toEqual({
    message: "Unknown Member",
    code: 10007,
  })
})

const ADMINISTRATOR_ROLE = {
  id: "333333333333333334",
  name: "Intendant",
  permissions: PermissionFlagsBits.Administrator.toString(),
}

const ABOVE_PANEL_ROLE = {
  id: "333333333333333335",
  name: "Ancien",
  position: 2,
}

const ADMINISTRATOR = { id: "222222222222222225", username: "administrator" }

const SENIOR = { id: "222222222222222226", username: "senior" }

function kickableDiscord() {
  return new FakeDiscord({
    ownerId: OWNER.id,
    roles: [PANEL_ROLE, ADMINISTRATOR_ROLE, ABOVE_PANEL_ROLE],
    applicationRoles: [PANEL_ROLE.id],
    members: [
      { user: OWNER },
      { user: MEMBER },
      { user: ADMINISTRATOR, roles: [ADMINISTRATOR_ROLE.id] },
      { user: SENIOR, roles: [ABOVE_PANEL_ROLE.id] },
    ],
    users: [OUTSIDER],
  })
}

test("the real DiscordApi kicks a member over the HTTP adapter: their account stays, off the Discord server, and the audit log keeps the kick with its reason, under the application", async () => {
  const fake = kickableDiscord()
  const discord = apiOver(fake)

  await discord.removeMember(MEMBER.id, "Spam")

  expect(await discord.getMember(MEMBER.id)).toBeNull()
  expect(await discord.getUser(MEMBER.id)).toMatchObject(MEMBER)
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.MemberKick,
  })
  expect(
    audit_log_entries.map(({ target_id, user_id, reason }) => ({
      target_id,
      user_id,
      reason,
    }))
  ).toEqual([
    {
      target_id: MEMBER.id,
      user_id: fake.applicationUser.id,
      reason: "Spam",
    },
  ])
})

test("a member with the Administrator permission, below the application's role, can be kicked", async () => {
  const discord = apiOver(kickableDiscord())

  await discord.removeMember(ADMINISTRATOR.id, "Spam")

  expect(await discord.getMember(ADMINISTRATOR.id)).toBeNull()
})

test("the owner of the Discord server, and a member whose highest role equals or exceeds the application's, cannot be kicked, with Missing Permissions", async () => {
  const discord = apiOver(kickableDiscord())

  for (const userId of [OWNER.id, SENIOR.id]) {
    await expect(discord.removeMember(userId, "Spam")).rejects.toMatchObject({
      status: 403,
      code: RESTJSONErrorCodes.MissingPermissions,
    })
    expect(await discord.getMember(userId)).not.toBeNull()
  }
  expect(
    (await discord.getAuditLog({ action_type: AuditLogEvent.MemberKick }))
      .audit_log_entries
  ).toEqual([])
})

test("a user who is not on the Discord server cannot be kicked, as Unknown Member", async () => {
  await expect(
    apiOver(kickableDiscord()).removeMember(OUTSIDER.id, "Spam")
  ).rejects.toMatchObject({
    status: 404,
    code: RESTJSONErrorCodes.UnknownMember,
  })
})
