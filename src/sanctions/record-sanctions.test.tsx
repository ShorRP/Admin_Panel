import { CircleAlert, CircleCheck, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { RecordSanctions } from "./record-sanctions"
import type { SanctionOptions } from "./sanction-options"
import type { SanctionResult } from "./sanction-result"

const LYRA_ID = "1400000000000000003"

const OPEN: SanctionOptions = {
  kind: "open",
  userId: LYRA_ID,
  timeout: { kind: "open", timedOutUntil: null },
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

test("a member the staff member can sanction shows the timeout's forms and the kick's, each under its heading", () => {
  const html = render({ options: OPEN })

  expect(headings(html, "h2")).toEqual(["Sanctions"])
  expect(headings(html, "h3")).toEqual(["Exclusion temporaire", "Expulsion"])
  expect(changes(html)).toEqual(["time-out", "kick"])
  expect(html).toContain(
    '<input type="hidden" name="userId" value="1400000000000000003"/>'
  )
})

test("a timed-out member's record also offers to lift the timeout", () => {
  const html = render({
    options: {
      ...OPEN,
      timeout: {
        kind: "open",
        timedOutUntil: new Date("2099-11-02T18:30:00.000Z"),
      },
    },
  })

  expect(changes(html)).toEqual(["time-out", "lift", "kick"])
})

test("a member who cannot be timed out shows why, once, under « Exclusion temporaire », and the kick's form", () => {
  const reason =
    "Ce membre a la permission Administrateur : Discord ne l’exclut jamais temporairement."
  const html = render({
    options: { ...OPEN, timeout: { kind: "refused", reason } },
  })

  expect(headings(html, "h3")).toEqual(["Exclusion temporaire", "Expulsion"])
  expect(text(html).split(reason)).toHaveLength(2)
  expect(changes(html)).toEqual(["kick"])
})

test("a kick that landed keeps « Sanctions » with its message in the status region, though the account is no longer a member", () => {
  const html = render({
    options: { kind: "none" },
    state: {
      ok: true,
      message: "L’expulsion de Lyra a eu lieu. Le message privé est parti.",
    },
  })

  expect(html).not.toMatch(/^<section[^>]* hidden=""/)
  expect(headings(html, "h2")).toEqual(["Sanctions"])
  expect(region(html, "status")).toEqual({
    icon: drawing(CircleCheck),
    text: "L’expulsion de Lyra a eu lieu. Le message privé est parti.",
  })
  expect(html).not.toContain("<form")
})

test("a refused change shows its message in the alert region, which the fields point to", () => {
  const html = render({
    options: OPEN,
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

test("while a change is sent, every button is disabled and the status region says so", () => {
  const html = render({
    options: {
      ...OPEN,
      timeout: {
        kind: "open",
        timedOutUntil: new Date("2099-11-02T18:30:00.000Z"),
      },
    },
    pending: true,
  })

  expect(
    Array.from(html.matchAll(/<button([^>]*)>/g), ([, attributes]) =>
      /\sdisabled=""/.test(attributes ?? "")
    )
  ).toEqual([true, true, true])
  expect(region(html, "status")).toEqual({
    icon: undefined,
    text: "Envoi en cours…",
  })
})
