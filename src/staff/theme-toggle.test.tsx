import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"

import type { Theme } from "@/ui/theme"
import { ThemeToggle } from "./theme-toggle"

const CHOICES = [
  { name: "Auto", Icon: Monitor },
  { name: "Clair", Icon: Sun },
  { name: "Sombre", Icon: Moon },
] as const

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function toggle(html: string) {
  const group = /^<div([^>]*)>(.*)<\/div>$/.exec(html)
  const attributes = group?.[1] ?? ""
  return {
    role: /\srole="([^"]*)"/.exec(attributes)?.[1],
    name: /\saria-label="([^"]*)"/.exec(attributes)?.[1],
    buttons: Array.from(
      (group?.[2] ?? "").matchAll(
        /<button([^>]*)><svg([^>]*)>(.*?)<\/svg>(.*?)<\/button>/g
      ),
      ([, buttonAttributes = "", iconAttributes = "", icon, content]) => ({
        type: /\stype="([^"]*)"/.exec(buttonAttributes)?.[1],
        pressed: /\saria-pressed="([^"]*)"/.exec(buttonAttributes)?.[1],
        icon,
        iconHidden: /\saria-hidden="true"/.test(iconAttributes),
        content,
      })
    ),
  }
}

function render(theme: Theme, { iconOnly = false } = {}) {
  return toggle(
    renderToStaticMarkup(
      <ThemeToggle theme={theme} onChoose={() => {}} iconOnly={iconOnly} />
    )
  )
}

describe.each([
  ["system", "Auto"],
  ["light", "Clair"],
  ["dark", "Sombre"],
] as const)("on %s", (theme, chosen) => {
  test(`the theme toggle groups « Auto », « Clair » and « Sombre » under « Thème », each after its hidden icon, and presses « ${chosen} » alone`, () => {
    expect(render(theme)).toEqual({
      role: "group",
      name: "Thème",
      buttons: CHOICES.map(({ name, Icon }) => ({
        type: "button",
        pressed: String(name === chosen),
        icon: drawing(Icon),
        iconHidden: true,
        content: name,
      })),
    })
  })
})

test("with its icons alone, the theme toggle leaves « Auto », « Clair » and « Sombre » to assistive technologies alone", () => {
  expect(
    render("dark", { iconOnly: true }).buttons.map(({ pressed, content }) => ({
      pressed,
      content,
    }))
  ).toEqual([
    { pressed: "false", content: '<span class="sr-only">Auto</span>' },
    { pressed: "false", content: '<span class="sr-only">Clair</span>' },
    { pressed: "true", content: '<span class="sr-only">Sombre</span>' },
  ])
})
