import { z } from "zod"

import { quoted } from "@/blocked-words/french-text"
import { allowListEntriesOf } from "./allowed-domains"
import { MAX_ALLOW_LIST_ENTRY_LENGTH } from "./limits"

export const TYPED_DOMAIN = z.string().catch("")

const EXAMPLE = "twitch.tv"

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//

const PATH = /[/?#]/

const WWW = "www."

const DOMAIN =
  /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[a-z]{2,}|xn--[a-z0-9-]+)$/

const LONGEST_ENTRY_WITHOUT_DOMAIN = Math.max(
  ...allowListEntriesOf("").map(({ length }) => length)
)

export const MAX_DOMAIN_LENGTH =
  MAX_ALLOW_LIST_ENTRY_LENGTH - LONGEST_ENTRY_WITHOUT_DOMAIN

export type SubmittedDomain =
  | { ok: true; typed: string; domain: string }
  | { ok: false; typed: string; message: string }

export function submittedDomain(formData: FormData): SubmittedDomain {
  const typed = TYPED_DOMAIN.parse(formData.get("domain"))
  const domain = typed.trim().toLowerCase()
  const message = refusalOf(domain)
  return message === null
    ? { ok: true, typed, domain }
    : { ok: false, typed, message }
}

function refusalOf(domain: string) {
  if (domain === "") {
    return `Saisis un domaine, comme ${quoted(EXAMPLE)}.`
  }
  if (SCHEME.test(domain)) {
    return `Saisis le domaine seul, sans schéma : ${quoted(EXAMPLE)}, pas ${quoted(`https://${EXAMPLE}`)}.`
  }
  if (PATH.test(domain)) {
    return `Saisis le domaine seul, sans chemin : ${quoted(EXAMPLE)}, pas ${quoted(`${EXAMPLE}/directory`)}.`
  }
  if (domain.startsWith(WWW)) {
    return `Saisis le domaine sans ${quoted(WWW)} : le panel permet ${quoted(EXAMPLE)} comme ${quoted(`${WWW}${EXAMPLE}`)}.`
  }
  if (!DOMAIN.test(domain)) {
    return `Ce n’est pas un domaine bien formé : utilise des lettres, des chiffres, des tirets et des points, comme ${quoted(EXAMPLE)}.`
  }
  if (domain.length > MAX_DOMAIN_LENGTH) {
    return `Raccourcis ce domaine : AutoMod limite chaque entrée de la liste permise à ${MAX_ALLOW_LIST_ENTRY_LENGTH} caractères, ce qui borne le domaine à ${MAX_DOMAIN_LENGTH}.`
  }
  return null
}
