import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { RecordSanctions } from "./record-sanctions"

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

test("an account that is not a member shows no sanctions", () => {
  expect(
    renderToStaticMarkup(<RecordSanctions options={{ kind: "none" }} />)
  ).toBe("")
})

test("a member the staff member cannot sanction shows why, once, under « Sanctions », with no form", () => {
  const html = renderToStaticMarkup(
    <RecordSanctions
      options={{
        kind: "refused",
        reason:
          "Tu ne peux pas sanctionner ce membre : c’est le propriétaire du serveur Discord.",
      }}
    />
  )

  expect(/<h2[^>]*>([^<]*)<\/h2>/.exec(html)?.[1]).toBe("Sanctions")
  expect(text(html)).toBe(
    "SanctionsTu ne peux pas sanctionner ce membre : c’est le propriétaire du serveur Discord."
  )
  expect(html).not.toContain("<form")
})

test("a member the staff member can sanction shows the timeout's forms under « Sanctions »", () => {
  const html = renderToStaticMarkup(
    <RecordSanctions
      options={{
        kind: "open",
        userId: "1400000000000000003",
        timedOutUntil: null,
      }}
    />
  )

  expect(/<h2[^>]*>([^<]*)<\/h2>/.exec(html)?.[1]).toBe("Sanctions")
  expect(html).toContain(
    '<input type="hidden" name="userId" value="1400000000000000003"/>'
  )
  expect(text(html)).toContain("Exclure temporairement")
})
