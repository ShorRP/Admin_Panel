import type { StaffMember } from "@/staff/staff-member"

const PANEL_REASON = /^(.+?) \(\d{17,20}\) : ([\s\S]+)$/

export type PanelReason = { staffMemberName: string; change: string }

export function auditLogReason(staffMember: StaffMember, change: string) {
  return `${staffMember.name} (${staffMember.id}) : ${change}`
}

export function panelReasonOf(reason: string): PanelReason | null {
  const [, staffMemberName, change] = PANEL_REASON.exec(reason) ?? []
  if (staffMemberName === undefined || change === undefined) {
    return null
  }
  return { staffMemberName, change }
}
