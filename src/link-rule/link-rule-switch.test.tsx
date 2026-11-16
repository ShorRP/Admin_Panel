import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { LinkRuleSwitchCard } from "./link-rule-switch-card"
import { LinkRuleSwitchForm } from "./link-rule-switch-form"
import type { LinkRuleStatus } from "./read-link-rule"

function texts(html: string) {
  return Array.from(html.matchAll(/>([^<]+)</g), ([, text]) => text)
}

function buttonText(html: string) {
  return /<button[^>]*>(.*?)<\/button>/.exec(html)?.[1]?.replace(/<[^>]*>/g, "")
}

function card(status: LinkRuleStatus) {
  return renderToStaticMarkup(
    <LinkRuleSwitchCard status={status} form={<b>the form</b>} />
  )
}

function form(
  status: LinkRuleStatus,
  options: { state?: { ok: false; message: string } | null; pending?: boolean }
) {
  return renderToStaticMarkup(
    <LinkRuleSwitchForm
      status={status}
      state={options.state ?? null}
      pending={options.pending ?? false}
      action={() => {}}
    />
  )
}

test("a rule that does not exist yet says so, and says that no link is blocked and that « Activer » creates it with the settings below", () => {
  expect(texts(card("absent"))).toEqual([
    "Règle des liens",
    "Pas encore créée",
    "La règle des liens n’existe pas encore : aucun lien n’est bloqué. « Activer » la crée avec les réglages ci-dessous.",
    "the form",
  ])
})

test("a rule that is on says which links Discord lets through", () => {
  expect(texts(card("enabled"))).toEqual([
    "Règle des liens",
    "Active",
    "Discord bloque les liens, sauf ceux des domaines permis, des membres exemptés et des salons exemptés.",
    "the form",
  ])
})

test("a rule that is off says that every link passes and that its settings are kept", () => {
  expect(texts(card("disabled"))).toEqual([
    "Règle des liens",
    "Coupée",
    "Tous les liens passent. Les domaines, les rôles et les salons de la règle sont gardés.",
    "the form",
  ])
})

test("the card is named by its overline, so that it is a region of its own", () => {
  const html = card("enabled")

  expect(html).toMatch(
    /<section aria-labelledby="([^"]+)"[^>]*>.*<p id="\1"[^>]*>Règle des liens<\/p>/
  )
})

test("the button of a rule that does not exist or is off is « Activer » and asks for the rule on, and the button of a rule that is on is « Couper » and asks for it off", () => {
  const absent = form("absent", {})
  const disabled = form("disabled", {})
  const enabled = form("enabled", {})

  expect(buttonText(absent)).toBe("Activer")
  expect(absent).toContain('name="enabled" value="true"')
  expect(buttonText(disabled)).toBe("Activer")
  expect(disabled).toContain('name="enabled" value="true"')
  expect(buttonText(enabled)).toBe("Couper")
  expect(enabled).toContain('name="enabled" value="false"')
})

test("a write that is pending disables the button, which says what is under way", () => {
  const turningOn = form("disabled", { pending: true })
  const turningOff = form("enabled", { pending: true })

  expect(turningOn).toMatch(/<button[^>]* disabled=""/)
  expect(buttonText(turningOn)).toBe("Activation…")
  expect(buttonText(turningOff)).toBe("Coupure…")
})

test("a refusal shows under the button, in an alert", () => {
  const html = form("absent", {
    state: { ok: false, message: "Supprimes-en une dans Discord." },
  })

  expect(html).toMatch(/<p role="alert"[^>]*>.*Supprimes-en une dans Discord\./)
})
