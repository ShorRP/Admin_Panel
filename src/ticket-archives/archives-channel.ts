import "server-only"

import { parseTicketArchivesEnv } from "./env"

export function configuredArchivesChannelId() {
  return parseTicketArchivesEnv(process.env).archivesChannelId
}

export function configuredTicketsCategoryId() {
  return parseTicketArchivesEnv(process.env).ticketsCategoryId
}
