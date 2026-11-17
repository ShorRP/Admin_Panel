import type { APIRole, Snowflake } from "discord-api-types/v10"

export function isExemptableRole(
  { id, managed }: Pick<APIRole, "id" | "managed">,
  guildId: Snowflake
) {
  return id !== guildId && !managed
}
