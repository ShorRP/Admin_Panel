import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { FILTER_PILL_LIST_CLASSES } from "@/ui/filter-layout"
import { NO_FILTER } from "./audit-log-filters"
import { AuditLogSkeleton } from "./audit-log-skeleton"
import { AuditLogTypeFilter } from "./audit-log-type-filter"

function status(html: string) {
  return {
    isStatus: /^<\w+ role="status"/.test(html),
    text: html.replace(/<[^>]*>/g, ""),
    srOnlyText: /<span class="sr-only">([^<]*)<\/span>/.exec(html)?.[1],
  }
}

test("the audit log's skeleton shows the filter's form as bars, with no field to type in, no button and no link", () => {
  const html = renderToStaticMarkup(<AuditLogSkeleton />)

  expect(html).not.toMatch(/<(form|input|button|label|a)[\s>]/)
})

test("the audit log's skeleton draws one bar for each pill of the type filter, « Tout » included", () => {
  const pills = renderToStaticMarkup(<AuditLogTypeFilter filters={NO_FILTER} />)
  const pillList = new RegExp(
    `<div class="${FILTER_PILL_LIST_CLASSES}">(.*?)</div></div>`
  )
  const [, bars = ""] =
    pillList.exec(renderToStaticMarkup(<AuditLogSkeleton />)) ?? []

  expect(bars.match(/data-slot="skeleton"/g)).toHaveLength(
    pills.match(/<li>/g)?.length ?? 0
  )
  expect(pills.match(/<li>/g)).toHaveLength(6)
})

test("the audit log's skeleton is a status that says, to assistive technologies alone, that it is loading", () => {
  expect(status(renderToStaticMarkup(<AuditLogSkeleton />))).toEqual({
    isStatus: true,
    text: "Chargement du journal d’audit…",
    srOnlyText: "Chargement du journal d’audit…",
  })
})
