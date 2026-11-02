import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AddBlockedWordFormSkeleton } from "./add-blocked-word-form-skeleton"

test("the form's skeleton is a status that says, to assistive technologies alone, that the form is loading, and holds no field to type into", () => {
  const html = renderToStaticMarkup(<AddBlockedWordFormSkeleton />)

  expect({
    isStatus: /^<\w+ role="status"/.test(html),
    text: html.replace(/<[^>]*>/g, ""),
    srOnlyText: /<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1],
  }).toEqual({
    isStatus: true,
    text: "Chargement du formulaire…",
    srOnlyText: "Chargement du formulaire…",
  })
  expect(html).not.toMatch(/<(input|select|button|textarea)/)
})
