import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { StaffMemberIdentitySkeleton } from "./staff-member-identity-skeleton"

function status(html: string) {
  return {
    isStatus: /^<\w+ role="status"/.test(html),
    text: html.replace(/<[^>]*>/g, ""),
    srOnlyText: /<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1],
  }
}

test("the staff member's skeleton is a status that says, to assistive technologies alone, that it is loading", () => {
  expect(status(renderToStaticMarkup(<StaffMemberIdentitySkeleton />))).toEqual(
    {
      isStatus: true,
      text: "Chargement de ton nom…",
      srOnlyText: "Chargement de ton nom…",
    }
  )
})
