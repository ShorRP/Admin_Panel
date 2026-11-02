import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  RESTJSONErrorCodes,
  type RESTPostAPIAutoModerationRuleJSONBody,
} from "discord-api-types/v10"
import { expect, test } from "vitest"

import { describeDiscordApiContract } from "./discord-api-contract"
import { FakeDiscord } from "./fake-discord"

const OUTSIDER = { id: "222222222222222222", username: "outsider" }

const OWNER = { id: "222222222222222223", username: "owner" }

const MEMBER = { id: "222222222222222224", username: "member" }

const ABSENT = { id: "222222222222222227", username: "absent" }

const PANEL_ROLE = { id: "333333333333333333", name: "Shor Panel", position: 1 }

describeDiscordApiContract("The fake Discord", () => ({
  discord: new FakeDiscord({
    ownerId: OWNER.id,
    roles: [PANEL_ROLE],
    applicationRoles: [PANEL_ROLE.id],
    members: [{ user: OWNER }, { user: MEMBER }],
    users: [OUTSIDER, ABSENT],
  }),
  outsider: OUTSIDER.id,
  member: MEMBER.id,
  absent: ABSENT.id,
  deleteMessage: () => Promise.resolve(),
  cleanUp: () => Promise.resolve(),
}))

function limitedRule(
  actions: RESTPostAPIAutoModerationRuleJSONBody["actions"],
  exemptRoles: string[]
): RESTPostAPIAutoModerationRuleJSONBody {
  return {
    name: "Limited rule",
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { keyword_filter: ["a"] },
    actions,
    exempt_roles: exemptRoles,
    enabled: false,
  }
}

function blocking(customMessage: string) {
  return {
    type: AutoModerationActionType.BlockMessage,
    metadata: { custom_message: customMessage },
  }
}

function timingOut(seconds: number) {
  return {
    type: AutoModerationActionType.Timeout,
    metadata: { duration_seconds: seconds },
  }
}

function roleIds(count: number) {
  return Array.from(
    { length: count },
    (_, index) => `44000000000000${String(index).padStart(4, "0")}`
  )
}

const REFUSED = {
  status: 400,
  code: RESTJSONErrorCodes.InvalidFormBodyOrContentType,
}

const LIMITS = [
  {
    limit: "a timeout of up to 2,419,200 seconds",
    within: limitedRule([timingOut(2_419_200)], []),
    beyond: limitedRule([timingOut(2_419_201)], []),
  },
  {
    limit: "up to 20 exempt roles",
    within: limitedRule([], roleIds(20)),
    beyond: limitedRule([], roleIds(21)),
  },
  {
    limit: "a custom message of up to 300 characters",
    within: limitedRule([blocking("é".repeat(300))], []),
    beyond: limitedRule([blocking("é".repeat(301))], []),
  },
]

for (const { limit, within, beyond } of LIMITS) {
  test(`the fake refuses a rule beyond ${limit}, as Discord does, when it is created and when it is modified`, async () => {
    const discord = new FakeDiscord()
    await expect(
      discord.createAutoModerationRule(beyond, "Beyond")
    ).rejects.toMatchObject(REFUSED)
    const created = await discord.createAutoModerationRule(within, "Within")

    await expect(
      discord.modifyAutoModerationRule(
        created.id,
        { actions: beyond.actions, exempt_roles: beyond.exempt_roles },
        "Beyond"
      )
    ).rejects.toMatchObject(REFUSED)

    expect(await discord.listAutoModerationRules()).toEqual([created])
  })
}
