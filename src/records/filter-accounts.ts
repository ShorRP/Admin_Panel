import type { AccountCandidate } from "./account-candidate"
import { NO_ROLE, type AccountListFilters } from "./account-list-filters"
import { isTimedOut } from "./account-standing"
import { monthsAgo } from "./months-ago"

const DAY_MS = 24 * 60 * 60 * 1000

export function filterAccounts(
  candidates: readonly AccountCandidate[],
  filters: AccountListFilters,
  now: Date
) {
  const matches = [
    nameMatch(filters.query),
    roleMatch(filters.role),
    standingMatch(filters.standing),
    joinedMatch(filters.joined, now),
    createdMatch(filters.created, now),
    botMatch(filters.bots),
  ]
  return candidates.filter((candidate) =>
    matches.every((matching) => matching(candidate))
  )
}

type Match = (candidate: AccountCandidate) => boolean

function nameMatch(query: AccountListFilters["query"]): Match {
  if (query === null) {
    return () => true
  }
  const start = query.toLocaleLowerCase()
  return ({ names }) => names.some((name) => name.startsWith(start))
}

function roleMatch(role: AccountListFilters["role"]): Match {
  if (role === null) {
    return () => true
  }
  if (role === NO_ROLE) {
    return ({ member }) => member !== null && member.rank === null
  }
  return ({ member }) => member !== null && member.roleIds.includes(role)
}

function standingMatch(standing: AccountListFilters["standing"]): Match {
  switch (standing) {
    case null:
      return () => true
    case "members":
      return ({ account }) => account.standing.kind === "member"
    case "timed-out":
      return ({ account }) => isTimedOut(account.standing)
    case "banned":
      return ({ account }) => account.standing.kind === "banned"
  }
}

function joinedMatch(joined: AccountListFilters["joined"], now: Date): Match {
  switch (joined) {
    case null:
      return () => true
    case "7d":
      return joinedSince(new Date(now.getTime() - 7 * DAY_MS))
    case "30d":
      return joinedSince(new Date(now.getTime() - 30 * DAY_MS))
    case "6m":
      return joinedSince(monthsAgo(now, 6))
    case "over-1y": {
      const yearAgo = monthsAgo(now, 12)
      return (candidate) => {
        const joinedAt = joinedAtOf(candidate)
        return joinedAt !== null && joinedAt < yearAgo
      }
    }
  }
}

function joinedSince(since: Date): Match {
  return (candidate) => {
    const joinedAt = joinedAtOf(candidate)
    return joinedAt !== null && joinedAt >= since
  }
}

function joinedAtOf({ member }: AccountCandidate) {
  return member === null ? null : member.joinedAt
}

function createdMatch(
  created: AccountListFilters["created"],
  now: Date
): Match {
  if (created === null) {
    return () => true
  }
  const since = new Date(now.getTime() - (created === "7d" ? 7 : 30) * DAY_MS)
  return ({ createdAt }) => createdAt >= since
}

function botMatch(bots: AccountListFilters["bots"]): Match {
  return bots === "shown" ? () => true : ({ botAccount }) => !botAccount
}
