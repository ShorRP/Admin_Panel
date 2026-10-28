import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import type { AccountRecord } from "@/records/read-record"
import type { StaffMember } from "@/staff/staff-member"
import { readTimeoutRefusal } from "./sanction-refusal"

export type TimeoutOptions =
  | { kind: "none" }
  | { kind: "refused"; reason: string }
  | { kind: "open"; userId: Snowflake; timedOutUntil: Date | null }

export async function readTimeoutOptions(
  discord: DiscordApi,
  staffMember: StaffMember,
  record: AccountRecord | null
): Promise<TimeoutOptions> {
  if (record?.standing.kind !== "member") {
    return { kind: "none" }
  }
  const refusal = await readTimeoutRefusal(discord, staffMember, {
    id: record.id,
    roleIds: record.standing.roles.map(({ id }) => id),
  })
  if (refusal !== null) {
    return { kind: "refused", reason: refusal }
  }
  return {
    kind: "open",
    userId: record.id,
    timedOutUntil: record.standing.timedOutUntil,
  }
}
