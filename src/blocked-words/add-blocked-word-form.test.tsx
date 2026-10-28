import {
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  Plus,
  type LucideIcon,
} from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AddBlockedWordForm } from "./add-blocked-word-form"
import type { WriteResult } from "./write-result"

function render(state: WriteResult | null, pending = false) {
  return renderToStaticMarkup(
    <AddBlockedWordForm state={state} pending={pending} action={() => {}} />
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

function successMessage(text: string) {
  return { icon: drawing(CircleCheck), iconHidden: true, text }
}

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

test("before any write, the form shows its labelled field, « Ajouter » after a hidden plus, and both regions empty", () => {
  const html = render(null)

  expect(html).toMatch(
    /<label[^>]* for="blocked-word"[^>]*>Mot ou expression<\/label>/
  )
  expect(field(html)).toContain('id="blocked-word"')
  expect(field(html)).toContain('value=""')
  expect(button(html)).toEqual({
    icon: drawing(Plus),
    iconHidden: true,
    text: "Ajouter",
    disabled: false,
  })
  expect(region(html, "status")).toEqual(EMPTY)
  expect(region(html, "alert")).toEqual(EMPTY)
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
  })

  expect(region(html, "alert")).toEqual(
    failureMessage("« merde » est déjà un mot interdit.")
  )
  expect(region(html, "status")).toEqual(EMPTY)
  expect(field(html)).toContain('value="Merde"')
})

test("a word added shows its message in the status region, after a hidden check, and leaves the field empty", () => {
  const html = render({
    ok: true,
    message: "« foo » est maintenant un mot interdit.",
  })

  expect(region(html, "status")).toEqual(
    successMessage("« foo » est maintenant un mot interdit.")
  )
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
