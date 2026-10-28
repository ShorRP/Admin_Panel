import {
  CDNRoutes,
  ImageFormat,
  RouteBases,
  type APIGuildMember,
  type Snowflake,
} from "discord-api-types/v10"

const AVATAR_SIZE = 64

export function memberAvatarUrl(
  guildId: Snowflake,
  { avatar, user }: APIGuildMember
): string | null {
  const path = avatar
    ? CDNRoutes.guildMemberAvatar(guildId, user.id, avatar, ImageFormat.WebP)
    : user.avatar
      ? CDNRoutes.userAvatar(user.id, user.avatar, ImageFormat.WebP)
      : null
  return path === null ? null : `${RouteBases.cdn}${path}?size=${AVATAR_SIZE}`
}
