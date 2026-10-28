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
  banned: false,
}

const ALDA: FoundAccount = {
  id: "1400000000000000004",
  name: "Alda la Noire",
  username: "alda",
  avatarUrl: null,
  banned: true,
}

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function links(html: string) {
  return Array.from(
    html.matchAll(/<a[^>]* href="([^"]*)"[^>]*>(.*?)<\/a>/g),
    ([, href, content = ""]) => {
      const [, avatar = "", rest = ""] =
        /^(<span[^>]*>.*?<\/span><\/span>)(.*)$/.exec(content) ?? []
      return {
        href,
        avatarHidden: /^<span[^>]*\saria-hidden="true"/.test(avatar),
        texts: Array.from(rest.matchAll(/>([^<]+)</g), ([, part]) => part),
      }
    }
  )
}

test("each account found links to its record, its avatar hidden from assistive technologies, under its name and username, banned ones said so", () => {
  const html = renderToStaticMarkup(
    <FoundAccounts
      search={{
        kind: "accounts",
        query: "ald",
        accounts: [ALDIS, ALDA],
        truncated: false,
      }}
    />
  )

  expect(links(html)).toEqual([
    {
      href: "/records/1400000000000000001",
      avatarHidden: true,
      texts: ["Aldis", "@aldis"],
    },
    {
      href: "/records/1400000000000000004",
      avatarHidden: true,
      texts: ["Alda la Noire", "@alda", "Banni"],
    },
  ])
  expect(text(html)).not.toContain("précise ta recherche")
})

test("a search that left accounts out says so", () => {
  const html = renderToStaticMarkup(
    <FoundAccounts
      search={{
        kind: "accounts",
        query: "ald",
        accounts: [ALDIS],
        truncated: true,
      }}
    />
  )

  expect(text(html)).toContain(
    "Seuls les 25 premiers comptes s’affichent : précise ta recherche."
  )
})

test("a search that found nothing says so, naming what was searched", () => {
  const html = renderToStaticMarkup(
    <FoundAccounts
      search={{
        kind: "accounts",
        query: "ald",
        accounts: [],
        truncated: false,
      }}
    />
  )

  expect(text(html)).toBe(
    "Aucun membre ni banni dont le nom commence par « ald »."
  )
})

test("no search shows nothing", () => {
  expect(
    renderToStaticMarkup(<FoundAccounts search={{ kind: "none" }} />)
  ).toBe("")
})
