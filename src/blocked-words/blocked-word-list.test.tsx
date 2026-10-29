import { CircleAlert, X, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BlockedWordList } from "./blocked-word-list"
import type { WriteResult } from "./write-result"

function render(
  words: string[],
  state: WriteResult | null = null,
  pending = false
) {
  return renderToStaticMarkup(
    <BlockedWordList
      words={words}
      state={state}
      pending={pending}
      action={() => {}}
    />
  )
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
