import { CircleAlert, X, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { ExemptRoleList } from "./exempt-role-list"
import type { NamedItem } from "./read-link-rule"
import type { RoleFields, WriteResult } from "./write-result"

const STAFF = { id: "10", name: "Staff" }

const GUARD = { id: "12", name: "Garde" }

function render(
  roles: NamedItem[],
  state: WriteResult<RoleFields> | null = null,
  pending = false
) {
  return renderToStaticMarkup(
    <ExemptRoleList
      roles={roles}
      staffRoleId={STAFF.id}
      state={state}
      pending={pending}
      action={() => {}}
    />
  )
}

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function region(html: string, role: "status" | "alert") {
  const content =
    new RegExp(`<p role="${role}"[^>]*>(.*?)</p>`).exec(html)?.[1] ?? ""
  return {
    icon: /<svg[^>]*>(.*?)<\/svg>/.exec(content)?.[1],
    text: content.replace(/<[^>]*>/g, ""),
  }
}

function chips(html: string) {
  return Array.from(
    html.matchAll(/<li[^>]*>(.*?)<\/li>/g),
    ([, chip = ""]) => ({
      name: /^<span[^>]*>([^<]*)<\/span>/.exec(chip)?.[1],
      sent: /<input[^>]*type="hidden"[^>]*name="role"[^>]*value="([^"]*)"/.exec(
        chip
      )?.[1],
      cross: /<button[^>]*>(?:<svg([^>]*)>(.*?)<\/svg>)(.*?)<\/button>/
        .exec(chip)
        ?.slice(1),
      disabled: /<button[^>]*\sdisabled=""/.test(chip),
    })
  )
}

function chip(item: { id: string; name: string }, disabled = false) {
  return {
    name: item.name,
    sent: item.id,
    cross: [
      expect.stringContaining('aria-hidden="true"'),
      drawing(X),
      `<span class="sr-only">Retirer « ${item.name} »</span>`,
    ],
    disabled,
  }
}

const STAFF_CHIP = {
  name: "Staff",
  sent: undefined,
  cross: undefined,
  disabled: false,
}

const EMPTY = { icon: undefined, text: "" }

test("each exempt role is a chip with a cross that sends its ID, whose hidden icon leaves it the name « Retirer « rôle » » for assistive technologies, but the staff role, which has none", () => {
  const html = render([STAFF, GUARD])

  expect(chips(html)).toEqual([STAFF_CHIP, chip(GUARD)])
})

test("the cross submits at once: it asks for no confirmation, since adding the role back undoes it", () => {
  const html = render([STAFF, GUARD])

  expect(html).toMatch(/<button[^>]*type="submit"/)
  expect(html).not.toContain("aria-haspopup")
})

test("a role that Discord no longer lists shows as « Rôle supprimé » and keeps its cross, which sends its ID", () => {
  const html = render([STAFF, { id: "99", name: null }])

  expect(chips(html)).toEqual([
    STAFF_CHIP,
    chip({ id: "99", name: "Rôle supprimé" }),
  ])
})

test("a role name is escaped in the chip and in the cross's name", () => {
  const html = render([STAFF, { id: "13", name: '"><script>' }])

  expect(html).not.toContain('"><script>')
  expect(chips(html)[1]).toEqual(
    chip({ id: "13", name: "&quot;&gt;&lt;script&gt;" })
  )
})

test("the staff role has no cross wherever it stands in the list, and a rule that does not exempt it draws no chip for it", () => {
  expect(chips(render([GUARD, STAFF]))).toEqual([chip(GUARD), STAFF_CHIP])
  expect(chips(render([GUARD]))).toEqual([chip(GUARD)])
})

test("with no exempt role the list draws no list", () => {
  const html = render([])

  expect(html).not.toContain("<ul")
  expect(chips(html)).toEqual([])
})

test("with nothing written, the status and alert regions are empty", () => {
  const html = render([STAFF, GUARD])

  expect(region(html, "status")).toEqual(EMPTY)
  expect(region(html, "alert")).toEqual(EMPTY)
})

test("while a write is pending, every cross is disabled and the status region reads « Envoi en cours… »", () => {
  const html = render([STAFF, GUARD], null, true)

  expect(chips(html)).toEqual([STAFF_CHIP, chip(GUARD, true)])
  expect(region(html, "status")).toEqual({
    icon: undefined,
    text: "Envoi en cours…",
  })
})

test("a refused removal shows its message in the alert region, after a hidden alert icon", () => {
  const html = render([STAFF, GUARD], {
    ok: false,
    message: "La règle des liens n’existe pas encore.",
    role: "12",
  })

  expect(region(html, "alert")).toEqual({
    icon: drawing(CircleAlert),
    text: "La règle des liens n’existe pas encore.",
  })
})
