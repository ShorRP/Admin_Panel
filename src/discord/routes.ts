export const ROUTES = {
  guildMember: "/guilds/{guild.id}/members/{user.id}",
  autoModerationRules: "/guilds/{guild.id}/auto-moderation/rules",
  autoModerationRule:
    "/guilds/{guild.id}/auto-moderation/rules/{auto_moderation_rule.id}",
  guildAuditLog: "/guilds/{guild.id}/audit-logs",
  oauth2Token: "/oauth2/token",
  currentUser: "/users/@me",
} as const

export type DiscordRoute = (typeof ROUTES)[keyof typeof ROUTES]

export function fillRoute(route: DiscordRoute, params: Record<string, string>) {
  return route.replace(/\{([^}]+)\}/g, (placeholder, name: string) => {
    const value = params[name]
    if (value === undefined) {
      throw new Error(`No value for ${placeholder} in ${route}`)
    }
    return encodeURIComponent(value)
  })
}
