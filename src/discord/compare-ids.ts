import type { Snowflake } from "discord-api-types/v10"

export function compareIds(left: Snowflake, right: Snowflake) {
  return (
    Number(BigInt(left) > BigInt(right)) - Number(BigInt(left) < BigInt(right))
  )
}
