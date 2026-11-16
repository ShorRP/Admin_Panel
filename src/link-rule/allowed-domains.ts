const SCHEME = "https://"

const frenchOrder = new Intl.Collator("fr")

export function allowListEntriesOf(domain: string) {
  return [
    `${SCHEME}${domain}`,
    `${SCHEME}${domain}/*`,
    `${SCHEME}www.${domain}`,
    `${SCHEME}www.${domain}/*`,
  ]
}

export function allowedDomainsOf(allowList: string[]) {
  const held = new Set(allowList)
  const domains = new Set<string>()
  const covered = new Set<string>()
  for (const entry of allowList) {
    const domain = entry.startsWith(SCHEME) ? entry.slice(SCHEME.length) : ""
    if (domain === "" || domain.startsWith("www.") || /[/*]/.test(domain)) {
      continue
    }
    const entries = allowListEntriesOf(domain)
    if (entries.every((candidate) => held.has(candidate))) {
      domains.add(domain)
      entries.forEach((member) => covered.add(member))
    }
  }
  return {
    domains: Array.from(domains).toSorted(frenchOrder.compare),
    otherExceptions: allowList.filter((entry) => !covered.has(entry)),
  }
}
