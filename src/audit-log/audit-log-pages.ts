import "server-only"

import type {
  APIAuditLog,
  AuditLogEvent,
  Snowflake,
} from "discord-api-types/v10"

import type { DiscordApi } from "@/discord/discord-api"

const DISCORD_PAGE_SIZE = 100

export async function* auditLogPages(
  discord: DiscordApi,
  actionType: AuditLogEvent,
  before: Snowflake | null
): AsyncGenerator<APIAuditLog> {
  let cursor = before
  for (;;) {
    const log = await discord.getAuditLog({
      action_type: actionType,
      limit: DISCORD_PAGE_SIZE,
      ...(cursor === null ? {} : { before: cursor }),
    })
    yield log
    const oldest = log.audit_log_entries.at(-1)
    if (
      oldest === undefined ||
      log.audit_log_entries.length < DISCORD_PAGE_SIZE
    ) {
      return
    }
    cursor = oldest.id
  }
}
