import { Check, CircleAlert, LoaderCircle, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { ChangeLinkRuleActionForm } from "./change-link-rule-action-form"
import type { LinkRuleActionId } from "./link-rule-action"
import type { ActionFields, WriteResult } from "./write-result"

const ALL: LinkRuleActionId[] = ["block", "timeout-1h", "timeout-1d"]

function render(
  state: WriteResult<ActionFields> | null,
  pending = false,
  current: LinkRuleActionId = "block"
) {
  return renderToStaticMarkup(
    <ChangeLinkRuleActionForm
      choices={ALL}
      current={current}
      state={state}
      pending={pending}
      action={() => {}}
    />
  )
}

function select(html: string) {
  return /<select[^>]*name="action"[^>]*>(.*?)<\/select>/.exec(html)
}

function options(html: string) {
  return Array.from(
    (select(html)?.[1] ?? "").matchAll(/<option([^>]*)>([^<]*)<\/option>/g),
    ([, attributes = "", text]) => ({
      value: /value="([^"]*)"/.exec(attributes)?.[1],
      selected: /\sselected=""/.test(attributes),
      text,
    })
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

function alert(html: string) {
  const content = /<p role="alert"[^>]*>(.*?)<\/p>/.exec(html)?.[1] ?? ""
  return {
    icon: /<svg[^>]*>(.*?)<\/svg>/.exec(content)?.[1],
    text: content.replace(/<[^>]*>/g, ""),
  }
}

test("before any write, the form shows its labelled choice of the three actions with the rule's own chosen, « Changer » after a hidden check, and its alert region empty", () => {
  const html = render(null, false, "timeout-1h")

  expect(html).toMatch(
    /<label[^>]* for="link-rule-action-choice"[^>]*>Changer l’action<\/label>/
  )
  expect(select(html)?.[0]).toContain('id="link-rule-action-choice"')
  expect(options(html)).toEqual([
    { value: "block", selected: false, text: "Bloquer seulement" },
    { value: "timeout-1h", selected: true, text: "Exclusion 1 heure" },
    { value: "timeout-1d", selected: false, text: "Exclusion 1 jour" },
  ])
  expect(button(html)).toEqual({
    icon: drawing(Check),
    iconHidden: true,
    text: "Changer",
    disabled: false,
  })
  expect(alert(html)).toEqual({ icon: undefined, text: "" })
})

test("the choice points to the alert region", () => {
  const html = render(null)

  expect(select(html)?.[0]).toContain(
    'aria-describedby="link-rule-action-choice-error"'
  )
  expect(html).toMatch(
    /<p role="alert"[^>]* id="link-rule-action-choice-error"/
  )
})

test("a refused change shows its message in the alert region, after a hidden alert icon, and the action asked for stays chosen", () => {
  const html = render({
    ok: false,
    message:
      "La règle des liens n’existe pas encore : active-la d’abord, puis change l’action.",
    action: "timeout-1d",
  })

  expect(alert(html)).toEqual({
    icon: drawing(CircleAlert),
    text: "La règle des liens n’existe pas encore : active-la d’abord, puis change l’action.",
  })
  expect(options(html).filter(({ selected }) => selected)).toEqual([
    { value: "timeout-1d", selected: true, text: "Exclusion 1 jour" },
  ])
})

test("an action that the choice does not hold, typed in a forged form, leaves the rule's own chosen", () => {
  const html = render(
    { ok: false, message: "Choisis une action.", action: "kick" },
    false,
    "timeout-1h"
  )

  expect(options(html).filter(({ selected }) => selected)).toEqual([
    { value: "timeout-1h", selected: true, text: "Exclusion 1 heure" },
  ])
})

test("after a write that landed, the rule's own action is chosen and the alert region is empty", () => {
  const html = render({ ok: true, message: "Fait." }, false, "timeout-1d")

  expect(options(html).filter(({ selected }) => selected)).toEqual([
    { value: "timeout-1d", selected: true, text: "Exclusion 1 jour" },
  ])
  expect(alert(html)).toEqual({ icon: undefined, text: "" })
})

test("while the write is pending, the button reads « Changement… » after a hidden spinner and is disabled", () => {
  expect(button(render(null, true))).toEqual({
    icon: drawing(LoaderCircle),
    iconHidden: true,
    text: "Changement…",
    disabled: true,
  })
})
