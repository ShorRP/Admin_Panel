import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { StaffMemberNameSkeleton } from "./staff-member-name-skeleton"

function status(html: string) {
  return {
    isStatus: /^<\w+ role="status"/.test(html),
    text: html.replace(/<[^>]*>/g, ""),
    srOnlyText: /<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1],
  }
}

test("the staff member's name's skeleton is a status that says, to assistive technologies alone, that it is loading", () => {
  expect(status(renderToStaticMarkup(<StaffMemberNameSkeleton />))).toEqual({
    isStatus: true,
    text: "Chargement de ton nom…",
    srOnlyText: "Chargement de ton nom…",
  })
})
