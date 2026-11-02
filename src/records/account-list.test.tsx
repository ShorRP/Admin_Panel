import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AccountList } from "./account-list"
import type { FoundAccount } from "./found-account"
import type { AccountListPage } from "./list-accounts"

const ALDIS: FoundAccount = {
  id: "1400000000000000001",
  name: "Aldis",
  username: "aldis",
  avatarUrl: null,
  standing: { kind: "member", timedOutUntil: null },
  highestRole: null,
}

const ALDA: FoundAccount = {
  id: "1400000000000000004",
  name: "Alda la Noire",
  username: "alda",
  avatarUrl: null,
  standing: { kind: "banned" },
  highestRole: null,
}

const ALDRIC: FoundAccount = {
  id: "1400000000000000005",
  name: "Aldric",
  username: "aldric",
  avatarUrl: null,
  standing: {
    kind: "member",
    timedOutUntil: new Date("2099-11-02T18:30:00.000Z"),
  },
  highestRole: null,
}

function listPage(overrides: Partial<AccountListPage> = {}): AccountListPage {
  return {
    kind: "page",
    accounts: [ALDIS, ALDA],
    page: 1,
    pages: 1,
    first: 1,
    last: 2,
    total: 2,
    ...overrides,
  }
}

function render(list: AccountListPage) {
  return renderToStaticMarkup(<AccountList list={list} />)
}

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function count(html: string) {
  const labelledBy = /<ul[^>]* aria-labelledby="([^"]*)"/.exec(html)?.[1]
  const label = new RegExp(`<p[^>]* id="${labelledBy}"[^>]*>([^<]*)</p>`)
  return label.exec(html)?.[1]
}

function rowLinks(html: string) {
  return Array.from(
    /<ul[^>]*>(.*?)<\/ul>/
      .exec(html)?.[1]
      ?.matchAll(/<a[^>]* href="([^"]*)"[^>]*>(.*?)<\/a>/g) ?? [],
    ([, href, content = ""]) => ({
      href,
      texts: Array.from(
        content
          .replace(/^<span[^>]*>.*?<\/span><\/span>/, "")
          .matchAll(/>([^<]+)</g),
        ([, part]) => part
      ),
    })
  )
}

test("the list shows the ranks of the page it shows out of the total, as an overline that names the list", () => {
  const html = render(
    listPage({ first: 26, last: 50, total: 312, pages: 13, page: 2 })
  )

  expect(count(html)).toBe("26–50 sur 312")
})

test("the ranks and the total read as French numbers do", () => {
  const html = render(
    listPage({ first: 1001, last: 1025, total: 1234, pages: 50, page: 41 })
  )

  expect(count(html)).toBe("1 001–1 025 sur 1 234")
})

test("a page of a single account gives its rank alone", () => {
  const html = render(
    listPage({
      accounts: [ALDIS],
      first: 312,
      last: 312,
      total: 312,
      pages: 13,
      page: 13,
    })
  )

  expect(count(html)).toBe("312 sur 312")
})

test("each account links to its record, beside its name, its username and its standing", () => {
  expect(
    rowLinks(render(listPage({ accounts: [ALDIS, ALDA, ALDRIC] })))
  ).toEqual([
    {
      href: "/records/1400000000000000001",
      texts: ["Aldis", "@aldis", "Membre du serveur"],
    },
    {
      href: "/records/1400000000000000004",
      texts: ["Alda la Noire", "@alda", "Compte banni"],
    },
    {
      href: "/records/1400000000000000005",
      texts: ["Aldric", "@aldric", "Exclu jusqu’au ", "2 nov. 2099, 19:30"],
    },
  ])
})

test("a member who has a role shows the badge of their highest role in place of « Membre du serveur »", () => {
  const guard = { name: "Garde de Blancherive", color: "#2ecc71" }

  expect(
    rowLinks(render(listPage({ accounts: [{ ...ALDIS, highestRole: guard }] })))
  ).toEqual([
    {
      href: "/records/1400000000000000001",
      texts: ["Aldis", "@aldis", "Garde de Blancherive"],
    },
  ])
})

test("a timed-out member who has a role shows the badge of their role and the end of their timeout, side by side, the role first", () => {
  const html = render(
    listPage({
      accounts: [{ ...ALDRIC, highestRole: { name: "Garde", color: null } }],
    })
  )

  expect(rowLinks(html)).toEqual([
    {
      href: "/records/1400000000000000005",
      texts: [
        "Aldric",
        "@aldric",
        "Garde",
        "Exclu jusqu’au ",
        "2 nov. 2099, 19:30",
      ],
    },
  ])
  expect(text(html).split("Heures de Paris.")).toHaveLength(2)
})

test("a banned account shows « Compte banni » and a member with no role « Membre du serveur », a timed-out one with no role the end of their timeout alone", () => {
  expect(
    rowLinks(render(listPage({ accounts: [ALDA, ALDIS, ALDRIC] }))).map(
      ({ texts }) => texts.slice(2)
    )
  ).toEqual([
    ["Compte banni"],
    ["Membre du serveur"],
    ["Exclu jusqu’au ", "2 nov. 2099, 19:30"],
  ])
})

test("the dot of a role's badge is hidden from assistive technologies and takes the color of the role, a role with no color drawing it neutral", () => {
  const html = render(
    listPage({
      accounts: [
        { ...ALDIS, highestRole: { name: "Garde", color: "#e67e22" } },
        {
          ...ALDIS,
          id: "1400000000000000006",
          highestRole: { name: "Citoyen", color: null },
        },
      ],
    })
  )

  const dots = Array.from(
    html.matchAll(/<span([^>]*)><\/span>/g),
    ([, attributes = ""]) => ({
      hidden: /\saria-hidden="true"/.test(attributes),
      style: /\sstyle="([^"]*)"/.exec(attributes)?.[1] ?? null,
    })
  )
  expect(dots).toEqual([
    { hidden: true, style: "background-color:#e67e22" },
    { hidden: true, style: null },
  ])
})

test("the dates of the accounts shown are said once to be Paris time, when a member shown is timed out", () => {
  const timedOut = render(
    listPage({ accounts: [ALDRIC, { ...ALDRIC, id: "1400000000000000006" }] })
  )

  expect(text(timedOut).split("Heures de Paris.")).toHaveLength(2)
  expect(text(render(listPage()))).not.toContain("Heures de Paris.")
})

test("below the list, the navigation between the pages names the page it shows", () => {
  const html = render(
    listPage({ page: 2, pages: 3, first: 26, last: 50, total: 61 })
  )

  expect(/<\/ul>.*<nav[^>]* aria-label="Pages des comptes"/.test(html)).toBe(
    true
  )
  expect(html).toContain(' aria-current="page"')
  expect(html).toContain('href="/records?page=3"')
  expect(html).not.toContain("précise ta recherche")
})

test("a single page of accounts has no navigation between pages", () => {
  expect(render(listPage())).not.toContain("<nav")
})

test("a list with no account says so in the frame of an empty list, with no overline and no navigation", () => {
  const html = render(
    listPage({ accounts: [], first: 0, last: 0, total: 0, pages: 1 })
  )

  expect(text(html)).toBe("Aucun compte à afficher.")
  expect(html).not.toContain("<ul")
  expect(html).not.toContain("<nav")
})
