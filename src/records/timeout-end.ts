export function timeoutEndOf(
  communicationDisabledUntil: string | null | undefined
) {
  if (
    communicationDisabledUntil === null ||
    communicationDisabledUntil === undefined
  ) {
    return null
  }
  const end = new Date(communicationDisabledUntil)
  return end.getTime() > Date.now() ? end : null
}
