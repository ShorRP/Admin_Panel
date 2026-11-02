import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AuditLogFilterFormSkeleton } from "./audit-log-filter-form-skeleton"
import { AuditLogSkeleton } from "./audit-log-skeleton"

function bars(html: string) {
  return html.match(/data-slot="skeleton"/g)?.length ?? 0
}

test("the skeleton of the filter's form is a bar for each of its two labels, its two fields and its button, with nothing to type in", () => {
  const html = renderToStaticMarkup(<AuditLogFilterFormSkeleton />)

  expect(bars(html)).toBe(5)
  expect(html).not.toMatch(/<(form|input|button|label|a)[\s>]/)
  expect(html).not.toContain("role=")
})

test("the audit log's skeleton shows it, once", () => {
  const html = renderToStaticMarkup(<AuditLogSkeleton />)
  const form = renderToStaticMarkup(<AuditLogFilterFormSkeleton />)

  expect(html.split(form)).toHaveLength(2)
})
