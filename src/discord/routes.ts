export const ROUTES = {
  guild: "/guilds/{guild.id}",
  guildMembersSearch: "/guilds/{guild.id}/members/search",
  guildMember: "/guilds/{guild.id}/members/{user.id}",
  guildBans: "/guilds/{guild.id}/bans",
  guildBan: "/guilds/{guild.id}/bans/{user.id}",
  guildRoles: "/guilds/{guild.id}/roles",
  autoModerationRules: "/guilds/{guild.id}/auto-moderation/rules",
  autoModerationRule:
    "/guilds/{guild.id}/auto-moderation/rules/{auto_moderation_rule.id}",
  guildAuditLog: "/guilds/{guild.id}/audit-logs",
  oauth2Token: "/oauth2/token",
  currentUser: "/users/@me",
  user: "/users/{user.id}",
  currentUserChannels: "/users/@me/channels",
  channelMessages: "/channels/{channel.id}/messages",
  channelMessage: "/channels/{channel.id}/messages/{message.id}",
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
