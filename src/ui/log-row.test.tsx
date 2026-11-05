import { Timer, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LogRow } from "@/ui/log-row"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function renderRow(date = new Date("2026-12-02T10:00:00.000Z")) {
  return renderToStaticMarkup(
    <LogRow
      date={date}
      Icon={Timer}
      tileClassName="text-warning"
      trailing={<span>aldis</span>}
    >
      <p>Exclusion temporaire</p>
      <p>Compte : Lyra</p>
    </LogRow>
  )
}

test("a line shows its time in Paris alone, whose dateTime keeps the full moment", () => {
  expect(renderRow()).toContain(
    '<time dateTime="2026-12-02T10:00:00.000Z">11:00</time>'
  )
})

test("a line shows the icon it is given in a tile, hidden from assistive technologies", () => {
  const [, attributes = "", icon] =
    /<span([^>]*)><svg[^>]*>(.*?)<\/svg><\/span>/.exec(renderRow()) ?? []

  expect(icon).toBe(drawing(Timer))
  expect(attributes).toContain('aria-hidden="true"')
})

test("a line gives its time, its icon, what it says and its trailing cell, in that order", () => {
  const html = renderRow()
  const positions = [
    html.indexOf("<time"),
    html.indexOf("<svg"),
    html.indexOf("Exclusion temporaire"),
    html.indexOf("aldis"),
  ]

  expect(positions).not.toContain(-1)
  expect(positions).toEqual([...positions].sort((a, b) => a - b))
})

test("what a line says sits in a block of its own, and its trailing cell in another", () => {
  expect(renderRow()).toMatch(
    /<div[^>]*><p>Exclusion temporaire<\/p><p>Compte : Lyra<\/p><\/div><div[^>]*><span>aldis<\/span><\/div><\/li>$/
  )
})
