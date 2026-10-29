import { UserCheck, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BanLiftForm } from "./ban-lift-form"
import type { SanctionResult } from "./sanction-result"

const ESKIL_ID = "1400000000000000006"

function render({
  state = null,
  pending = false,
}: {
  state?: SanctionResult | null
  pending?: boolean
} = {}) {
  return renderToStaticMarkup(
    <BanLiftForm
      userId={ESKIL_ID}
      state={state}
      pending={pending}
      action={() => {}}
    />
  )
}

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function button(html: string) {
  const [, tag = "", iconAttributes = "", iconDrawing, text] =
    /(<button[^>]*>)(?:<svg([^>]*)>(.*?)<\/svg>)?(.*?)<\/button>/.exec(html) ??
    []
  return {
    icon: iconDrawing,
    iconHidden: /\saria-hidden="true"/.test(iconAttributes),
    text,
    disabled: /\sdisabled=""/.test(tag),
  }
}

function hiddenFields(html: string) {
  return Object.fromEntries(
    Array.from(
      html.matchAll(/<input type="hidden" name="([^"]*)" value="([^"]*)"\/>/g),
      ([, name, value]) => [name, value]
    )
  )
}

function reason(html: string) {
  return /<textarea([^>]*)id="ban-lift-reason"([^>]*)>([^<]*)<\/textarea>/.exec(
    html
  )
}

test("a ban is lifted with a labelled reason, and no direct message", () => {
  const html = render()

  expect(html.match(/<form/g)).toHaveLength(1)
  expect(hiddenFields(html)).toEqual({ change: "lift-ban", userId: ESKIL_ID })
  expect(html).toMatch(
    /<label[^>]* for="ban-lift-reason"[^>]*>Motif de la levée<\/label>/
  )
  expect(reason(html)?.[3]).toBe("")
  expect(reason(html)?.[0]).toContain('aria-describedby="sanction-error"')
  expect(html).not.toContain('type="checkbox"')
  expect(button(html)).toEqual({
    icon: drawing(UserCheck),
    iconHidden: true,
    text: "Lever le bannissement",
    disabled: false,
  })
})

test("a refused lift keeps its reason, while another refused change leaves it empty", () => {
  expect(
    reason(
      render({
        state: {
          ok: false,
          message: "Saisis un motif.",
          change: "lift-ban",
          reason: "  ",
        },
      })
    )?.[3]
  ).toBe("  ")
  expect(
    reason(
      render({
        state: {
          ok: false,
          message: "Saisis un motif.",
          change: "lift",
          reason: "Erreur",
        },
      })
    )?.[3]
  ).toBe("")
})

test("while a change is sent, the lift's button is disabled", () => {
  expect(button(render({ pending: true })).disabled).toBe(true)
})
