import type { Snowflake } from "discord-api-types/v10"

const DISCORD_EPOCH = BigInt(1420070400000)

const TIMESTAMP_SHIFT = BigInt(22)

export function snowflakeDate(id: Snowflake) {
  return new Date(Number((BigInt(id) >> TIMESTAMP_SHIFT) + DISCORD_EPOCH))
}

export function firstSnowflakeAt(moment: Date): Snowflake | null {
  const sinceEpoch = BigInt(moment.getTime()) - DISCORD_EPOCH
  return sinceEpoch < BigInt(0)
    ? null
    : (sinceEpoch << TIMESTAMP_SHIFT).toString()
}
