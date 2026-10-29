import { TriangleAlert, UserX, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { Dialog } from "@/ui/dialog"
import { KickConfirmation, KickForm } from "./kick-form"
import type { SanctionResult } from "./sanction-result"

const LYRA_ID = "1400000000000000003"

function render({
  state = null,
  pending = false,
}: {
  state?: SanctionResult | null
  pending?: boolean
} = {}) {
  return renderToStaticMarkup(
    <KickForm
      userId={LYRA_ID}
      name="Lyra des Brumes"
      state={state}
      pending={pending}
      action={() => {}}
    />
  )
}

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function buttons(html: string) {
  return Array.from(
    html.matchAll(
      /(<button[^>]*>)(?:<svg([^>]*)>(.*?)<\/svg>)?(.*?)<\/button>/g
    ),
    ([, tag = "", iconAttributes = "", iconDrawing, text]) => ({
      icon: iconDrawing,
      iconHidden: /\saria-hidden="true"/.test(iconAttributes),
      text,
      type: /\stype="([^"]*)"/.exec(tag)?.[1],
      opensDialog: /\saria-haspopup="dialog"/.test(tag),
      form: /\sform="([^"]*)"/.exec(tag)?.[1],
      disabled: /\sdisabled=""/.test(tag),
    })
  )
}

function button(html: string) {
  const [first] = buttons(html)
  if (first === undefined) {
    throw new Error("The markup holds no button.")
  }
  return first
}

function formId(html: string) {
  return /<form[^>]*\sid="([^"]*)"/.exec(html)?.[1]
}

function confirmation(name: string) {
  return renderToStaticMarkup(
    <Dialog>
      <KickConfirmation name={name} />
    </Dialog>
  )
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
  return /<textarea[^>]*id="kick-reason"[^>]*>([^<]*)<\/textarea>/.exec(
    html
  )?.[1]
}

function notify(html: string) {
  return /<input type="checkbox"([^>]*)\/>/.exec(html)?.[1] ?? ""
}

function sentence(html: string) {
  return /<form[^>]*>(?:<input[^>]*\/>)*<p[^>]*>([^<]*)<\/p>/.exec(html)?.[1]
}

function placeholder(html: string) {
  return /<textarea[^>]*\splaceholder="([^"]*)"/.exec(html)?.[1]
}

test("a kick says that the account can come back through an invite, and asks for the reason as the member will read it", () => {
  const html = render()

  expect(sentence(html)).toBe(
    "Le compte quitte le serveur Discord et peut le rejoindre à nouveau par une invitation."
  )
  expect(placeholder(html)).toBe("Écris le motif tel que le membre le lira.")
})

test("a member can be kicked with a labelled reason and the direct message checked", () => {
  const html = render()

  expect(html.match(/<form/g)).toHaveLength(1)
  expect(hiddenFields(html)).toEqual({ change: "kick", userId: LYRA_ID })
  expect(html).toMatch(
    /<label[^>]* for="kick-reason"[^>]*>Motif de l’expulsion<\/label>/
  )
  expect(reason(html)).toBe("")
  expect(notify(html)).toContain('name="notify"')
  expect(notify(html)).toMatch(/\schecked=""/)
  expect(html).toMatch(
    /<label[^>]*><input type="checkbox"[^>]*\/>Prévenir en message privé<\/label>/
  )
  expect(buttons(html)).toEqual([
    {
      icon: drawing(UserX),
      iconHidden: true,
      text: "Expulser",
      type: "button",
      opensDialog: true,
      form: undefined,
      disabled: false,
    },
  ])
})

test("the kick's confirmation asks whether to kick the account, by its name, behind a hidden warning icon, says what a kick does, then offers « Annuler », then « Expulser », which sends the kick's form", () => {
  const html = confirmation("Lyra des Brumes")

  expect(/<h2[^>]*>([^<]*)<\/h2>/.exec(html)?.[1]).toBe(
    "Expulser Lyra des Brumes ?"
  )
  expect(/<p[^>]*>([^<]*)<\/p>/.exec(html)?.[1]).toBe(
    "Le compte quitte le serveur Discord tout de suite. Il pourra revenir par une invitation."
  )
  const [warning = ""] = /<svg[^>]*>.*?<\/svg>/.exec(html) ?? []
  expect(warning).toContain(drawing(TriangleAlert))
  expect(warning).toMatch(/\saria-hidden="true"/)
  expect(formId(render())).toBeDefined()
  expect(buttons(html)).toEqual([
    {
      icon: undefined,
      iconHidden: false,
      text: "Annuler",
      type: "button",
      opensDialog: false,
      form: undefined,
      disabled: false,
    },
    {
      icon: drawing(UserX),
      iconHidden: true,
      text: "Expulser",
      type: "submit",
      opensDialog: false,
      form: formId(render()),
      disabled: false,
    },
  ])
})

test("every field points to the alert region of the sanctions, and leaves validation to the panel", () => {
  const fields = Array.from(
    render().matchAll(/<(?:input|textarea)(?![^>]*type="hidden")[^>]*>/g),
    ([field]) => field
  )

  expect(fields).toHaveLength(2)
  for (const field of fields) {
    expect(field).toContain('aria-describedby="sanction-error"')
    expect(field).not.toMatch(/required|maxlength|pattern/i)
  }
})

test("a refused kick keeps its reason and the choice of the direct message", () => {
  const html = render({
    state: {
      ok: false,
      message: "Saisis un motif.",
      change: "kick",
      reason: "  ",
      notify: false,
    },
  })

  expect(reason(html)).toBe("  ")
  expect(notify(html)).not.toMatch(/\schecked=""/)
})

test("a refused timeout leaves the kick form as it starts", () => {
  const html = render({
    state: {
      ok: false,
      message: "Saisis un motif.",
      change: "time-out",
      reason: "Spam",
      duration: "60",
      notify: false,
    },
  })

  expect(reason(html)).toBe("")
  expect(notify(html)).toMatch(/\schecked=""/)
})

test("while a change is sent, the kick's button is disabled", () => {
  expect(button(render({ pending: true })).disabled).toBe(true)
})
