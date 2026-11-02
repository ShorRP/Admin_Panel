import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { RoleBadge } from "./role-badge"

function badge(html: string) {
  const [, dot = "", label = ""] =
    /^<span[^>]*>(<span[^>]*><\/span>)(.*)<\/span>$/.exec(html) ?? []
  return {
    dotHidden: /^<span[^>]*\saria-hidden="true"/.test(dot),
    dotStyle: /\sstyle="([^"]*)"/.exec(dot)?.[1] ?? null,
    text: label.replace(/<[^>]*>/g, ""),
  }
}

test("a role's badge names the role, after a dot hidden from assistive technologies that takes the role's color", () => {
  const html = renderToStaticMarkup(
    <RoleBadge role={{ name: "Garde de Blancherive", color: "#e67e22" }} />
  )

  expect(badge(html)).toEqual({
    dotHidden: true,
    dotStyle: "background-color:#e67e22",
    text: "Garde de Blancherive",
  })
})

test("a role with no color has a dot that sets none, so that the badge draws it neutral", () => {
  const html = renderToStaticMarkup(
    <RoleBadge role={{ name: "Citoyen", color: null }} />
  )

  expect(badge(html)).toEqual({
    dotHidden: true,
    dotStyle: null,
    text: "Citoyen",
  })
})

test("a role's name is text, so that markup in it is escaped", () => {
  const html = renderToStaticMarkup(
    <RoleBadge role={{ name: "<b>Garde</b>", color: null }} />
  )

  expect(badge(html).text).toBe("&lt;b&gt;Garde&lt;/b&gt;")
  expect(html).not.toContain("<b>")
})
