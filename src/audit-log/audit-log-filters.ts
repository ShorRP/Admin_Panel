import type { Snowflake } from "discord-api-types/v10"
import { z } from "zod"

import { accountIdOf } from "@/records/account-id"
import { CHANGE_TYPES, type ChangeType } from "./change-type"

export type AuditLogFilters = {
  type: ChangeType | null
  author: string | null
  account: string | null
}

export type AccountIdentity = { id: Snowflake | null; name: string | null }

const CHANGE_TYPE = z.enum(CHANGE_TYPES).nullable().catch(null)

const SEARCHED_TEXT = z.string().trim().min(1).nullable().catch(null)

export function auditLogFiltersOf(searchParams: {
  type?: unknown
  author?: unknown
  account?: unknown
}): AuditLogFilters {
  return {
    type: CHANGE_TYPE.parse(searchParams.type),
    author: SEARCHED_TEXT.parse(searchParams.author),
    account: SEARCHED_TEXT.parse(searchParams.account),
  }
}

export function hasFilter({ type, author, account }: AuditLogFilters) {
  return type !== null || author !== null || account !== null
}

export function identityMatcher(
  searchedText: string | null
): (identity: AccountIdentity | null) => boolean {
  if (searchedText === null) {
    return () => true
  }
  const id = accountIdOf(searchedText)
  if (id !== null) {
    return (identity) => identity !== null && identity.id === id
  }
  const start = searchedText.toLocaleLowerCase()
  return (identity) =>
    identity !== null &&
    identity.name !== null &&
    identity.name.toLocaleLowerCase().startsWith(start)
}
