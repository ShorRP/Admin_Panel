import type { Snowflake } from "discord-api-types/v10"
import { z } from "zod"

import { ACCOUNT_ID } from "./account-id"
import { rolesByHierarchy } from "./role-hierarchy"

export const NO_ROLE = "none"

const STANDINGS = ["members", "timed-out", "banned"] as const

const JOINED_WINDOWS = ["7d", "30d", "6m", "over-1y"] as const

const CREATED_WINDOWS = ["7d", "30d"] as const

const BOTS = ["shown"] as const

const SORTS = ["joined-recent", "joined-old", "role"] as const

export type AccountListFilters = {
  query: string | null
  role: Snowflake | typeof NO_ROLE | null
  standing: (typeof STANDINGS)[number] | null
  joined: (typeof JOINED_WINDOWS)[number] | null
  created: (typeof CREATED_WINDOWS)[number] | null
  bots: (typeof BOTS)[number] | null
  sort: (typeof SORTS)[number] | null
}

export type AccountListSearchParams = {
  query?: unknown
  role?: unknown
  standing?: unknown
  joined?: unknown
  created?: unknown
  bots?: unknown
  sort?: unknown
  page?: unknown
}

export type RoleOption = { id: Snowflake; name: string }

const QUERY = z.string().trim().min(1).nullable().catch(null)

const ROLE = z
  .union([z.literal(NO_ROLE), ACCOUNT_ID])
  .nullable()
  .catch(null)

const STANDING = z.enum(STANDINGS).nullable().catch(null)

const JOINED = z.enum(JOINED_WINDOWS).nullable().catch(null)

const CREATED = z.enum(CREATED_WINDOWS).nullable().catch(null)

const BOTS_CHOICE = z.enum(BOTS).nullable().catch(null)

const SORT = z.enum(SORTS).nullable().catch(null)

export function queryOf(value: unknown) {
  return QUERY.parse(value)
}

export function accountListFormOf(
  searchParams: AccountListSearchParams,
  roles: readonly (RoleOption & { position: number })[],
  guildId: Snowflake
) {
  const roleOptions = rolesByHierarchy(roles)
    .filter(({ id }) => id !== guildId)
    .map(({ id, name }) => ({ id, name }))
  return {
    filters: accountListFiltersOf(searchParams, roleOptions),
    roles: roleOptions,
  }
}

function accountListFiltersOf(
  searchParams: AccountListSearchParams,
  roleOptions: readonly RoleOption[]
): AccountListFilters {
  const role = ROLE.parse(searchParams.role)
  return {
    query: queryOf(searchParams.query),
    role:
      role === NO_ROLE || roleOptions.some(({ id }) => id === role)
        ? role
        : null,
    standing: STANDING.parse(searchParams.standing),
    joined: JOINED.parse(searchParams.joined),
    created: CREATED.parse(searchParams.created),
    bots: BOTS_CHOICE.parse(searchParams.bots),
    sort: SORT.parse(searchParams.sort),
  }
}
