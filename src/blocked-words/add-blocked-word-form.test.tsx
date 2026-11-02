import { CircleAlert, LoaderCircle, Plus, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AddBlockedWordForm } from "./add-blocked-word-form"
import type { BlockedWordActionId } from "./blocked-word-action"
import type { WriteResult } from "./write-result"

function render(
  state: WriteResult | null,
  pending = false,
  actions: BlockedWordActionId[] = ["block", "timeout-1h", "timeout-1d"]
) {
  return renderToStaticMarkup(
    <AddBlockedWordForm
      state={state}
      pending={pending}
      actions={actions}
      action={() => {}}
    />
  )
}

function region(html: string, role: "status" | "alert") {
  const content =
    new RegExp(`<p role="${role}"[^>]*>(.*?)</p>`).exec(html)?.[1] ?? ""
  const [, iconAttributes = "", iconDrawing] =
    /<svg([^>]*)>(.*?)<\/svg>/.exec(content) ?? []
  return {
    icon: iconDrawing,
    iconHidden: /\saria-hidden="true"/.test(iconAttributes),
    text: content.replace(/<[^>]*>/g, ""),
  }
}

const EMPTY = { icon: undefined, iconHidden: false, text: "" }

function failureMessage(text: string) {
  return { icon: drawing(CircleAlert), iconHidden: true, text }
}

function field(html: string) {
  return /<input[^>]*name="word"[^>]*>/.exec(html)?.[0] ?? ""
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

test("before any write, the form shows its labelled field with an example for its placeholder, « Ajouter » after a hidden plus, and its alert region empty, with no status region", () => {
  const html = render(null)

  expect(html).toMatch(
    /<label[^>]* for="blocked-word"[^>]*>Ajouter un mot ou une expression<\/label>/
  )
  expect(field(html)).toContain('id="blocked-word"')
  expect(field(html)).toContain('value=""')
  expect(field(html)).toContain('placeholder="Ex. : free nitro"')
  expect(button(html)).toEqual({
    icon: drawing(Plus),
    iconHidden: true,
    text: "Ajouter",
    disabled: false,
  })
  expect(region(html, "alert")).toEqual(EMPTY)
  expect(html).not.toContain('role="status"')
})

test("the field points to the alert region, and leaves validation to the panel", () => {
  const html = render(null)

  expect(field(html)).toContain('aria-describedby="blocked-word-error"')
  expect(html).toMatch(/<p role="alert"[^>]* id="blocked-word-error"/)
  expect(field(html)).not.toMatch(/required|maxlength|pattern/i)
})

test("a refused word shows its message in the alert region, after a hidden alert icon, and stays in the field", () => {
  const html = render({
    ok: false,
    message: "« merde » est déjà un mot interdit.",
    word: "Merde",
    action: "timeout-1d",
  })

  expect(region(html, "alert")).toEqual(
    failureMessage("« merde » est déjà un mot interdit.")
  )
  expect(field(html)).toContain('value="Merde"')
})

test("a word added leaves the field empty and the form without its message, since a toast says so", () => {
  const html = render({
    ok: true,
    message: "« foo » est maintenant un mot interdit.",
  })

  expect(html).not.toContain("est maintenant un mot interdit.")
  expect(region(html, "alert")).toEqual(EMPTY)
  expect(field(html)).toContain('value=""')
})

test("while the word is being added, a hidden spinner takes the plus's place, and the button reads « Ajout… » and is disabled", () => {
  expect(button(render(null, true))).toEqual({
    icon: drawing(LoaderCircle),
    iconHidden: true,
    text: "Ajout…",
    disabled: true,
  })
})

function actionSelect(html: string) {
  const [, attributes = "", options = ""] =
    /<select([^>]*)>(.*?)<\/select>/.exec(html) ?? []
  return {
    id: /\sid="([^"]*)"/.exec(attributes)?.[1],
    name: /\sname="([^"]*)"/.exec(attributes)?.[1],
    describedBy: /\saria-describedby="([^"]*)"/.exec(attributes)?.[1],
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

function chosen(html: string) {
  return actionSelect(html).options.filter(({ selected }) => selected)
}

test("the form shows a labelled native choice of action, with the action that only blocks chosen, that the alert region describes", () => {
  const html = render(null)
  const select = actionSelect(html)

  expect(html).toMatch(
    new RegExp(`<label[^>]* for="${select.id}"[^>]*>Action</label>`)
  )
  expect(select).toEqual({
    id: select.id,
    name: "action",
    describedBy: "blocked-word-error",
    options: [
      { value: "block", label: "Bloquer seulement", selected: true },
      { value: "timeout-1h", label: "Exclusion 1 heure", selected: false },
      { value: "timeout-1d", label: "Exclusion 1 jour", selected: false },
    ],
  })
})

test("the choice offers only the actions it is given, so a staff member who does not moderate sees the action that only blocks alone", () => {
  expect(actionSelect(render(null, false, ["block"])).options).toEqual([
    { value: "block", label: "Bloquer seulement", selected: true },
  ])
})

test("a refused word leaves the action as it was sent, and a word added brings back the action that only blocks", () => {
  const refused = render({
    ok: false,
    message: "Choisis une action.",
    word: "foo",
    action: "timeout-1h",
  })
  const added = render({
    ok: true,
    message: "« foo » est maintenant un mot interdit.",
  })

  expect(chosen(refused)).toEqual([
    { value: "timeout-1h", label: "Exclusion 1 heure", selected: true },
  ])
  expect(chosen(added)).toEqual([
    { value: "block", label: "Bloquer seulement", selected: true },
  ])
})
