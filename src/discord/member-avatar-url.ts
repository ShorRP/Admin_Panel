import {
  CDNRoutes,
  ImageFormat,
  RouteBases,
  type APIGuildMember,
  type APIUser,
  type Snowflake,
} from "discord-api-types/v10"

export type AvatarSize = 64 | 128

const DEFAULT_AVATAR_SIZE = 64

export function memberAvatarUrl(
  guildId: Snowflake,
  member: APIGuildMember,
  size: AvatarSize = DEFAULT_AVATAR_SIZE
): string | null {
  return member.avatar
    ? sized(
        CDNRoutes.guildMemberAvatar(
          guildId,
          member.user.id,
          member.avatar,
          ImageFormat.WebP
        ),
        size
      )
    : userAvatarUrl(member.user, size)
}

export function userAvatarUrl(
  user: APIUser,
  size: AvatarSize = DEFAULT_AVATAR_SIZE
): string | null {
  return user.avatar
    ? sized(CDNRoutes.userAvatar(user.id, user.avatar, ImageFormat.WebP), size)
    : null
}

function sized(path: string, size: AvatarSize) {
  return `${RouteBases.cdn}${path}?size=${size}`
}
