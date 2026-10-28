import type { StaffMember } from "./staff-member"

type HandWritten = {
  id: string
  name: string
  avatarUrl: string | null
  opensModeration: boolean
  roleIds: string[]
}

export const handWrittenIsStaffMember: HandWritten extends StaffMember
  ? true
  : false = false
