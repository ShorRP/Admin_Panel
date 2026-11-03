import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { StaffMemberIdentity } from "./staff-member-identity"

function texts(html: string) {
  return Array.from(
    html.matchAll(/>([^<]+)</g),
    ([, text = ""]) => text
  ).filter((text) => text.trim() !== "")
}

test("a staff member shows as their name, after their initials", () => {
  expect(
    texts(
      renderToStaticMarkup(
        <StaffMemberIdentity
          name="Brynja la Rouge"
          staffRole="Staff"
          avatarUrl={null}
        />
      )
    )
  ).toEqual(["BL", "Brynja la Rouge"])
})

test("a staff member's identity carries their name and what they are in a title, which the rail shows in place of the name", () => {
  const html = renderToStaticMarkup(
    <StaffMemberIdentity
      name="Brynja la Rouge"
      staffRole="Staff · Modération"
      avatarUrl={null}
    />
  )

  expect(/^<div[^>]*\stitle="([^"]*)"/.exec(html)?.[1]).toBe(
    "Brynja la Rouge · Staff · Modération"
  )
})
