import type { StaffMember } from "./staff-member"

type HandWritten = {
  id: string
  name: string
  avatarUrl: string | null
  opensModeration: boolean
}

export const handWrittenIsStaffMember: HandWritten extends StaffMember
  ? true
  : false = false
