import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LogFrame } from "@/ui/log-frame"

test("a log's frame gives its filters first, in a block of their own, then what follows", () => {
  const html = renderToStaticMarkup(
    <LogFrame filters={<nav id="filters" />}>
      <section id="day" />
      <p id="pagination" />
    </LogFrame>
  )

  expect(html.indexOf('id="filters"')).toBeGreaterThan(-1)
  expect(html.indexOf('id="day"')).toBeGreaterThan(html.indexOf('id="filters"'))
  expect(html.indexOf('id="pagination"')).toBeGreaterThan(
    html.indexOf('id="day"')
  )
  expect(html).toMatch(/<div[^>]*><div[^>]*><nav id="filters"><\/nav><\/div>/)
})
