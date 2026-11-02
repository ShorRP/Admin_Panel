export function recordHref(accountId: string) {
  return `/records/${accountId}`
}

export function recordHrefForModerator(
  accountId: string | null,
  opensModeration: boolean
) {
  return accountId !== null && opensModeration ? recordHref(accountId) : null
}
