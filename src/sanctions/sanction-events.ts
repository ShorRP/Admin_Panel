import { AuditLogEvent, type APIAuditLogEntry } from "discord-api-types/v10"

export type SanctionChange =
  | { kind: "timeout"; end: Date | null }
  | { kind: "timeout-lift" }
  | { kind: "kick" }
  | { kind: "ban" }
  | { kind: "ban-lift" }

export type SanctionEvent = {
  actionType: AuditLogEvent
  changeOf: (entry: APIAuditLogEntry) => SanctionChange | null
}

export const STAFF_SANCTION_EVENTS: SanctionEvent[] = [
  { actionType: AuditLogEvent.MemberUpdate, changeOf: timeoutChangeOf },
  { actionType: AuditLogEvent.MemberKick, changeOf: () => ({ kind: "kick" }) },
  { actionType: AuditLogEvent.MemberBanAdd, changeOf: () => ({ kind: "ban" }) },
  {
    actionType: AuditLogEvent.MemberBanRemove,
    changeOf: () => ({ kind: "ban-lift" }),
  },
]

function timeoutChangeOf(entry: APIAuditLogEntry): SanctionChange | null {
  const timeout = entry.changes?.find(
    ({ key }) => key === "communication_disabled_until"
  )
  if (timeout === undefined) {
    return null
  }
  return typeof timeout.new_value === "string"
    ? { kind: "timeout", end: new Date(timeout.new_value) }
    : { kind: "timeout-lift" }
}
