import type { Snowflake } from "discord-api-types/v10"

import type { BlockedWordAction } from "@/blocked-words/blocked-word-action"
import {
  actionChangeOf,
  additionReason,
  removalReason,
} from "@/blocked-words/blocked-word-reason"
import type { AccountIdentity } from "./audit-log-filters"

const JOINING_WINDOW_MS = 60_000

export type ActionChangeEntry = {
  side: "entering" | "leaving"
  reason: string
  alone: string
  joined: string
}

type Joinable = {
  author: AccountIdentity
  change: { id: Snowflake; date: Date }
  actionChange?: ActionChangeEntry
}

type Half<Found extends Joinable> = { found: Found; entry: ActionChangeEntry }

export function capitalized(text: string) {
  return text.charAt(0).toLocaleUpperCase("fr") + text.slice(1)
}

export function actionChangeEntryOf(
  reason: string,
  ruleAction: BlockedWordAction
): ActionChangeEntry | null {
  const change = actionChangeOf(reason)
  if (change === null) {
    return null
  }
  const joined = capitalized(reason)
  if (ruleAction.id === change.to.id) {
    return {
      side: "entering",
      reason,
      alone: capitalized(additionReason(change.word, change.to)),
      joined,
    }
  }
  if (ruleAction.id === change.from.id) {
    return {
      side: "leaving",
      reason,
      alone: capitalized(removalReason(change.word, change.from)),
      joined,
    }
  }
  return null
}

export function joinActionChanges<Found extends Joinable>(
  found: Found[],
  described: (found: Found, description: string) => Found
): Found[] {
  const halves = found
    .flatMap((half) =>
      half.actionChange === undefined
        ? []
        : [{ found: half, entry: half.actionChange }]
    )
    .toSorted((left, right) =>
      BigInt(left.found.change.id) < BigInt(right.found.change.id) ? -1 : 1
    )
  const open: Half<Found>[] = []
  const absorbed = new Set<Found>()
  const descriptions = new Map<Found, string>()
  for (const half of halves) {
    if (half.entry.side === "entering") {
      open.push(half)
      continue
    }
    const entering = open.findLast((candidate) =>
      isTheSameChange(candidate, half)
    )
    if (entering !== undefined) {
      open.splice(open.indexOf(entering), 1)
      absorbed.add(half.found)
      descriptions.set(entering.found, entering.entry.joined)
    }
  }
  return found
    .filter((half) => !absorbed.has(half))
    .map((half) => {
      const description = descriptions.get(half)
      return description === undefined ? half : described(half, description)
    })
}

function isTheSameChange(entering: Half<Joinable>, leaving: Half<Joinable>) {
  return (
    entering.found.author.id === leaving.found.author.id &&
    entering.entry.reason === leaving.entry.reason &&
    leaving.found.change.date.getTime() -
      entering.found.change.date.getTime() <=
      JOINING_WINDOW_MS
  )
}
