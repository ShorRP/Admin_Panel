import type { Snowflake } from "discord-api-types/v10"

const DISCORD_EPOCH = BigInt(1420070400000)

export function snowflakeDate(id: Snowflake) {
  return new Date(Number((BigInt(id) >> BigInt(22)) + DISCORD_EPOCH))
}
