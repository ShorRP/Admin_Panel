import { Hammer, TriangleAlert, UserX, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { Dialog } from "@/ui/dialog"
import { banConfirmation, BanForm } from "./ban-form"
import { kickConfirmation, KickForm } from "./kick-form"
import {
  SanctionConfirmation,
  type Confirmation,
} from "./sanction-confirmation"

const LYRA_ID = "1400000000000000003"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function render(confirmation: Confirmation) {
  return renderToStaticMarkup(
    <Dialog>
      <SanctionConfirmation {...confirmation} />
    </Dialog>
  )
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
      form: /\sform="([^"]*)"/.exec(tag)?.[1],
    })
  )
}

function formId(html: string) {
  return /<form[^>]*\sid="([^"]*)"/.exec(html)?.[1]
}

const FORM_PROPS = {
  userId: LYRA_ID,
  name: "Lyra des Brumes",
  state: null,
  pending: false,
  action: () => {},
}

for (const {
  sanction,
  confirmation,
  forms,
  title,
  description,
  label,
  icon,
} of [
  {
    sanction: "kick",
    confirmation: kickConfirmation("Lyra des Brumes"),
    forms: [renderToStaticMarkup(<KickForm {...FORM_PROPS} />)],
    title: "Expulser Lyra des Brumes ?",
    description:
      "Le compte quitte le serveur Discord tout de suite. Il pourra revenir par une invitation.",
    label: "Expulser",
    icon: UserX,
  },
  {
    sanction: "ban",
    confirmation: banConfirmation("Lyra des Brumes"),
    forms: [
      renderToStaticMarkup(<BanForm {...FORM_PROPS} standing="member" />),
      renderToStaticMarkup(<BanForm {...FORM_PROPS} standing="absent" />),
    ],
    title: "Bannir Lyra des Brumes ?",
    description:
      "Le compte ne pourra plus rejoindre le serveur Discord tant que le staff ne lève pas le bannissement.",
    label: "Bannir",
    icon: Hammer,
  },
]) {
  test(`the ${sanction}'s confirmation asks whether to go on, by the account's name, behind a hidden warning icon, says what the ${sanction} does, then offers « Annuler », then « ${label} » with its icon, which sends the ${sanction}'s form`, () => {
    const html = render(confirmation)
    const [warning = ""] = /<svg[^>]*>.*?<\/svg>/.exec(html) ?? []

    expect(/<h2[^>]*>([^<]*)<\/h2>/.exec(html)?.[1]).toBe(title)
    expect(/<p[^>]*>([^<]*)<\/p>/.exec(html)?.[1]).toBe(description)
    expect(warning).toContain(drawing(TriangleAlert))
    expect(warning).toMatch(/\saria-hidden="true"/)
    for (const form of forms) {
      expect(formId(form)).toBeDefined()
      expect(buttons(html)).toEqual([
        {
          icon: undefined,
          iconHidden: false,
          text: "Annuler",
          type: "button",
          form: undefined,
        },
        {
          icon: drawing(icon),
          iconHidden: true,
          text: label,
          type: "submit",
          form: formId(form),
        },
      ])
    }
  })
}
