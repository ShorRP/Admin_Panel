import type { Snowflake } from "discord-api-types/v10"
import { z } from "zod"

import { accountIdOf } from "@/records/account-id"
import { dayParamOf, textParamOf } from "@/ui/filter-params"
import type { HiddenField } from "@/ui/hidden-fields"
import { CHANGE_TYPES, type ChangeType } from "./change-type"

const MAX_TEXT_LENGTH = 512

export type AuditLogFilters = {
  type: ChangeType | null
  author: string | null
  account: string | null
  from: string | null
  to: string | null
  text: string | null
}

export const NO_FILTER: AuditLogFilters = {
  type: null,
  author: null,
  account: null,
  from: null,
  to: null,
  text: null,
}

export type AccountIdentity = { id: Snowflake | null; name: string | null }

const CHANGE_TYPE = z.enum(CHANGE_TYPES).nullable().catch(null)

const SEARCHED_TEXT = z.string().trim().min(1).nullable().catch(null)

export function auditLogFiltersOf(searchParams: {
  type?: unknown
  author?: unknown
  account?: unknown
  from?: unknown
  to?: unknown
  text?: unknown
}): AuditLogFilters {
  return {
    type: CHANGE_TYPE.parse(searchParams.type),
    author: SEARCHED_TEXT.parse(searchParams.author),
    account: SEARCHED_TEXT.parse(searchParams.account),
    from: dayParamOf(searchParams.from),
    to: dayParamOf(searchParams.to),
    text: textParamOf(searchParams.text, MAX_TEXT_LENGTH),
  }
}

export function hiddenFieldsOf({ type }: AuditLogFilters): HiddenField[] {
  return type === null ? [] : [{ name: "type", value: type }]
}

export function hasFilter(filters: AuditLogFilters) {
  return Object.values(filters).some((value) => value !== null)
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

export function textMatcher(
  searchedText: string | null
): (shownTexts: readonly string[]) => boolean {
  if (searchedText === null) {
    return () => true
  }
  const searched = comparable(searchedText)
  return (shownTexts) =>
    shownTexts.some((shown) => comparable(shown).includes(searched))
}

function comparable(text: string) {
  return text.replace(/\p{Zs}/gu, " ").toLocaleLowerCase()
}
