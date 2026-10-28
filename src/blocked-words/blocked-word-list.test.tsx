import { CircleAlert, CircleCheck, X, type LucideIcon } from "lucide-react"
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

function successMessage(text: string) {
  return { icon: drawing(CircleCheck), iconHidden: true, text }
}

function failureMessage(text: string) {
  return { icon: drawing(CircleAlert), iconHidden: true, text }
}

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function items(html: string) {
  return Array.from(
    html.matchAll(/<li[^>]*>(.*?)<\/li>/g),
    ([, item = ""]) => ({
      word: /<input[^>]*type="hidden"[^>]*name="word"[^>]*value="([^"]*)"/.exec(
        item
      )?.[1],
      buttons: Array.from(
        item.matchAll(
          /(<button[^>]*>)(?:<svg([^>]*)>(.*?)<\/svg>)?(.*?)<\/button>/g
        ),
        ([, tag = "", iconAttributes = "", iconDrawing, text]) => ({
          icon: iconDrawing,
          iconHidden: /\saria-hidden="true"/.test(iconAttributes),
          text,
          disabled: /\sdisabled=""/.test(tag),
        })
      ),
    })
  )
}

function removeButton(disabled: boolean) {
  return { icon: drawing(X), iconHidden: true, text: "Retirer", disabled }
}

test("each blocked word comes with its own « Retirer » form, its text after a hidden cross, under the count", () => {
  const html = render(["abricot", "zèbre"])

  expect(html).toContain("2 mots interdits sur 1 000 possibles.")
  expect(items(html)).toEqual([
    { word: "abricot", buttons: [removeButton(false)] },
    { word: "zèbre", buttons: [removeButton(false)] },
  ])
  expect(html).toContain(">abricot<")
  expect(html).toContain(">zèbre<")
})

test("a single blocked word is counted in the singular", () => {
  expect(render(["foo"])).toContain("1 mot interdit sur 1 000 possibles.")
})

test("an empty list says so in one sentence, and keeps both regions", () => {
  const html = render([])

  expect(html).toContain("Aucun mot interdit pour l’instant.")
  expect(html).not.toContain("possibles")
  expect(items(html)).toEqual([])
  expect(region(html, "status")).toEqual(EMPTY)
  expect(region(html, "alert")).toEqual(EMPTY)
})

test("while a removal is pending, every « Retirer » is disabled and the status reads « Retrait en cours… », with no icon", () => {
  const html = render(["abricot", "zèbre"], null, true)

  expect(items(html).flatMap(({ buttons }) => buttons)).toEqual([
    removeButton(true),
    removeButton(true),
  ])
  expect(region(html, "status")).toEqual({
    ...EMPTY,
    text: "Retrait en cours…",
  })
})

test("a removal's message shows in the status region after a hidden check, and a failed one's in the alert region after a hidden alert icon", () => {
  const removed = render(["zèbre"], {
    ok: true,
    message: "« abricot » n’est plus un mot interdit.",
  })
  const failed = render(["abricot"], {
    ok: false,
    message: "Discord n’a pas répondu.",
    word: "abricot",
  })

  expect(region(removed, "status")).toEqual(
    successMessage("« abricot » n’est plus un mot interdit.")
  )
  expect(region(removed, "alert")).toEqual(EMPTY)
  expect(region(failed, "status")).toEqual(EMPTY)
  expect(region(failed, "alert")).toEqual(
    failureMessage("Discord n’a pas répondu.")
  )
})
