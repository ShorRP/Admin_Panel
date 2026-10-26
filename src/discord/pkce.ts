import { createHash } from "node:crypto"

export function codeChallengeOf(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url")
}
