import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AccountLink } from "@/ui/account-link"

function tags(html: string) {
  return Array.from(
    html.matchAll(/<(a|div)([^>]*)>(.*)<\/\1>/g),
    ([, tag, attributes, content]) => ({
      tag,
      href: /\shref="([^"]*)"/.exec(attributes ?? "")?.[1],
      content,
    })
  )
}

test("what an account's avatar and name sit in is a link to the href it is given", () => {
  expect(
    tags(
      renderToStaticMarkup(
        <AccountLink href="/records/1400000000000000001">
          <span>Aldis</span>
        </AccountLink>
      )
    )
  ).toEqual([
    {
      tag: "a",
      href: "/records/1400000000000000001",
      content: "<span>Aldis</span>",
    },
  ])
})

test("given no href, it is no link and keeps its content", () => {
  expect(
    tags(
      renderToStaticMarkup(
        <AccountLink href={null}>
          <span>AutoMod</span>
        </AccountLink>
      )
    )
  ).toEqual([{ tag: "div", href: undefined, content: "<span>AutoMod</span>" }])
})
