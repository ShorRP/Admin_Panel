export function recordHref(accountId: string) {
  return `/records/${accountId}`
}

export function recordHrefOf(
  accountId: string | null,
  opensModeration: boolean
) {
  return accountId !== null && opensModeration ? recordHref(accountId) : null
}
