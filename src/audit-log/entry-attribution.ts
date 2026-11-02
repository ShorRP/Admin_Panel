import type {
  APIAuditLogEntry,
  APIUser,
  Snowflake,
} from "discord-api-types/v10"

import { userName } from "@/discord/member-name"
import type { AccountIdentity } from "./audit-log-filters"
import { panelReasonOf } from "./audit-log-reason"

export type EntryAttribution =
  | {
      kind: "panel"
      memberId: Snowflake
      memberName: string
      memberNamed: true
      reason: string
    }
  | {
      kind: "discord"
      memberId: Snowflake | null
      memberName: string
      memberNamed: boolean
      reason: string | null
    }

export function attributionOf(
  entry: APIAuditLogEntry,
  users: ReadonlyMap<Snowflake, APIUser>,
  applicationId: Snowflake
): EntryAttribution {
  const panelReason =
    entry.user_id === applicationId && entry.reason !== undefined
      ? panelReasonOf(entry.reason)
      : null
  if (panelReason !== null) {
    return {
      kind: "panel",
      memberId: panelReason.staffMemberId,
      memberName: panelReason.staffMemberName,
      memberNamed: true,
      reason: panelReason.change,
    }
  }
  const author = users.get(entry.user_id ?? "")
  return {
    kind: "discord",
    memberId: entry.user_id,
    memberName: author === undefined ? "Membre inconnu" : userName(author),
    memberNamed: author !== undefined,
    reason: entry.reason ?? null,
  }
}

export function authorOf({
  memberId,
  memberName,
  memberNamed,
}: EntryAttribution): AccountIdentity {
  return { id: memberId, name: memberNamed ? memberName : null }
}
