import { Hammer, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { BanForm } from "./ban-form"
import type { SanctionResult } from "./sanction-result"

const LYRA_ID = "1400000000000000003"

function render({
  notifies = true,
  state = null,
  pending = false,
}: {
  notifies?: boolean
  state?: SanctionResult | null
  pending?: boolean
} = {}) {
  return renderToStaticMarkup(
    <BanForm
      userId={LYRA_ID}
      notifies={notifies}
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

function messageDeletions(html: string) {
  return Array.from(
    html.matchAll(
      /<label[^>]*><input type="radio"((?=[^>]*\sname="deleteMessages")[^>]*)\/>([^<]*)<\/label>/g
    ),
    ([, attributes = "", label]) => ({
      value: /\svalue="([^"]*)"/.exec(attributes)?.[1],
      label,
      checked: /\schecked=""/.test(attributes),
    })
  )
}

function reason(html: string) {
  return /<textarea[^>]*id="ban-reason"[^>]*>([^<]*)<\/textarea>/.exec(
    html
  )?.[1]
}

function notify(html: string) {
  return /<input type="checkbox"([^>]*)\/>/.exec(html)?.[1]
}

test("a member can be banned with the messages to delete, none by default, a labelled reason and the direct message checked", () => {
  const html = render()

  expect(html.match(/<form/g)).toHaveLength(1)
  expect(hiddenFields(html)).toEqual({ change: "ban", userId: LYRA_ID })
  expect(html).toMatch(
    /<fieldset[^>]*><legend[^>]*>Messages à supprimer<\/legend>/
  )
  expect(messageDeletions(html)).toEqual([
    { value: "0", label: "Aucun", checked: true },
    { value: "3600", label: "Dernière heure", checked: false },
    { value: "21600", label: "6 dernières heures", checked: false },
    { value: "43200", label: "12 dernières heures", checked: false },
    { value: "86400", label: "24 dernières heures", checked: false },
    { value: "259200", label: "3 derniers jours", checked: false },
    { value: "604800", label: "7 derniers jours", checked: false },
  ])
  expect(html).toMatch(
    /<label[^>]* for="ban-reason"[^>]*>Motif du bannissement<\/label>/
  )
  expect(reason(html)).toBe("")
  expect(notify(html)).toMatch(/\schecked=""/)
  expect(notify(html)).toContain('name="notify"')
  expect(html).toMatch(
    /<label[^>]*><input type="checkbox"[^>]*\/>Prévenir en message privé<\/label>/
  )
  expect(button(html)).toEqual({
    icon: drawing(Hammer),
    iconHidden: true,
    text: "Bannir",
    disabled: false,
  })
})

test("an account absent from the Discord server is banned with no direct message to offer", () => {
  const html = render({ notifies: false })

  expect(notify(html)).toBeUndefined()
  expect(html).not.toContain("Prévenir en message privé")
  expect(button(html).text).toBe("Bannir")
})

test("every field points to the alert region of the sanctions, and leaves validation to the panel", () => {
  const fields = Array.from(
    render().matchAll(/<(?:input|textarea)(?![^>]*type="hidden")[^>]*>/g),
    ([field]) => field
  )

  expect(fields).toHaveLength(9)
  for (const field of fields) {
    expect(field).toContain('aria-describedby="sanction-error"')
    expect(field).not.toMatch(/required|maxlength|pattern/i)
  }
})

test("a refused ban keeps its messages to delete, its reason and the choice of the direct message", () => {
  const html = render({
    state: {
      ok: false,
      message: "Saisis un motif.",
      change: "ban",
      reason: "  ",
      deleteMessages: "86400",
      notify: false,
    },
  })

  expect(
    messageDeletions(html)
      .filter(({ checked }) => checked)
      .map(({ value }) => value)
  ).toEqual(["86400"])
  expect(reason(html)).toBe("  ")
  expect(notify(html)).not.toMatch(/\schecked=""/)
})

test("a refused kick leaves the ban form as it starts", () => {
  const html = render({
    state: {
      ok: false,
      message: "Saisis un motif.",
      change: "kick",
      reason: "Spam",
      notify: false,
    },
  })

  expect(reason(html)).toBe("")
  expect(
    messageDeletions(html)
      .filter(({ checked }) => checked)
      .map(({ value }) => value)
  ).toEqual(["0"])
  expect(notify(html)).toMatch(/\schecked=""/)
})

test("while a change is sent, the ban's button is disabled", () => {
  expect(button(render({ pending: true })).disabled).toBe(true)
})
