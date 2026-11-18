import { Check, CircleAlert, LoaderCircle, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { ChangeAlertChannelForm } from "./change-alert-channel-form"
import type { ChannelChoiceGroup } from "./exemptable-channel"
import type { LinkRuleAlert } from "./read-link-rule"
import type { ChannelFields, WriteResult } from "./write-result"

const GROUPS: ChannelChoiceGroup[] = [
  {
    id: null,
    label: null,
    choices: [{ id: "21", name: "alertes", category: false }],
  },
  {
    id: "22",
    label: "Jeux",
    choices: [{ id: "23", name: "tournois", category: false }],
  },
]

function render(
  state: WriteResult<ChannelFields> | null,
  alert: LinkRuleAlert = { kind: "none" },
  pending = false,
  groups = GROUPS
) {
  return renderToStaticMarkup(
    <ChangeAlertChannelForm
      groups={groups}
      alert={alert}
      state={state}
      pending={pending}
      action={() => {}}
    />
  )
}

function select(html: string) {
  return /<select[^>]*name="channel"[^>]*>(.*?)<\/select>/.exec(html)
}

function options(html: string) {
  return Array.from(
    (select(html)?.[1] ?? "").matchAll(
      /<(optgroup)[^>]*label="([^"]*)"[^>]*>|<option([^>]*)>([^<]*)<\/option>/g
    ),
    ([, group, label, attributes = "", text]) =>
      group === undefined
        ? {
            value: /value="([^"]*)"/.exec(attributes)?.[1],
            selected: /\sselected=""/.test(attributes),
            text,
          }
        : { group: label }
  )
}

function chosen(html: string) {
  return options(html).filter(
    (option) => "selected" in option && option.selected
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

test("with no alert channel, the form shows its labelled choice, « Aucun salon d’alerte » first and chosen, then the text channels by group of category, and « Changer » after a hidden check, its alert region empty", () => {
  const html = render(null)

  expect(html).toMatch(
    /<label[^>]* for="link-rule-alert-channel"[^>]*>Changer le salon d’alerte<\/label>/
  )
  expect(select(html)?.[0]).toContain('id="link-rule-alert-channel"')
  expect(options(html)).toEqual([
    { value: "", selected: true, text: "Aucun salon d’alerte" },
    { value: "21", selected: false, text: "#alertes" },
    { group: "Jeux" },
    { value: "23", selected: false, text: "#tournois" },
  ])
  expect(button(html)).toEqual({
    icon: drawing(Check),
    iconHidden: true,
    text: "Changer",
    disabled: false,
  })
  expect(alert(html)).toEqual({ icon: undefined, text: "" })
})

test("the channel the rule alerts is chosen among the channels offered", () => {
  const html = render(null, { kind: "channel", id: "23", name: "tournois" })

  expect(chosen(html)).toEqual([
    { value: "23", selected: true, text: "#tournois" },
  ])
})

test("a channel the rule alerts that the choice does not offer, one that Discord no longer lists or a voice channel, is the choice's first after « Aucun salon d’alerte », chosen, so that « Changer » never removes it unasked", () => {
  const gone = render(null, {
    kind: "channel",
    id: "1500000000000000999",
    name: null,
  })
  const voice = render(null, { kind: "channel", id: "40", name: "vocal" })

  expect(options(gone).slice(0, 2)).toEqual([
    { value: "", selected: false, text: "Aucun salon d’alerte" },
    {
      value: "1500000000000000999",
      selected: true,
      text: "Salon introuvable (1500000000000000999)",
    },
  ])
  expect(options(voice).slice(0, 2)).toEqual([
    { value: "", selected: false, text: "Aucun salon d’alerte" },
    { value: "40", selected: true, text: "#vocal" },
  ])
})

test("the choice points to the alert region", () => {
  const html = render(null)

  expect(select(html)?.[0]).toContain(
    'aria-describedby="link-rule-alert-channel-error"'
  )
  expect(html).toMatch(
    /<p role="alert"[^>]* id="link-rule-alert-channel-error"/
  )
})

test("a refused choice shows its message in the alert region, after a hidden alert icon, and the channel asked for stays chosen", () => {
  const html = render(
    {
      ok: false,
      message: "Le panel ne trouve plus ce salon.",
      channel: "23",
    },
    { kind: "channel", id: "21", name: "alertes" }
  )

  expect(alert(html)).toEqual({
    icon: drawing(CircleAlert),
    text: "Le panel ne trouve plus ce salon.",
  })
  expect(chosen(html)).toEqual([
    { value: "23", selected: true, text: "#tournois" },
  ])
})

test("a refused removal keeps « Aucun salon d’alerte » chosen, and a channel that the choice does not hold, typed in a forged form, leaves the rule's own chosen", () => {
  const removal = render(
    { ok: false, message: "Refusé.", channel: "" },
    { kind: "channel", id: "21", name: "alertes" }
  )
  const forged = render(
    { ok: false, message: "Refusé.", channel: "99" },
    { kind: "channel", id: "21", name: "alertes" }
  )

  expect(chosen(removal)).toEqual([
    { value: "", selected: true, text: "Aucun salon d’alerte" },
  ])
  expect(chosen(forged)).toEqual([
    { value: "21", selected: true, text: "#alertes" },
  ])
})

test("after a write that landed, the rule's own alert channel is chosen and the alert region is empty", () => {
  const html = render(
    { ok: true, message: "Fait." },
    { kind: "channel", id: "21", name: "alertes" }
  )

  expect(chosen(html)).toEqual([
    { value: "21", selected: true, text: "#alertes" },
  ])
  expect(alert(html)).toEqual({ icon: undefined, text: "" })
})

test("while the write is pending, the button reads « Changement… » after a hidden spinner and is disabled", () => {
  expect(button(render(null, { kind: "none" }, true))).toEqual({
    icon: drawing(LoaderCircle),
    iconHidden: true,
    text: "Changement…",
    disabled: true,
  })
})

test("with no channel to choose, the choice holds « Aucun salon d’alerte » alone", () => {
  expect(options(render(null, { kind: "none" }, false, []))).toEqual([
    { value: "", selected: true, text: "Aucun salon d’alerte" },
  ])
})
