import { createDiscordApi } from "./discord-api"
import {
  CONTRACT_RULE_PREFIX,
  describeDiscordApiContract,
  patiently,
} from "./discord-api-contract"
import { parseContractEnv, parseDiscordApiEnv } from "./env"
import { API_BASE, requestDiscord } from "./rest"
import { fillRoute, ROUTES, type DiscordRoute } from "./routes"

const DISCORD_SYSTEM_USER_ID = "643945264868098049"

describeDiscordApiContract("Discord", () => {
  const env = parseDiscordApiEnv(process.env)
  const { memberId, absentUserId } = parseContractEnv(process.env)
  const discord = createDiscordApi()

  async function remove(route: DiscordRoute, params: Record<string, string>) {
    await patiently(() =>
      requestDiscord(globalThis.fetch, {
        method: "DELETE",
        route,
        url:
          API_BASE + fillRoute(route, { "guild.id": env.guildId, ...params }),
        headers: {
          Authorization: `Bot ${env.botToken}`,
          "X-Audit-Log-Reason": encodeURIComponent("Contract suite: clean-up"),
        },
      })
    )
  }

  return {
    discord,
    outsider: DISCORD_SYSTEM_USER_ID,
    member: memberId,
    absent: absentUserId,
    async deleteMessage(channelId, messageId) {
      await remove(ROUTES.channelMessage, {
        "channel.id": channelId,
        "message.id": messageId,
      })
    },
    async cleanUp() {
      const rules = await patiently(() => discord.listAutoModerationRules())
      for (const rule of rules) {
        if (rule.name.startsWith(CONTRACT_RULE_PREFIX)) {
          await remove(ROUTES.autoModerationRule, {
            "auto_moderation_rule.id": rule.id,
          })
        }
      }
    },
  }
})
