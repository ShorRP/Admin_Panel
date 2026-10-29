import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { StaffMemberIdentity } from "./staff-member-identity"

function texts(html: string) {
  return Array.from(
    html.matchAll(/>([^<]+)</g),
    ([, text = ""]) => text
  ).filter((text) => text.trim() !== "")
}

test("a staff member who does not moderate shows as « Staff » under their name, after their initials", () => {
  expect(
    texts(
      renderToStaticMarkup(
        <StaffMemberIdentity
          name="Brynja la Rouge"
          avatarUrl={null}
          opensModeration={false}
        />
      )
    )
  ).toEqual(["BL", "Brynja la Rouge", "Staff"])
})

test("a staff member who moderates shows as « Staff · Modération » under their name", () => {
  expect(
    texts(
      renderToStaticMarkup(
        <StaffMemberIdentity
          name="Aldis"
          avatarUrl={null}
          opensModeration={true}
        />
      )
    )
  ).toEqual(["A", "Aldis", "Staff · Modération"])
})
