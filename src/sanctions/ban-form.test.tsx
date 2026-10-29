import { Hammer, TriangleAlert, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { Dialog } from "@/ui/dialog"
import { BanConfirmation, BanForm } from "./ban-form"
import type { SanctionResult } from "./sanction-result"

const LYRA_ID = "1400000000000000003"

function render({
  standing = "member",
  state = null,
  pending = false,
}: {
  standing?: "member" | "absent"
  state?: SanctionResult | null
  pending?: boolean
} = {}) {
  return renderToStaticMarkup(
    <BanForm
      userId={LYRA_ID}
      name="Lyra des Brumes"
      standing={standing}
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
      <BanConfirmation name={name} />
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

function sentence(html: string) {
  return /<form[^>]*>(?:<input[^>]*\/>)*<p[^>]*>([^<]*)<\/p>/.exec(html)?.[1]
}

function placeholder(html: string) {
  return /<textarea[^>]*\splaceholder="([^"]*)"/.exec(html)?.[1]
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
  expect(buttons(html)).toEqual([
    {
      icon: drawing(Hammer),
      iconHidden: true,
      text: "Bannir",
      type: "button",
      opensDialog: true,
      form: undefined,
      disabled: false,
    },
  ])
})

test("the ban's confirmation asks whether to ban the account, by its name, behind a hidden warning icon, says what a ban does, then offers « Annuler », then « Bannir », which sends the ban's form", () => {
  const html = confirmation("Lyra des Brumes")

  expect(/<h2[^>]*>([^<]*)<\/h2>/.exec(html)?.[1]).toBe(
    "Bannir Lyra des Brumes ?"
  )
  expect(/<p[^>]*>([^<]*)<\/p>/.exec(html)?.[1]).toBe(
    "Le compte ne pourra plus rejoindre le serveur Discord tant que le staff ne lève pas le bannissement."
  )
  const [warning = ""] = /<svg[^>]*>.*?<\/svg>/.exec(html) ?? []
  expect(warning).toContain(drawing(TriangleAlert))
  expect(warning).toMatch(/\saria-hidden="true"/)
  expect(formId(render())).toBeDefined()
  expect(formId(render({ standing: "absent" }))).toBe(formId(render()))
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
      icon: drawing(Hammer),
      iconHidden: true,
      text: "Bannir",
      type: "submit",
      opensDialog: false,
      form: formId(render()),
      disabled: false,
    },
  ])
})

test("a member's ban says that the account cannot come back until it is lifted, and asks for the reason as the member will read it", () => {
  const html = render()

  expect(sentence(html)).toBe(
    "Le compte quitte le serveur Discord et ne peut plus le rejoindre tant que le bannissement n’est pas levé."
  )
  expect(placeholder(html)).toBe("Écris le motif tel que le membre le lira.")
})

test("an account absent from the Discord server is banned with no direct message to offer, after saying that only a ban remains", () => {
  const html = render({ standing: "absent" })

  expect(notify(html)).toBeUndefined()
  expect(html).not.toContain("Prévenir en message privé")
  expect(sentence(html)).toBe(
    "Ce compte n’est pas membre du serveur Discord : seul un bannissement reste possible, pour l’empêcher d’y revenir."
  )
  expect(placeholder(html)).toBeUndefined()
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
