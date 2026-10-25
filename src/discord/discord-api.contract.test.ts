import { createDiscordApi } from "./discord-api"
import {
  CONTRACT_RULE_PREFIX,
  describeDiscordApiContract,
} from "./discord-api-contract"
import { parseDiscordApiEnv } from "./env"
import { API_BASE, requestDiscord } from "./rest"
import { fillRoute, ROUTES } from "./routes"

const DISCORD_SYSTEM_USER_ID = "643945264868098049"

describeDiscordApiContract("Discord", () => {
  const env = parseDiscordApiEnv(process.env)
  const discord = createDiscordApi()

  return {
    discord,
    outsider: DISCORD_SYSTEM_USER_ID,
    async cleanUp() {
      const route = ROUTES.autoModerationRule
      for (const rule of await discord.listAutoModerationRules()) {
        if (rule.name.startsWith(CONTRACT_RULE_PREFIX)) {
          await requestDiscord(globalThis.fetch, {
            method: "DELETE",
            route,
            url:
              API_BASE +
              fillRoute(route, {
                "guild.id": env.guildId,
                "auto_moderation_rule.id": rule.id,
              }),
            headers: {
              Authorization: `Bot ${env.botToken}`,
              "X-Audit-Log-Reason": encodeURIComponent(
                "Contract suite: clean-up"
              ),
            },
          })
        }
      }
    },
  }
})
