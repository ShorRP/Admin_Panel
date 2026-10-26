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
  return new RegExp(`<p role="${role}"[^>]*>(.*?)</p>`).exec(html)?.[1]
}

function field(html: string) {
  return /<input[^>]*name="word"[^>]*>/.exec(html)?.[0] ?? ""
}

function button(html: string) {
  const [tag = "", text] = /<button[^>]*>(.*?)<\/button>/.exec(html) ?? []
  return { text, disabled: /\sdisabled=""/.test(tag) }
}

test("before any write, the form shows its labelled field, « Ajouter », and both regions empty", () => {
  const html = render(null)

  expect(html).toMatch(
    /<label[^>]* for="blocked-word"[^>]*>Mot ou expression<\/label>/
  )
  expect(field(html)).toContain('id="blocked-word"')
  expect(field(html)).toContain('value=""')
  expect(button(html)).toEqual({ text: "Ajouter", disabled: false })
  expect(region(html, "status")).toBe("")
  expect(region(html, "alert")).toBe("")
})

test("the field points to the alert region, and leaves validation to the panel", () => {
  const html = render(null)

  expect(field(html)).toContain('aria-describedby="blocked-word-error"')
  expect(html).toMatch(/<p role="alert"[^>]* id="blocked-word-error"/)
  expect(field(html)).not.toMatch(/required|maxlength|pattern/i)
})

test("a refused word shows its message in the alert region, and stays in the field", () => {
  const html = render({
    ok: false,
    message: "« merde » est déjà un mot interdit.",
    word: "Merde",
  })

  expect(region(html, "alert")).toBe("« merde » est déjà un mot interdit.")
  expect(region(html, "status")).toBe("")
  expect(field(html)).toContain('value="Merde"')
})

test("a word added shows its message in the status region, and leaves the field empty", () => {
  const html = render({
    ok: true,
    message: "« foo » est maintenant un mot interdit.",
  })

  expect(region(html, "status")).toBe("« foo » est maintenant un mot interdit.")
  expect(region(html, "alert")).toBe("")
  expect(field(html)).toContain('value=""')
})

test("while the word is being added, the button reads « Ajout… » and is disabled", () => {
  expect(button(render(null, true))).toEqual({
    text: "Ajout…",
    disabled: true,
  })
})
