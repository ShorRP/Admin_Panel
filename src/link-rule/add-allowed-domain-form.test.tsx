import { CircleAlert, LoaderCircle, Plus, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AddAllowedDomainForm } from "./add-allowed-domain-form"
import type { DomainFields, WriteResult } from "./write-result"

function render(state: WriteResult<DomainFields> | null, pending = false) {
  return renderToStaticMarkup(
    <AddAllowedDomainForm state={state} pending={pending} action={() => {}} />
  )
}

function field(html: string) {
  return /<input[^>]*name="domain"[^>]*>/.exec(html)?.[0] ?? ""
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

test("before any write, the form shows its labelled field with an example for its placeholder, « Ajouter » after a hidden plus, and its alert region empty", () => {
  const html = render(null)

  expect(html).toMatch(
    /<label[^>]* for="allowed-domain"[^>]*>Ajouter un domaine<\/label>/
  )
  expect(field(html)).toContain('id="allowed-domain"')
  expect(field(html)).toContain('value=""')
  expect(field(html)).toContain('placeholder="Ex. : twitch.tv"')
  expect(button(html)).toEqual({
    icon: drawing(Plus),
    iconHidden: true,
    text: "Ajouter",
    disabled: false,
  })
  expect(alert(html)).toEqual({ icon: undefined, text: "" })
})

test("the field is typed as a domain is, in lower case with no correction, and leaves validation to the panel", () => {
  const tag = field(render(null))

  expect(tag).toContain('autoComplete="off"')
  expect(tag).toContain('autoCapitalize="none"')
  expect(tag).toContain('spellCheck="false"')
  expect(tag).not.toMatch(/required|maxlength|pattern/i)
})

test("under the field, the form says what the rule blocks even for an allowed domain: a link in http, a subdomain other than « www. » to add apart, and a link glued to punctuation", () => {
  const html = render(null)

  const hint = /<p id="allowed-domain-hint"[^>]*>(.*?)<\/p>/.exec(html)?.[1]
  expect(hint).toBe(
    "Saisis le domaine seul, comme « twitch.tv ». La règle bloque quand même, pour un domaine permis : un lien en « http:// », un sous-domaine autre que « www. » (ajoute-le à part, comme « m.youtube.com ») et un lien collé à une ponctuation."
  )
  expect(html.indexOf("<input")).toBeLessThan(
    html.indexOf("allowed-domain-hint")
  )
})

test("the field points to the hint and to the alert region", () => {
  const html = render(null)

  expect(field(html)).toContain(
    'aria-describedby="allowed-domain-hint allowed-domain-error"'
  )
  expect(html).toMatch(/<p role="alert"[^>]* id="allowed-domain-error"/)
})

test("a refused domain shows its message in the alert region, after a hidden alert icon, and stays in the field as typed", () => {
  const html = render({
    ok: false,
    message: "Saisis le domaine seul, sans chemin.",
    domain: "Twitch.TV/directory",
  })

  expect(alert(html)).toEqual({
    icon: drawing(CircleAlert),
    text: "Saisis le domaine seul, sans chemin.",
  })
  expect(field(html)).toContain('value="Twitch.TV/directory"')
})

test("the domain that a refusal hands back is escaped in the field", () => {
  const html = render({
    ok: false,
    message: "Refusé.",
    domain: '"><script>',
  })

  expect(field(html)).toContain('value="&quot;&gt;&lt;script&gt;"')
})

test("after a write that landed, the field is empty and the alert region too", () => {
  const html = render({ ok: true, message: "Fait." })

  expect(field(html)).toContain('value=""')
  expect(alert(html)).toEqual({ icon: undefined, text: "" })
})

test("while the write is pending, the button reads « Ajout… » after a hidden spinner and is disabled", () => {
  expect(button(render(null, true))).toEqual({
    icon: drawing(LoaderCircle),
    iconHidden: true,
    text: "Ajout…",
    disabled: true,
  })
})
