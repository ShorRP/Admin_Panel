import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { FoundAccounts } from "./found-accounts"
import type { FoundAccount } from "./search-accounts"

const ALDIS: FoundAccount = {
  id: "1400000000000000001",
  name: "Aldis",
  username: "aldis",
  avatarUrl:
    "https://cdn.discordapp.com/avatars/1400000000000000001/0a1b2c3d4e5f60718293a4b5c6d7e8f9.webp?size=64",
  standing: { kind: "member", timedOutUntil: null },
}

const ALDA: FoundAccount = {
  id: "1400000000000000004",
  name: "Alda la Noire",
  username: "alda",
  avatarUrl: null,
  standing: { kind: "banned" },
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
}

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function links(html: string) {
  return Array.from(
    html.matchAll(/<a[^>]* href="([^"]*)"[^>]*>(.*?)<\/a>/g),
    ([, href, content = ""]) => {
      const [, avatar = "", rest = "", chevron = ""] =
        /^(<span[^>]*>.*?<\/span><\/span>)(.*)(<svg[^>]*>.*<\/svg>)$/.exec(
          content
        ) ?? []
      return {
        href,
        avatarHidden: /^<span[^>]*\saria-hidden="true"/.test(avatar),
        chevronHidden: /^<svg[^>]*\saria-hidden="true"/.test(chevron),
        texts: Array.from(rest.matchAll(/>([^<]+)</g), ([, part]) => part),
      }
    }
  )
}

function list(html: string) {
  const labelledBy = /<ul[^>]* aria-labelledby="([^"]*)"/.exec(html)?.[1]
  const label = new RegExp(`<p[^>]* id="${labelledBy}"[^>]*>([^<]*)</p>`)
  return label.exec(html)?.[1]
}

function search(accounts: FoundAccount[], truncated = false) {
  return renderToStaticMarkup(
    <FoundAccounts
      search={{ kind: "accounts", query: "ald", accounts, truncated }}
    />
  )
}

test("each account found links to its record, its avatar and its chevron hidden from assistive technologies, beside its name, its username and its standing", () => {
  expect(links(search([ALDIS, ALDA, ALDRIC]))).toEqual([
    {
      href: "/records/1400000000000000001",
      avatarHidden: true,
      chevronHidden: true,
      texts: ["Aldis", "@aldis", "Membre du serveur"],
    },
    {
      href: "/records/1400000000000000004",
      avatarHidden: true,
      chevronHidden: true,
      texts: ["Alda la Noire", "@alda", "Compte banni"],
    },
    {
      href: "/records/1400000000000000005",
      avatarHidden: true,
      chevronHidden: true,
      texts: ["Aldric", "@aldric", "Exclu jusqu’au ", "2 nov. 2099, 19:30"],
    },
  ])
  expect(text(search([ALDIS]))).not.toContain("précise ta recherche")
})

test("the accounts found sit in a list named by their count and what was searched", () => {
  expect(list(search([ALDIS]))).toBe("1 compte commence par « ald »")
  expect(list(search([ALDIS, ALDA]))).toBe("2 comptes commencent par « ald »")
})

test("the dates of the accounts found are said once to be Paris time, when one is timed out", () => {
  const html = search([ALDRIC, { ...ALDRIC, id: "1400000000000000006" }])

  expect(text(html).split("Heures de Paris.")).toHaveLength(2)
  expect(text(search([ALDIS, ALDA]))).not.toContain("Heures de Paris.")
})

test("a search that left accounts out says so", () => {
  expect(text(search([ALDIS], true))).toContain(
    "Seuls les 25 premiers comptes s’affichent : précise ta recherche."
  )
})

test("a search that found nothing says so, naming what was searched", () => {
  expect(text(search([]))).toBe(
    "Aucun membre ni banni dont le nom commence par « ald »."
  )
})

test("no search shows nothing", () => {
  expect(
    renderToStaticMarkup(<FoundAccounts search={{ kind: "none" }} />)
  ).toBe("")
})
