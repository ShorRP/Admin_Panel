export function isPanelError(error: unknown) {
  return !(
    error instanceof Error &&
    error.name === "DiscordError" &&
    "unavailable" in error &&
    error.unavailable === true
  )
}
