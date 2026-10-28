import {
  CDNRoutes,
  ImageFormat,
  RouteBases,
  type APIGuildMember,
  type APIUser,
  type Snowflake,
} from "discord-api-types/v10"

const AVATAR_SIZE = 64

export function memberAvatarUrl(
  guildId: Snowflake,
  member: APIGuildMember
): string | null {
  return member.avatar
    ? sized(
        CDNRoutes.guildMemberAvatar(
          guildId,
          member.user.id,
          member.avatar,
          ImageFormat.WebP
        )
      )
    : userAvatarUrl(member.user)
}

export function userAvatarUrl(user: APIUser): string | null {
  return user.avatar
    ? sized(CDNRoutes.userAvatar(user.id, user.avatar, ImageFormat.WebP))
    : null
}

function sized(path: string) {
  return `${RouteBases.cdn}${path}?size=${AVATAR_SIZE}`
}
