import "server-only"

import type { Snowflake } from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"
import type { AccountRecord } from "@/records/read-record"
import type { StaffMember } from "@/staff/staff-member"
import { readSanctionRefusals } from "./sanction-refusal"

export type TimeoutOption =
  | { kind: "refused"; reason: string }
  | { kind: "open"; timedOutUntil: Date | null }

export type SanctionOptions =
  | { kind: "none" }
  | { kind: "refused"; reason: string }
  | { kind: "member"; userId: Snowflake; timeout: TimeoutOption; ban: boolean }
  | { kind: "absent"; userId: Snowflake }
  | { kind: "banned"; userId: Snowflake }

export async function readSanctionOptions(
  discord: DiscordApi,
  staffMember: StaffMember,
  record: AccountRecord | null
): Promise<SanctionOptions> {
  if (record === null) {
    return { kind: "none" }
  }
  if (record.standing.kind !== "member") {
    return staffMember.opensBans
      ? { kind: record.standing.kind, userId: record.id }
      : { kind: "none" }
  }
  const { everySanction, timeout } = await readSanctionRefusals(
    discord,
    staffMember,
    { id: record.id, roleIds: record.standing.roles.map(({ id }) => id) }
  )
  if (everySanction !== null) {
    return { kind: "refused", reason: everySanction }
  }
  return {
    kind: "member",
    userId: record.id,
    timeout:
      timeout === null
        ? { kind: "open", timedOutUntil: record.standing.timedOutUntil }
        : { kind: "refused", reason: timeout },
    ban: staffMember.opensBans,
  }
}
