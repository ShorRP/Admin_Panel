import { compareIds } from "@/discord/compare-ids"
import type { AccountCandidate } from "./account-candidate"
import type { AccountListFilters } from "./account-list-filters"

const nameCollator = new Intl.Collator("fr-FR", { sensitivity: "accent" })

type Comparison = (left: AccountCandidate, right: AccountCandidate) => number

export function sortAccounts(
  candidates: readonly AccountCandidate[],
  sort: AccountListFilters["sort"]
) {
  return candidates.toSorted(
    (left, right) =>
      primaryOrder(sort)(left, right) || byNameThenId(left, right)
  )
}

function primaryOrder(sort: AccountListFilters["sort"]): Comparison {
  switch (sort) {
    case null:
      return () => 0
    case "joined-recent":
      return (left, right) =>
        datedFirst(joinedTime(left), joinedTime(right), "latest first")
    case "joined-old":
      return (left, right) =>
        datedFirst(joinedTime(left), joinedTime(right), "earliest first")
    case "role":
      return (left, right) =>
        roleTier(left) - roleTier(right) || rank(left) - rank(right)
  }
}

function byNameThenId(left: AccountCandidate, right: AccountCandidate) {
  return (
    nameCollator.compare(left.account.name, right.account.name) ||
    compareIds(left.account.id, right.account.id)
  )
}

function joinedTime({ member }: AccountCandidate) {
  return member === null || member.joinedAt === null
    ? null
    : member.joinedAt.getTime()
}

function datedFirst(
  left: number | null,
  right: number | null,
  order: "latest first" | "earliest first"
) {
  if (left === null || right === null) {
    return Number(left === null) - Number(right === null)
  }
  return order === "latest first" ? right - left : left - right
}

function roleTier({ member }: AccountCandidate) {
  if (member === null) {
    return 2
  }
  return member.rank === null ? 1 : 0
}

function rank({ member }: AccountCandidate) {
  return member?.rank ?? 0
}
