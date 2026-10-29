export type AccountStanding =
  { kind: "member"; timedOutUntil: Date | null } | { kind: "banned" }

export function isTimedOut(standing: AccountStanding) {
  return standing.kind === "member" && standing.timedOutUntil !== null
}
