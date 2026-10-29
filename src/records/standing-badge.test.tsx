import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { StandingBadge } from "./standing-badge"

function badge(html: string) {
  const [, dot = "", label = ""] =
    /^<span[^>]*>(<span[^>]*><\/span>)(.*)<\/span>$/.exec(html) ?? []
  return {
    dotHidden: /^<span[^>]*\saria-hidden="true"/.test(dot),
    text: label.replace(/<[^>]*>/g, ""),
  }
}

test.each([
  [
    "a member's badge says they are on the Discord server",
    { kind: "member", timedOutUntil: null } as const,
    "Membre du serveur",
  ],
  [
    "a banned account's badge says it is banned",
    { kind: "banned" } as const,
    "Compte banni",
  ],
])(
  "%s, after a dot hidden from assistive technologies",
  (_, standing, text) => {
    expect(
      badge(renderToStaticMarkup(<StandingBadge standing={standing} />))
    ).toEqual({ dotHidden: true, text })
  }
)

test("a timed-out member's badge says until when, after a dot hidden from assistive technologies, as an absolute date with its year in Paris time", () => {
  const html = renderToStaticMarkup(
    <StandingBadge
      standing={{
        kind: "member",
        timedOutUntil: new Date("2099-11-02T18:30:00.000Z"),
      }}
    />
  )

  expect(badge(html)).toEqual({
    dotHidden: true,
    text: "Exclu jusqu’au 2 nov. 2099, 19:30",
  })
  expect(html).toContain(
    '<time dateTime="2099-11-02T18:30:00.000Z">2 nov. 2099, 19:30</time>'
  )
})
