export function ticketArchivesHref(page: number) {
  return page > 1 ? `/support-tickets?page=${page}` : "/support-tickets"
}
