import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AuditLogSkeleton } from "./audit-log-skeleton"

function status(html: string) {
  return {
    isStatus: /^<\w+ role="status"/.test(html),
    text: html.replace(/<[^>]*>/g, ""),
    srOnlyText: /<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1],
  }
}

test("the audit log's skeleton is a status that says, to assistive technologies alone, that it is loading", () => {
  expect(status(renderToStaticMarkup(<AuditLogSkeleton />))).toEqual({
    isStatus: true,
    text: "Chargement du journal d’audit…",
    srOnlyText: "Chargement du journal d’audit…",
  })
})
