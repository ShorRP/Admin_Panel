import { CircleAlert, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { RecordSanctions } from "./record-sanctions"
import type { SanctionOptions } from "./sanction-options"
import type { SanctionResult } from "./sanction-result"

const LYRA_ID = "1400000000000000003"

const MEMBER: SanctionOptions = {
  kind: "member",
  userId: LYRA_ID,
  name: "Lyra des Brumes",
  timeout: { kind: "open", timedOutUntil: null },
  ban: false,
}

function render({
  options,
  state = null,
  pending = false,
}: {
  options: SanctionOptions
  state?: SanctionResult | null
  pending?: boolean
}) {
  return renderToStaticMarkup(
    <RecordSanctions
      options={options}
      state={state}
      pending={pending}
      action={() => {}}
    />
  )
}

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function headings(html: string, level: "h2" | "h3") {
  return Array.from(
    html.matchAll(new RegExp(`<${level}[^>]*>([^<]*)</${level}>`, "g")),
    ([, heading]) => heading
  )
}

function changes(html: string) {
  return Array.from(
    html.matchAll(/<input type="hidden" name="change" value="([^"]*)"\/>/g),
    ([, change]) => change
  )
}

function attributesOf(tag: string) {
  return {
    has: (name: string) =>
      new RegExp(`\\s${name}(?:="[^"]*")?[\\s/>]`).test(tag),
    get: (name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1],
  }
}

function tabs(html: string) {
  return Array.from(
    html.matchAll(/(<button[^>]*\srole="tab"[^>]*>)(.*?)<\/button>/g),
    ([, tag = "", name = ""]) => ({
      name: name.replace(/<[^>]*>/g, ""),
      selected: attributesOf(tag).get("aria-selected") === "true",
    })
  )
}

function panels(html: string) {
  const starts = Array.from(
    html.matchAll(/<div[^>]*\srole="tabpanel"[^>]*>/g),
    (match) => ({ tag: match[0], index: match.index })
  )
  const end = html.indexOf('<p role="status"')
  return starts.map(({ tag, index }, position) => ({
    hidden: attributesOf(tag).has("hidden"),
    changes: changes(html.slice(index, starts[position + 1]?.index ?? end)),
  }))
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

test("an account that is not a member, before any change, shows no sanctions", () => {
  const html = render({ options: { kind: "none" } })

  expect(html).toMatch(/^<section[^>]* hidden=""/)
  expect(html).not.toContain("<form")
})

test("a member the staff member cannot sanction shows why, once, under « Sanctions », with no form", () => {
  const html = render({
    options: {
      kind: "refused",
      reason:
        "Tu ne peux pas sanctionner ce membre : c’est le propriétaire du serveur Discord.",
    },
  })

  expect(html).not.toMatch(/^<section[^>]* hidden=""/)
  expect(headings(html, "h2")).toEqual(["Sanctions"])
  expect(text(html)).toBe(
    "SanctionsTu ne peux pas sanctionner ce membre : c’est le propriétaire du serveur Discord."
  )
  expect(html).not.toContain("<form")
})

test("a member the staff member can sanction shows the timeout's form and the kick's under two tabs, the timeout's open", () => {
  const html = render({ options: MEMBER })

  expect(headings(html, "h2")).toEqual(["Sanctions"])
  expect(headings(html, "h3")).toEqual([])
  expect(tabs(html)).toEqual([
    { name: "Exclusion temporaire", selected: true },
    { name: "Expulsion", selected: false },
  ])
  expect(panels(html)).toEqual([
    { hidden: false, changes: ["time-out"] },
    { hidden: true, changes: ["kick"] },
  ])
  expect(html).toContain(
    '<input type="hidden" name="userId" value="1400000000000000003"/>'
  )
})

test("a timed-out member's record says until when under the timeout's tab, and offers to lift it before a new timeout", () => {
  const html = render({
    options: {
      ...MEMBER,
      timeout: {
        kind: "open",
        timedOutUntil: new Date("2099-11-02T18:30:00.000Z"),
      },
    },
  })

  expect(panels(html)).toEqual([
    { hidden: false, changes: ["lift", "time-out"] },
    { hidden: true, changes: ["kick"] },
  ])
  expect(text(html)).toContain(
    "Exclusion temporaire en coursJusqu’au 2 nov. 2099, 19:30"
  )
  expect(html).toContain('<time dateTime="2099-11-02T18:30:00.000Z">')
})

test("a member who cannot be timed out shows why, once, under the timeout's tab, and the kick's form under its own", () => {
  const reason =
    "Ce membre a la permission Administrateur : Discord ne l’exclut jamais temporairement."
  const html = render({
    options: { ...MEMBER, timeout: { kind: "refused", reason } },
  })

  expect(tabs(html).map(({ name }) => name)).toEqual([
    "Exclusion temporaire",
    "Expulsion",
  ])
  expect(text(html).split(reason)).toHaveLength(2)
  expect(panels(html)).toEqual([
    { hidden: false, changes: [] },
    { hidden: true, changes: ["kick"] },
  ])
})

test("a staff member who bans also finds the ban's form, with the direct message, under a third tab", () => {
  const html = render({ options: { ...MEMBER, ban: true } })

  expect(tabs(html)).toEqual([
    { name: "Exclusion temporaire", selected: true },
    { name: "Expulsion", selected: false },
    { name: "Bannissement", selected: false },
  ])
  expect(panels(html)).toEqual([
    { hidden: false, changes: ["time-out"] },
    { hidden: true, changes: ["kick"] },
    { hidden: true, changes: ["ban"] },
  ])
  expect(html.match(/Prévenir en message privé/g)).toHaveLength(3)
})

test("an account absent from the Discord server offers only the ban, with no tabs and no direct message, after the mockup's sentence", () => {
  const html = render({
    options: { kind: "absent", userId: LYRA_ID, name: "Lyra des Brumes" },
  })

  expect(html).not.toMatch(/^<section[^>]* hidden=""/)
  expect(html).not.toContain('role="tablist"')
  expect(changes(html)).toEqual(["ban"])
  expect(text(html)).toContain(
    "Ce compte n’est pas membre du serveur Discord : seul un bannissement reste possible, pour l’empêcher d’y revenir."
  )
  expect(html).not.toContain("Prévenir en message privé")
})

test("a banned account says that a ban has no end, then offers only to lift it, with no tabs", () => {
  const html = render({ options: { kind: "banned", userId: LYRA_ID } })

  expect(html).not.toContain('role="tablist"')
  expect(text(html)).toContain(
    "Compte banniUn bannissement n’a pas de fin : seul le staff peut le lever."
  )
  expect(changes(html)).toEqual(["lift-ban"])
})

test("the card holds one pair of regions, after the tabs", () => {
  const html = render({ options: { ...MEMBER, ban: true } })

  expect(html.match(/role="status"/g)).toHaveLength(1)
  expect(html.match(/role="alert"/g)).toHaveLength(1)
  expect(html.indexOf('<p role="status"')).toBeGreaterThan(
    html.lastIndexOf('role="tabpanel"')
  )
})

test("a kick that landed hides « Sanctions », since the account it removed offers no sanction", () => {
  const html = render({
    options: { kind: "none" },
    state: {
      ok: true,
      message: "L’expulsion de Lyra a eu lieu. Le message privé est parti.",
    },
  })

  expect(html).toMatch(/^<section[^>]* hidden=""/)
  expect(html).not.toContain("<form")
})

test("a change that lands leaves both regions empty, since a toast says so", () => {
  const html = render({
    options: MEMBER,
    state: {
      ok: true,
      message:
        "L’exclusion temporaire de Lyra est levée. Le message privé est parti.",
    },
  })

  expect(region(html, "status")).toEqual({ icon: undefined, text: "" })
  expect(region(html, "alert")).toEqual({ icon: undefined, text: "" })
})

test("a refused change shows its message in the alert region, which the fields point to", () => {
  const html = render({
    options: MEMBER,
    state: {
      ok: false,
      message: "Saisis un motif.",
      change: "kick",
      reason: "",
      notify: true,
    },
  })

  expect(html).toMatch(/<p role="alert"[^>]* id="sanction-error"/)
  expect(region(html, "alert")).toEqual({
    icon: drawing(CircleAlert),
    text: "Saisis un motif.",
  })
  expect(region(html, "status").text).toBe("")
})

test("while a change is sent, every button that sends one, or asks to confirm one, is disabled, the tabs still open, and the status region says so", () => {
  const html = render({
    options: {
      ...MEMBER,
      timeout: {
        kind: "open",
        timedOutUntil: new Date("2099-11-02T18:30:00.000Z"),
      },
      ban: true,
    },
    pending: true,
  })

  expect(
    Array.from(html.matchAll(/<button([^>]*)>/g), ([, tag = ""]) => ({
      role: attributesOf(tag).get("role"),
      submits: attributesOf(tag).get("type") === "submit",
      confirms: attributesOf(tag).get("aria-haspopup") === "dialog",
      disabled: attributesOf(tag).has("disabled"),
    }))
  ).toEqual([
    { role: "tab", submits: false, confirms: false, disabled: false },
    { role: "tab", submits: false, confirms: false, disabled: false },
    { role: "tab", submits: false, confirms: false, disabled: false },
    { role: undefined, submits: true, confirms: false, disabled: true },
    { role: undefined, submits: true, confirms: false, disabled: true },
    { role: undefined, submits: false, confirms: true, disabled: true },
    { role: undefined, submits: false, confirms: true, disabled: true },
  ])
  expect(region(html, "status")).toEqual({
    icon: undefined,
    text: "Envoi en cours…",
  })
})
