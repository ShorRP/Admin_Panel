import { CircleAlert, X, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BlockedWordList } from "./blocked-word-list"
import type { FilteredBlockedWords } from "./filter-blocked-words"
import type { WriteResult } from "./write-result"

function render(
  words: string[],
  state: WriteResult | null = null,
  pending = false
) {
  return renderList({ query: null, words }, state, pending)
}

function renderFiltered(query: string, words: string[], total: number) {
  return renderList({ query, words, total }, null, false)
}

function renderList(
  blockedWords: FilteredBlockedWords,
  state: WriteResult | null,
  pending: boolean
) {
  return renderToStaticMarkup(
    <BlockedWordList
      blockedWords={blockedWords}
      state={state}
      pending={pending}
      action={() => {}}
    />
  )
}

function showAll(html: string) {
  return Array.from(
    html.matchAll(/<a([^>]*)>([^<]*)<\/a>/g),
    ([, attributes = "", text]) => ({
      text,
      href: /\shref="([^"]*)"/.exec(attributes)?.[1],
    })
  ).filter(({ text }) => text === "Tout afficher")
}

function filterField(html: string) {
  const field = /<input[^>]*\sname="query"[^>]*>/.exec(html)?.[0] ?? ""
  return /\svalue="([^"]*)"/.exec(field)?.[1]
}

function region(html: string, role: "status" | "alert") {
  const content =
    new RegExp(`<p role="${role}"[^>]*>(.*?)</p>`).exec(html)?.[1] ?? ""
  const [, iconAttributes = "", iconDrawing] =
    /<svg([^>]*)>(.*?)<\/svg>/.exec(content) ?? []
  return {
    icon: iconDrawing,
    iconHidden: /\saria-hidden="true"/.test(iconAttributes),
    text: content.replace(/<[^>]*>/g, ""),
  }
}

const EMPTY = { icon: undefined, iconHidden: false, text: "" }

function failureMessage(text: string) {
  return { icon: drawing(CircleAlert), iconHidden: true, text }
}

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function heading(html: string) {
  const [, title, after = ""] =
    /<h2[^>]*>(.*?)<\/h2>(?:<p[^>]*>(.*?)<\/p>)?/.exec(html) ?? []
  return { title, count: after === "" ? undefined : after }
}

function tiles(html: string) {
  return Array.from(
    html.matchAll(/<li([^>]*)><span[^>]*>(.*?)<\/span>(.*?)<\/li>/g),
    ([, attributes = "", text, rest = ""]) => ({
      title: /\stitle="([^"]*)"/.exec(attributes)?.[1],
      text,
      word: /<input[^>]*type="hidden"[^>]*name="word"[^>]*value="([^"]*)"/.exec(
        rest
      )?.[1],
      buttons: Array.from(
        rest.matchAll(
          /(<button[^>]*>)<svg([^>]*)>(.*?)<\/svg>(.*?)<\/button>/g
        ),
        ([, tag = "", iconAttributes = "", iconDrawing, content = ""]) => ({
          icon: iconDrawing,
          iconHidden: /\saria-hidden="true"/.test(iconAttributes),
          srOnlyName: /^<span class="sr-only">([^<]*)<\/span>$/.exec(
            content
          )?.[1],
          disabled: /\sdisabled=""/.test(tag),
        })
      ),
    })
  )
}

function tile(word: string, disabled = false) {
  return {
    title: word,
    text: word,
    word,
    buttons: [
      {
        icon: drawing(X),
        iconHidden: true,
        srOnlyName: `Retirer « ${word} »`,
        disabled,
      },
    ],
  }
}

test("each blocked word is a tile under « La liste » and its count, that holds it whole in its title and removes it through a hidden cross named for assistive technologies alone", () => {
  const html = render(["abricot", "zèbre"])

  expect(heading(html)).toEqual({
    title: "La liste",
    count: "2 mots interdits",
  })
  expect(tiles(html)).toEqual([tile("abricot"), tile("zèbre")])
})

test("a single blocked word is counted in the singular", () => {
  expect(heading(render(["foo"])).count).toBe("1 mot interdit")
})

test("an empty list says so in one sentence in place of the count, and keeps both regions", () => {
  const html = render([])

  expect(heading(html)).toEqual({ title: "La liste", count: undefined })
  expect(html).toContain("Aucun mot interdit pour l’instant.")
  expect(tiles(html)).toEqual([])
  expect(region(html, "status")).toEqual(EMPTY)
  expect(region(html, "alert")).toEqual(EMPTY)
})

test("while a removal is pending, every cross is disabled and the status reads « Retrait en cours… », with no icon", () => {
  const html = render(["abricot", "zèbre"], null, true)

  expect(tiles(html)).toEqual([tile("abricot", true), tile("zèbre", true)])
  expect(region(html, "status")).toEqual({
    ...EMPTY,
    text: "Retrait en cours…",
  })
})

test("a removal that lands leaves both regions empty, since a toast says so, and a failed one's message shows in the alert region after a hidden alert icon", () => {
  const removed = render(["zèbre"], {
    ok: true,
    message: "« abricot » n’est plus un mot interdit.",
  })
  const failed = render(["abricot"], {
    ok: false,
    message: "Discord n’a pas répondu.",
    word: "abricot",
  })

  expect(region(removed, "status")).toEqual(EMPTY)
  expect(region(removed, "alert")).toEqual(EMPTY)
  expect(region(failed, "status")).toEqual(EMPTY)
  expect(region(failed, "alert")).toEqual(
    failureMessage("Discord n’a pas répondu.")
  )
})

test("with a filter, the list shows the blocked words that pass it, counted « k sur N », its field holds the text searched, and « Tout afficher » leads back to the whole list", () => {
  const html = renderFiltered("nitro", ["Free Nitro", "nitro gratuit"], 5)

  expect(heading(html)).toEqual({ title: "La liste", count: "2 sur 5" })
  expect(tiles(html)).toEqual([tile("Free Nitro"), tile("nitro gratuit")])
  expect(filterField(html)).toBe("nitro")
  expect(showAll(html)).toEqual([
    { text: "Tout afficher", href: "/blocked-words" },
  ])
})

test("without a filter, the list holds an empty filter field and no « Tout afficher »", () => {
  const html = render(["abricot", "zèbre"])

  expect(filterField(html)).toBe("")
  expect(showAll(html)).toEqual([])
})

test("a filter that no blocked word passes says so in place of the tiles, counted « 0 sur N »", () => {
  const html = renderFiltered("xyz", [], 3)

  expect(heading(html)).toEqual({ title: "La liste", count: "0 sur 3" })
  expect(tiles(html)).toEqual([])
  expect(html).toContain("Aucun mot interdit ne contient « xyz ».")
  expect(html).not.toContain("Aucun mot interdit pour l’instant.")
  expect(showAll(html)).toHaveLength(1)
})

test("a filter on an empty list counts « 0 sur 0 » and says that no blocked word contains the text searched", () => {
  const html = renderFiltered("xyz", [], 0)

  expect(heading(html)).toEqual({ title: "La liste", count: "0 sur 0" })
  expect(html).toContain("Aucun mot interdit ne contient « xyz ».")
  expect(html).not.toContain("Aucun mot interdit pour l’instant.")
  expect(showAll(html)).toHaveLength(1)
})
