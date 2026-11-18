import { DiscordError } from "@/discord/discord-error"

type Done = { ok: true; message: string }

export type WriteResult<Fields extends object = object> =
  Done | ({ ok: false; message: string } & Fields)

export type DomainFields = { domain: string }

export type RoleFields = { role: string }

export type ChannelFields = { channel: string }

const DISCORD_UNAVAILABLE =
  "Discord n’a pas répondu : le changement est peut-être passé, peut-être pas. Recharge la page pour vérifier, puis réessaie."

export function success(message: string): Done {
  return { ok: true, message }
}

export function failure(message: string): WriteResult
export function failure<Fields extends object>(
  message: string,
  fields: Fields
): WriteResult<Fields>
export function failure(message: string, fields: object = {}): WriteResult {
  return { ok: false, message, ...fields }
}

export async function unlessDiscordUnavailable<Fields extends object>(
  fields: Fields,
  write: () => Promise<WriteResult<Fields>>
): Promise<WriteResult<Fields>> {
  try {
    return await write()
  } catch (error) {
    if (error instanceof DiscordError && error.unavailable) {
      return failure(DISCORD_UNAVAILABLE, fields)
    }
    throw error
  }
}
