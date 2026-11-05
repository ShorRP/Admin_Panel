import "server-only"

import { parseTicketArchivesEnv } from "./env"

export function configuredArchivesChannelId() {
  return parseTicketArchivesEnv(process.env).archivesChannelId
}

export function configuredTicketCategoryId() {
  return parseTicketArchivesEnv(process.env).ticketCategoryId
}
