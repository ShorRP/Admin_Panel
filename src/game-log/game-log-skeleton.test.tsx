import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LogSkeleton } from "@/ui/log-skeleton"
import { Skeleton } from "@/ui/skeleton"
import { GameLogSkeleton } from "./game-log-skeleton"

function bars(html: string) {
  return html.match(/data-slot="skeleton"/g)?.length ?? 0
}

test("the game log's skeleton shows the filters' form as bars, with no field to type in, no button and no link", () => {
  const html = renderToStaticMarkup(<GameLogSkeleton />)

  expect(html).not.toMatch(/<(form|input|button|label|a)[\s>]/)
})

test("the game log's skeleton draws, over a log skeleton with no pill and no form, a bar for each of three pills, a label and a field for each of ten fields, the button that sends them and the button that folds them", () => {
  const bare = renderToStaticMarkup(
    <LogSkeleton
      loading="Chargement du journal du jeu…"
      pillWidths={[]}
      form={null}
      trailing={<Skeleton />}
    />
  )

  expect(bars(renderToStaticMarkup(<GameLogSkeleton />)) - bars(bare)).toBe(
    3 + 10 * 2 + 1 + 1
  )
})

test("the game log's skeleton is a status that says, to assistive technologies alone, that it is loading", () => {
  const html = renderToStaticMarkup(<GameLogSkeleton />)

  expect({
    isStatus: /^<\w+ role="status"/.test(html),
    text: html.replace(/<[^>]*>/g, ""),
    srOnlyText: /<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1],
  }).toEqual({
    isStatus: true,
    text: "Chargement du journal du jeu…",
    srOnlyText: "Chargement du journal du jeu…",
  })
})
