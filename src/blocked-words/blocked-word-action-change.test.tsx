import { Check, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { Dialog } from "@/ui/dialog"
import { allowedActionIds } from "./blocked-word-action"
import {
  BlockedWordActionChange,
  type ActionChangeFields,
} from "./blocked-word-action-change"

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function render(fields: ActionChangeFields) {
  return renderToStaticMarkup(
    <Dialog>
      <BlockedWordActionChange {...fields} />
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

function choice(html: string) {
  const [, attributes = "", options = ""] =
    /<select([^>]*)>(.*?)<\/select>/.exec(html) ?? []
  return {
    id: /\sid="([^"]*)"/.exec(attributes)?.[1],
    name: /\sname="([^"]*)"/.exec(attributes)?.[1],
    form: /\sform="([^"]*)"/.exec(attributes)?.[1],
    options: Array.from(
      options.matchAll(/<option([^>]*)>([^<]*)<\/option>/g),
      ([, optionAttributes = "", label]) => ({
        value: /\svalue="([^"]*)"/.exec(optionAttributes)?.[1],
        label,
        selected: /\sselected=""/.test(optionAttributes),
      })
    ),
  }
}

const FIELDS = {
  formId: "change-action-form-4",
  selectId: "change-action-4",
  word: "free nitro",
  actions: allowedActionIds({ opensModeration: true }),
  current: "timeout-1h",
} as const

test("the dialog is titled for the word, and offers its action as a label over a native choice that belongs to the word's form", () => {
  const html = render(FIELDS)

  expect(/<h2[^>]*>([^<]*)<\/h2>/.exec(html)?.[1]).toBe(
    "Changer l’action de « free nitro »"
  )
  expect(/<label[^>]*\sfor="([^"]*)"[^>]*>([^<]*)<\/label>/.exec(html)).toEqual(
    expect.arrayContaining(["change-action-4", "Action"])
  )
  expect(choice(html)).toMatchObject({
    id: "change-action-4",
    name: "action",
    form: "change-action-form-4",
  })
})

test("the choice stands on the word's current action, and offers every action the staff member may use, and no other", () => {
  expect(choice(render(FIELDS)).options).toEqual([
    { value: "block", label: "Bloquer seulement", selected: false },
    { value: "timeout-1h", label: "Exclusion 1 heure", selected: true },
    { value: "timeout-1d", label: "Exclusion 1 jour", selected: false },
  ])
  expect(
    choice(
      render({ ...FIELDS, actions: ["block", "timeout-1d"], current: "block" })
    ).options
  ).toEqual([
    { value: "block", label: "Bloquer seulement", selected: true },
    { value: "timeout-1d", label: "Exclusion 1 jour", selected: false },
  ])
})

test("the dialog offers « Annuler », then « Changer » after a hidden check, which sends the word's form", () => {
  const html = render(FIELDS)

  expect(buttons(html)).toEqual([
    {
      icon: undefined,
      iconHidden: false,
      text: "Annuler",
      type: "button",
      form: undefined,
    },
    {
      icon: drawing(Check),
      iconHidden: true,
      text: "Changer",
      type: "submit",
      form: "change-action-form-4",
    },
  ])
})
