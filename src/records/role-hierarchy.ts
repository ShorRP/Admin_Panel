import type { APIRole, Snowflake } from "discord-api-types/v10"

import { compareIds } from "./compare-ids"

export type HighestRole = {
  name: string
  color: string | null
}

export function rolesByHierarchy<T extends { id: Snowflake; position: number }>(
  roles: readonly T[]
): T[] {
  return roles.toSorted(
    (left, right) =>
      right.position - left.position || compareIds(left.id, right.id)
  )
}

export function highestRoleRankOf(
  memberRoleIds: readonly Snowflake[],
  hierarchy: readonly Pick<APIRole, "id">[]
): number | null {
  const rank = hierarchy.findIndex(({ id }) => memberRoleIds.includes(id))
  return rank === -1 ? null : rank
}

export function highestRoleOf(
  memberRoleIds: readonly Snowflake[],
  hierarchy: readonly Pick<APIRole, "id" | "name" | "colors">[]
): HighestRole | null {
  const rank = highestRoleRankOf(memberRoleIds, hierarchy)
  const role = rank === null ? undefined : hierarchy[rank]
  if (role === undefined) {
    return null
  }
  return { name: role.name, color: colorOf(role.colors.primary_color) }
}

function colorOf(primaryColor: number) {
  return primaryColor === 0
    ? null
    : `#${primaryColor.toString(16).padStart(6, "0")}`
}
