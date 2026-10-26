import type { StaffMember } from "@/staff/staff-member"

export function auditLogReason(staffMember: StaffMember, change: string) {
  return `${staffMember.name} (${staffMember.id}) : ${change}`
}
