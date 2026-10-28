import {
  CircleAlert,
  CircleCheck,
  Timer,
  TimerOff,
  type LucideIcon,
} from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { TimeoutForms } from "./timeout-forms"
import type { TimeoutResult } from "./timeout-result"

const LYRA_ID = "1400000000000000003"

const TIMED_OUT_UNTIL = new Date("2099-11-02T18:30:00.000Z")

function render({
  timedOutUntil = null,
  state = null,
  pending = false,
}: {
  timedOutUntil?: Date | null
  state?: TimeoutResult | null
  pending?: boolean
} = {}) {
  return renderToStaticMarkup(
    <TimeoutForms
      userId={LYRA_ID}
      timedOutUntil={timedOutUntil}
      state={state}
      pending={pending}
      action={() => {}}
    />
  )
}

function forms(html: string) {
  return Array.from(html.matchAll(/<form[^>]*>(.*?)<\/form>/g), ([, form]) => {
    const inside = form ?? ""
    return {
      hidden: Object.fromEntries(
        Array.from(
          inside.matchAll(
            /<input type="hidden" name="([^"]*)" value="([^"]*)"\/>/g
          ),
          ([, name, value]) => [name, value]
        )
      ),
      inside,
    }
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

function durations(html: string) {
  return Array.from(
    html.matchAll(/<label[^>]*><input type="radio"([^>]*)\/>([^<]*)<\/label>/g),
    ([, attributes = "", label]) => ({
      label,
      value: /value="([^"]*)"/.exec(attributes)?.[1],
      checked: /\schecked=""/.test(attributes),
    })
  )
}

function textarea(html: string, id: string) {
  const [, attributes = "", value] =
    new RegExp(`<textarea([^>]*id="${id}"[^>]*)>([^<]*)</textarea>`).exec(
      html
    ) ?? []
  return { attributes, value }
}

function notify(html: string) {
  return /<input type="checkbox"([^>]*)\/>/.exec(html)?.[1] ?? ""
}

function region(html: string, role: "status" | "alert") {
  const content =
    new RegExp(`<p role="${role}"[^>]*>(.*?)</p>`).exec(html)?.[1] ?? ""
  return {
    icon: /<svg[^>]*>(.*?)<\/svg>/.exec(content)?.[1],
    text: content.replace(/<[^>]*>/g, ""),
  }
}

test("a member who is not timed out can be timed out for one of seven durations, none chosen, with a labelled reason and the direct message checked, and has nothing to lift", () => {
  const html = render()

  expect(forms(html)).toHaveLength(1)
  expect(html).toMatch(/<legend[^>]*>Durée<\/legend>/)
  expect(durations(html)).toEqual([
    { label: "60 secondes", value: "60", checked: false },
    { label: "5 minutes", value: "300", checked: false },
    { label: "10 minutes", value: "600", checked: false },
    { label: "1 heure", value: "3600", checked: false },
    { label: "1 jour", value: "86400", checked: false },
    { label: "1 semaine", value: "604800", checked: false },
    { label: "28 jours", value: "2419200", checked: false },
  ])
  expect(html).toMatch(
    /<label[^>]* for="time-out-reason"[^>]*>Motif de l’exclusion temporaire<\/label>/
  )
  expect(textarea(html, "time-out-reason").value).toBe("")
  expect(notify(html)).toContain('name="notify"')
  expect(notify(html)).toMatch(/\schecked=""/)
  expect(html).toMatch(
    /<label[^>]*><input type="checkbox"[^>]*\/>Prévenir en message privé<\/label>/
  )
  expect(button(html)).toEqual({
    icon: drawing(Timer),
    iconHidden: true,
    text: "Exclure temporairement",
    disabled: false,
  })
})

test("a timed-out member can also have their timeout lifted, with a reason of its own", () => {
  const html = render({ timedOutUntil: TIMED_OUT_UNTIL })
  const [, lift] = forms(html)

  expect(forms(html)).toHaveLength(2)
  expect(html).toMatch(
    /<label[^>]* for="lift-reason"[^>]*>Motif de la levée<\/label>/
  )
  expect(textarea(html, "lift-reason").value).toBe("")
  expect(button(lift?.inside ?? "")).toEqual({
    icon: drawing(TimerOff),
    iconHidden: true,
    text: "Lever l’exclusion temporaire",
    disabled: false,
  })
})

test("each form names the member it acts on and the change it makes", () => {
  expect(
    forms(render({ timedOutUntil: TIMED_OUT_UNTIL })).map(
      ({ hidden }) => hidden
    )
  ).toEqual([
    { change: "time-out", userId: LYRA_ID },
    { change: "lift", userId: LYRA_ID },
  ])
})

test("every field points to the alert region, and leaves validation to the panel", () => {
  const html = render({ timedOutUntil: TIMED_OUT_UNTIL })
  const fields = Array.from(
    html.matchAll(/<(?:input|textarea)(?![^>]*type="hidden")[^>]*>/g),
    ([field]) => field
  )

  expect(fields).toHaveLength(10)
  for (const field of fields) {
    expect(field).toContain('aria-describedby="timeout-error"')
    expect(field).not.toMatch(/required|maxlength|pattern/i)
  }
  expect(html).toMatch(/<p role="alert"[^>]* id="timeout-error"/)
})

test("a refused timeout shows its message in the alert region, and keeps the reason, the duration and the choice of the direct message", () => {
  const html = render({
    state: {
      ok: false,
      message: "Saisis un motif.",
      change: "time-out",
      reason: "  ",
      duration: "86400",
      notify: false,
    },
  })

  expect(region(html, "alert")).toEqual({
    icon: drawing(CircleAlert),
    text: "Saisis un motif.",
  })
  expect(region(html, "status").text).toBe("")
  expect(textarea(html, "time-out-reason").value).toBe("  ")
  expect(durations(html).filter(({ checked }) => checked)).toEqual([
    { label: "1 jour", value: "86400", checked: true },
  ])
  expect(notify(html)).not.toMatch(/\schecked=""/)
})

test("a refused lift keeps its reason, and leaves the timeout form as it starts", () => {
  const html = render({
    timedOutUntil: TIMED_OUT_UNTIL,
    state: {
      ok: false,
      message: "Lyra n’est pas en exclusion temporaire.",
      change: "lift",
      reason: "Erreur de cible",
    },
  })

  expect(textarea(html, "lift-reason").value).toBe("Erreur de cible")
  expect(textarea(html, "time-out-reason").value).toBe("")
  expect(notify(html)).toMatch(/\schecked=""/)
  expect(region(html, "alert").text).toBe(
    "Lyra n’est pas en exclusion temporaire."
  )
})

test("a change that landed shows its message in the status region, and leaves the forms as they start", () => {
  const html = render({
    timedOutUntil: TIMED_OUT_UNTIL,
    state: { ok: true, message: "L’exclusion temporaire de Lyra est levée." },
  })

  expect(region(html, "status")).toEqual({
    icon: drawing(CircleCheck),
    text: "L’exclusion temporaire de Lyra est levée.",
  })
  expect(region(html, "alert").text).toBe("")
  expect(textarea(html, "time-out-reason").value).toBe("")
  expect(textarea(html, "lift-reason").value).toBe("")
})

test("while a change is sent, both buttons are disabled and the status region says so", () => {
  const html = render({ timedOutUntil: TIMED_OUT_UNTIL, pending: true })

  expect(forms(html).map(({ inside }) => button(inside).disabled)).toEqual([
    true,
    true,
  ])
  expect(region(html, "status")).toEqual({
    icon: undefined,
    text: "Envoi en cours…",
  })
})
