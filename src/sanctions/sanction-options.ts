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
  | { kind: "open"; userId: Snowflake; timeout: TimeoutOption }

export async function readSanctionOptions(
  discord: DiscordApi,
  staffMember: StaffMember,
  record: AccountRecord | null
): Promise<SanctionOptions> {
  if (record?.standing.kind !== "member") {
    return { kind: "none" }
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
    kind: "open",
    userId: record.id,
    timeout:
      timeout === null
        ? { kind: "open", timedOutUntil: record.standing.timedOutUntil }
        : { kind: "refused", reason: timeout },
  }
}
