import type { StaffMember } from "@/staff/staff-member"
import { recordHrefForModerator } from "./record-href"

export type OwnRecord = { href: string; name: string }

export async function ownRecordOnceRead(
  staffMember: Promise<StaffMember>
): Promise<OwnRecord | null> {
  try {
    const { id, name, opensModeration } = await staffMember
    const href = recordHrefForModerator(id, opensModeration)
    return href === null ? null : { href, name }
  } catch {
    return null
  }
}
