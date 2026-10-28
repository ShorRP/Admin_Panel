import type { APIGuildMember, APIUser } from "discord-api-types/v10"

export function memberName({ nick, user }: APIGuildMember) {
  return nick ?? userName(user)
}

export function userName(user: APIUser) {
  return user.global_name ?? user.username
}
