import type { APIGuildMember, APIUser } from "discord-api-types/v10"
import { expect, test } from "vitest"

import { memberAvatarUrl, userAvatarUrl } from "./member-avatar-url"

const GUILD_ID = "1100000000000000000"

const USER_AVATAR = "0a1b2c3d4e5f60718293a4b5c6d7e8f9"

const GUILD_AVATAR = "f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8"

const NO_MEMBER_FLAGS: number = 0

function userWith(avatar: string | null): APIUser {
  return {
    id: "1400000000000000001",
    username: "aldis",
    discriminator: "0",
    global_name: null,
    avatar,
  }
}

function memberWith(
  avatar: string | null,
  userAvatar: string | null
): APIGuildMember {
  return {
    user: userWith(userAvatar),
    avatar,
    roles: [],
    joined_at: "2026-01-01T00:00:00.000000+00:00",
    deaf: false,
    mute: false,
    flags: NO_MEMBER_FLAGS,
  }
}

test("an account's Discord avatar is asked at 64 px unless a size is given", () => {
  const user = userWith(USER_AVATAR)

  expect(userAvatarUrl(user)).toBe(
    `https://cdn.discordapp.com/avatars/1400000000000000001/${USER_AVATAR}.webp?size=64`
  )
  expect(userAvatarUrl(user, 64)).toBe(userAvatarUrl(user))
})

test("an account's Discord avatar is asked at 128 px when 128 is given", () => {
  expect(userAvatarUrl(userWith(USER_AVATAR), 128)).toBe(
    `https://cdn.discordapp.com/avatars/1400000000000000001/${USER_AVATAR}.webp?size=128`
  )
})

test("a member's avatar on the Discord server is asked at 64 px unless a size is given", () => {
  const member = memberWith(GUILD_AVATAR, USER_AVATAR)

  expect(memberAvatarUrl(GUILD_ID, member)).toBe(
    `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/1400000000000000001/avatars/${GUILD_AVATAR}.webp?size=64`
  )
  expect(memberAvatarUrl(GUILD_ID, member, 64)).toBe(
    memberAvatarUrl(GUILD_ID, member)
  )
})

test("a member's avatar on the Discord server is asked at 128 px when 128 is given", () => {
  expect(
    memberAvatarUrl(GUILD_ID, memberWith(GUILD_AVATAR, USER_AVATAR), 128)
  ).toBe(
    `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/1400000000000000001/avatars/${GUILD_AVATAR}.webp?size=128`
  )
})

test("a member without an avatar on the Discord server gets their Discord avatar, at the size given", () => {
  const member = memberWith(null, USER_AVATAR)

  expect(memberAvatarUrl(GUILD_ID, member)).toBe(
    `https://cdn.discordapp.com/avatars/1400000000000000001/${USER_AVATAR}.webp?size=64`
  )
  expect(memberAvatarUrl(GUILD_ID, member, 128)).toBe(
    `https://cdn.discordapp.com/avatars/1400000000000000001/${USER_AVATAR}.webp?size=128`
  )
})

test("an account with no avatar has no URL, whatever the size", () => {
  expect(userAvatarUrl(userWith(null))).toBeNull()
  expect(userAvatarUrl(userWith(null), 128)).toBeNull()
  expect(memberAvatarUrl(GUILD_ID, memberWith(null, null))).toBeNull()
  expect(memberAvatarUrl(GUILD_ID, memberWith(null, null), 128)).toBeNull()
})

test("an animated avatar is asked still, whatever the size", () => {
  const url = userAvatarUrl(userWith(`a_${USER_AVATAR}`), 128)

  expect(url).toBe(
    `https://cdn.discordapp.com/avatars/1400000000000000001/a_${USER_AVATAR}.webp?size=128`
  )
  expect(url).not.toContain("animated")
})
