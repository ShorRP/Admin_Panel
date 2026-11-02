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
        <StaffMemberIdentity name="Brynja la Rouge" avatarUrl={null} />
      )
    )
  ).toEqual(["BL", "Brynja la Rouge"])
})
