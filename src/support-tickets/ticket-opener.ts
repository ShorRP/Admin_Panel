import {
  OverwriteType,
  PermissionFlagsBits,
  type APIOverwrite,
  type Snowflake,
} from "discord-api-types/v10"

export function openerIdOf(overwrites: APIOverwrite[]): Snowflake | null {
  const openers = overwrites.filter(
    ({ type, allow }) =>
      type === OverwriteType.Member &&
      (BigInt(allow) & PermissionFlagsBits.ViewChannel) ===
        PermissionFlagsBits.ViewChannel
  )
  return openers.length === 1 ? (openers[0]?.id ?? null) : null
}
