import { CircleAlert, LoaderCircle, Plus, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AddExemptChannelForm } from "./add-exempt-channel-form"
import type { ChannelChoiceGroup } from "./exemptable-channel"
import type { ChannelFields, WriteResult } from "./write-result"

const GROUPS: ChannelChoiceGroup[] = [
  {
    id: null,
    label: null,
    choices: [{ id: "11", name: "galerie", category: false }],
  },
  {
    id: "12",
    label: "Jeux",
    choices: [
      { id: "12", name: "Jeux", category: true },
      { id: "13", name: "tournois", category: false },
    ],
  },
]

function render(
  state: WriteResult<ChannelFields> | null,
  pending = false,
  groups = GROUPS
) {
  return renderToStaticMarkup(
    <AddExemptChannelForm
      groups={groups}
      state={state}
      pending={pending}
      action={() => {}}
    />
  )
}

function select(html: string) {
  return /<select[^>]*name="channel"[^>]*>(.*?)<\/select>/.exec(html)
}

function choices(html: string) {
  return Array.from(
    (select(html)?.[1] ?? "").matchAll(
      /<(optgroup|option)([^>]*)>(?:([^<]*)<\/option>)?|<\/optgroup>/g
    ),
    ([tag, kind, attributes = "", text]) => ({
      kind: kind ?? (tag === "</optgroup>" ? "end" : tag),
      group: /\slabel="([^"]*)"/.exec(attributes)?.[1],
      value: /\svalue="([^"]*)"/.exec(attributes)?.[1],
      selected: /\sselected=""/.test(attributes),
      text,
    })
  )
}

function layout(html: string) {
  return choices(html).map(({ kind, group, value, selected, text }) => {
    if (kind === "optgroup") {
      return { group }
    }
    if (kind === "end") {
      return "end"
    }
    return { value, selected, text }
  })
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

test("before any write, the form shows its labelled choice of channels, a first choice that asks for one, the channels with no category, then each category as a group that opens with the category itself, « Ajouter » after a hidden plus, and its alert region empty", () => {
  const html = render(null)

  expect(html).toMatch(
    /<label[^>]* for="exempt-channel"[^>]*>Ajouter un salon<\/label>/
  )
  expect(select(html)?.[0]).toContain('id="exempt-channel"')
  expect(layout(html)).toEqual([
    { value: "", selected: true, text: "Choisir un salon" },
    { value: "11", selected: false, text: "#galerie" },
    { group: "Jeux" },
    { value: "12", selected: false, text: "Jeux (catégorie)" },
    { value: "13", selected: false, text: "#tournois" },
    "end",
  ])
  expect(button(html)).toEqual({
    icon: drawing(Plus),
    iconHidden: true,
    text: "Ajouter",
    disabled: false,
  })
  expect(alert(html)).toEqual({ icon: undefined, text: "" })
})

test("the choice points to the alert region", () => {
  const html = render(null)

  expect(select(html)?.[0]).toContain('aria-describedby="exempt-channel-error"')
  expect(html).toMatch(/<p role="alert"[^>]* id="exempt-channel-error"/)
})

test("a refused channel shows its message in the alert region, after a hidden alert icon, and stays chosen, inside its group too", () => {
  const html = render({
    ok: false,
    message: "« #tournois » est déjà un salon exempté.",
    channel: "13",
  })

  expect(alert(html)).toEqual({
    icon: drawing(CircleAlert),
    text: "« #tournois » est déjà un salon exempté.",
  })
  expect(choices(html).filter(({ selected }) => selected)).toEqual([
    expect.objectContaining({ value: "13", text: "#tournois" }),
  ])
})

test("after a write that landed, the first choice is back and the alert region is empty", () => {
  const html = render({ ok: true, message: "Fait." })

  expect(choices(html).filter(({ selected }) => selected)).toEqual([
    expect.objectContaining({ value: "", text: "Choisir un salon" }),
  ])
  expect(alert(html)).toEqual({ icon: undefined, text: "" })
})

test("a channel's and a category's names are escaped in the choice and in its groups", () => {
  const html = render(null, false, [
    {
      id: "14",
      label: '"><script>',
      choices: [{ id: "14", name: '"><script>', category: false }],
    },
  ])

  expect(html).not.toContain('"><script>')
  expect(layout(html)[1]).toEqual({ group: "&quot;&gt;&lt;script&gt;" })
  expect(layout(html)[2]).toMatchObject({
    value: "14",
    text: "#&quot;&gt;&lt;script&gt;",
  })
})

test("while the write is pending, the button reads « Ajout… » after a hidden spinner and is disabled", () => {
  expect(button(render(null, true))).toEqual({
    icon: drawing(LoaderCircle),
    iconHidden: true,
    text: "Ajout…",
    disabled: true,
  })
})

test("with no channel left to choose, the choice says so and the choice and the button are disabled", () => {
  const html = render(null, false, [])

  expect(
    choices(html).map(({ value, selected, text }) => ({
      value,
      selected,
      text,
    }))
  ).toEqual([{ value: "", selected: true, text: "Aucun autre salon" }])
  expect(select(html)?.[0]).toMatch(/\sdisabled=""/)
  expect(button(html).disabled).toBe(true)
})
