import "server-only"

import type { APIGuildMember } from "discord-api-types/v10"

import { auditLogReason } from "@/audit-log/audit-log-reason"
import type { DiscordApi } from "@/discord/discord-api"
import { memberName } from "@/discord/member-name"
import type { StaffMember } from "@/staff/staff-member"
import { formatParisTime } from "@/ui/paris-time"
import { deName } from "./de-name"
import { DIRECT_MESSAGE_OUTCOMES, sendDirectMessage } from "./direct-message"
import { unlessDiscordUnavailable } from "./discord-unavailable"
import { readSanctionRefusals } from "./sanction-refusal"
import type { TimeoutFields, TimeoutResult } from "./sanction-result"
import {
  submittedTimeoutChange,
  type SubmittedTimeoutChange,
} from "./submitted-timeout-change"
import { timeoutDirectMessage } from "./timeout-direct-message"

type CheckedChange = { name: string; member: APIGuildMember }

const NOT_CHANGED = {
  "time-out":
    "Discord n’a pas répondu : l’exclusion temporaire n’a pas eu lieu. Réessaie.",
  lift: "Discord n’a pas répondu : la levée n’a pas eu lieu. Réessaie.",
}

const MAYBE_CHANGED = {
  "time-out":
    "Discord n’a pas répondu : l’exclusion temporaire est peut-être passée, peut-être pas. Recharge la page pour vérifier, puis réessaie.",
  lift: "Discord n’a pas répondu : la levée est peut-être passée, peut-être pas. Recharge la page pour vérifier, puis réessaie.",
}

export async function changeTimeout(
  discord: DiscordApi,
  staffMember: StaffMember,
  formData: FormData
): Promise<TimeoutResult> {
  if (!staffMember.opensModeration) {
    throw new Error("Only a staff member who moderates changes a timeout")
  }
  const submitted = submittedTimeoutChange(formData)
  if (!submitted.ok) {
    return failure(submitted.message, submitted.fields)
  }
  const { fields, reason, seconds } = submitted
  const checked = await unlessDiscordUnavailable(
    () => checkChange(discord, staffMember, submitted),
    NOT_CHANGED[fields.change]
  )
  if (typeof checked === "string") {
    return failure(checked, fields)
  }
  const { name, member } = checked
  const end = seconds === null ? null : new Date(Date.now() + seconds * 1000)
  const changed = await unlessDiscordUnavailable(async () => {
    await discord.modifyMember(
      member.user.id,
      { communication_disabled_until: end?.toISOString() ?? null },
      auditLogReason(staffMember, reason)
    )
    return true
  }, false)
  if (!changed) {
    return failure(MAYBE_CHANGED[fields.change], fields)
  }
  if (end === null) {
    return {
      ok: true,
      message: `L’exclusion temporaire ${deName(name)} est levée.`,
    }
  }
  const timedOut = `${name} est en exclusion temporaire jusqu’au ${formatParisTime(end)}.`
  if (fields.change !== "time-out" || !fields.notify) {
    return { ok: true, message: timedOut }
  }
  const outcome = await sendDirectMessage(
    discord,
    member.user.id,
    timeoutDirectMessage(end, reason)
  )
  return {
    ok: true,
    message: `${timedOut} ${DIRECT_MESSAGE_OUTCOMES[outcome](name)}`,
  }
}

async function checkChange(
  discord: DiscordApi,
  staffMember: StaffMember,
  { userId, seconds }: Extract<SubmittedTimeoutChange, { ok: true }>
): Promise<CheckedChange | string> {
  const member = userId === null ? null : await discord.getMember(userId)
  if (member === null) {
    return "Ce compte n’est pas membre du serveur Discord."
  }
  const { everySanction, timeout } = await readSanctionRefusals(
    discord,
    staffMember,
    { id: member.user.id, roleIds: member.roles }
  )
  const refusal = everySanction ?? timeout
  if (refusal !== null) {
    return refusal
  }
  const name = memberName(member)
  if (seconds === null && !isTimedOut(member)) {
    return `${name} n’est pas en exclusion temporaire.`
  }
  return { name, member }
}

function isTimedOut({ communication_disabled_until }: APIGuildMember) {
  return (
    typeof communication_disabled_until === "string" &&
    Date.parse(communication_disabled_until) > Date.now()
  )
}

function failure(message: string, fields: TimeoutFields): TimeoutResult {
  return { ok: false, message, ...fields }
}
