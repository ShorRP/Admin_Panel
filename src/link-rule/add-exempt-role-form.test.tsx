import { CircleAlert, LoaderCircle, Plus, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AddExemptRoleForm } from "./add-exempt-role-form"
import type { RoleChoice } from "./read-link-rule"
import type { RoleFields, WriteResult } from "./write-result"

const ROLES: RoleChoice[] = [
  { id: "11", name: "Modérateur" },
  { id: "12", name: "Garde" },
]

function render(
  state: WriteResult<RoleFields> | null,
  pending = false,
  roles = ROLES
) {
  return renderToStaticMarkup(
    <AddExemptRoleForm
      roles={roles}
      state={state}
      pending={pending}
      action={() => {}}
    />
  )
}

function select(html: string) {
  return /<select[^>]*name="role"[^>]*>(.*?)<\/select>/.exec(html)
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

test("before any write, the form shows its labelled choice of roles, a first choice that asks for one, « Ajouter » after a hidden plus, and its alert region empty", () => {
  const html = render(null)

  expect(html).toMatch(
    /<label[^>]* for="exempt-role"[^>]*>Ajouter un rôle<\/label>/
  )
  expect(select(html)?.[0]).toContain('id="exempt-role"')
  expect(options(html)).toEqual([
    { value: "", selected: true, text: "Choisir un rôle" },
    { value: "11", selected: false, text: "Modérateur" },
    { value: "12", selected: false, text: "Garde" },
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

  expect(select(html)?.[0]).toContain('aria-describedby="exempt-role-error"')
  expect(html).toMatch(/<p role="alert"[^>]* id="exempt-role-error"/)
})

test("a refused role shows its message in the alert region, after a hidden alert icon, and stays chosen", () => {
  const html = render({
    ok: false,
    message: "« Garde » est déjà un rôle exempté.",
    role: "12",
  })

  expect(alert(html)).toEqual({
    icon: drawing(CircleAlert),
    text: "« Garde » est déjà un rôle exempté.",
  })
  expect(options(html).find(({ selected }) => selected)).toEqual({
    value: "12",
    selected: true,
    text: "Garde",
  })
})

test("after a write that landed, the first choice is back and the alert region is empty", () => {
  const html = render({ ok: true, message: "Fait." })

  expect(options(html).filter(({ selected }) => selected)).toEqual([
    { value: "", selected: true, text: "Choisir un rôle" },
  ])
  expect(alert(html)).toEqual({ icon: undefined, text: "" })
})

test("a role's name is escaped in its choice", () => {
  const html = render(null, false, [{ id: "13", name: '"><script>' }])

  expect(html).not.toContain('"><script>')
  expect(options(html)[1]).toMatchObject({
    value: "13",
    text: "&quot;&gt;&lt;script&gt;",
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

test("with no role left to choose, the choice says so and the choice and the button are disabled", () => {
  const html = render(null, false, [])

  expect(options(html)).toEqual([
    { value: "", selected: true, text: "Aucun autre rôle" },
  ])
  expect(select(html)?.[0]).toMatch(/\sdisabled=""/)
  expect(button(html).disabled).toBe(true)
})
