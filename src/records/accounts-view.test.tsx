import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AccountsView } from "./accounts-view"
import type { FoundAccount } from "./found-account"

const ALDIS: FoundAccount = {
  id: "1400000000000000001",
  name: "Aldis",
  username: "aldis",
  avatarUrl: null,
  standing: { kind: "member", timedOutUntil: null },
  highestRole: null,
}

function overline(html: string) {
  const labelledBy = /<ul[^>]* aria-labelledby="([^"]*)"/.exec(html)?.[1]
  return new RegExp(`<p[^>]* id="${labelledBy}"[^>]*>([^<]*)</p>`).exec(
    html
  )?.[1]
}

test("a search by name shows its results, counted by what was searched, with no navigation between pages", () => {
  const html = renderToStaticMarkup(
    <AccountsView
      list={{
        kind: "accounts",
        query: "ald",
        accounts: [ALDIS],
        truncated: false,
      }}
    />
  )

  expect(overline(html)).toBe("1 compte commence par « ald »")
  expect(html).not.toContain("<nav")
})

test("with nothing searched, the page of the list shows its ranks out of the total, with the navigation between pages", () => {
  const html = renderToStaticMarkup(
    <AccountsView
      list={{
        kind: "page",
        accounts: [ALDIS],
        page: 2,
        pages: 2,
        first: 26,
        last: 26,
        total: 26,
      }}
    />
  )

  expect(overline(html)).toBe("26 sur 26")
  expect(html).toContain('<nav aria-label="Pages des comptes"')
})
