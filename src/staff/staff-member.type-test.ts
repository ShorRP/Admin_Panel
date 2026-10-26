import type { StaffMember } from "./staff-member"

type HandWritten = { id: string; name: string }

export const handWrittenIsStaffMember: HandWritten extends StaffMember
  ? true
  : false = false
