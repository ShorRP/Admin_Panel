import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AllowedDomainsSection } from "./allowed-domains-section"
import { ExemptChannelsSection } from "./exempt-channels-section"
import { ExemptRolesSection } from "./exempt-roles-section"
import { LinkRuleActionSection } from "./link-rule-action-section"
import { OtherExceptionsSection } from "./other-exceptions-section"

function texts(html: string) {
  return Array.from(html.matchAll(/>([^<]+)</g), ([, text]) => text)
}

function listItems(html: string) {
  return Array.from(html.matchAll(/<li[^>]*>(.*?)<\/li>/g), ([, item]) =>
    item?.replace(/<[^>]*>/g, "")
  )
}

function allowedDomains(domains: string[]) {
  return renderToStaticMarkup(
    <AllowedDomainsSection
      domains={domains}
      form={<b>the form</b>}
      list={<b>the list</b>}
    />
  )
}

test("the allowed domains come under their count, with the form to add one, then say that the links to them pass with or without « www. », over their list", () => {
  const html = allowedDomains(["twitch.tv", "youtube.com"])

  expect(texts(html)).toEqual([
    "Domaines permis",
    "2 domaines",
    "the form",
    "Les liens en https vers ces domaines, avec ou sans « www. », passent.",
    "the list",
  ])
  expect(html).toMatch(/<h2[^>]*>Domaines permis<\/h2>/)
})

test("a single allowed domain counts in the singular", () => {
  expect(texts(allowedDomains(["twitch.tv"]))).toContain("1 domaine")
})

test("with no allowed domain, the section says that every link is blocked, keeps the form and the list, and has no sentence on the links that pass", () => {
  const html = allowedDomains([])

  expect(texts(html)).toEqual([
    "Domaines permis",
    "0 domaine",
    "the form",
    "Aucun domaine permis : tout lien est bloqué.",
    "the list",
  ])
})

test("the exempt roles are listed by name, a role that Discord no longer lists as « Rôle supprimé », under what AutoMod spares whatever the rule says", () => {
  const html = renderToStaticMarkup(
    <ExemptRolesSection
      roles={[
        { id: "1", name: "Staff" },
        { id: "2", name: null },
      ]}
    />
  )

  expect(texts(html)).toEqual([
    "Rôles exemptés",
    "Les membres de ces rôles postent n’importe quel lien.",
    "Staff",
    "Rôle supprimé",
    "AutoMod laisse aussi passer le propriétaire du serveur Discord et les membres qui ont la permission « Administrateur » ou « Gérer le serveur ».",
  ])
  expect(listItems(html)).toEqual(["Staff", "Rôle supprimé"])
})

test("with no exempt role, the section says so", () => {
  const html = renderToStaticMarkup(<ExemptRolesSection roles={[]} />)

  expect(texts(html)).toContain("Aucun rôle exempté.")
  expect(listItems(html)).toEqual([])
})

test("the exempt channels are listed with their #, a channel that Discord does not list as « Salon introuvable »", () => {
  const html = renderToStaticMarkup(
    <ExemptChannelsSection
      channels={[
        { id: "1", name: "galerie" },
        { id: "2", name: null },
      ]}
    />
  )

  expect(texts(html)).toEqual([
    "Salons exemptés",
    "Un lien est permis dans ces salons.",
    "#galerie",
    "Salon introuvable",
  ])
  expect(listItems(html)).toEqual(["#galerie", "Salon introuvable"])
})

test("with no exempt channel, the section says that a link is blocked in every channel", () => {
  const html = renderToStaticMarkup(<ExemptChannelsSection channels={[]} />)

  expect(texts(html)).toEqual([
    "Salons exemptés",
    "Aucun salon exempté : un lien est bloqué dans tous les salons.",
  ])
})

test("the action is shown by its name, and an action that the panel does not offer is said to be set in Discord", () => {
  const block = renderToStaticMarkup(<LinkRuleActionSection action="block" />)
  const day = renderToStaticMarkup(
    <LinkRuleActionSection action="timeout-1d" />
  )
  const other = renderToStaticMarkup(<LinkRuleActionSection action={null} />)

  expect(texts(block)).toEqual([
    "Action",
    "Bloquer seulement",
    "Ce qui arrive à un message qui contient un lien bloqué.",
  ])
  expect(texts(day)).toContain("Exclusion 1 jour")
  expect(texts(other)).toEqual([
    "Action",
    "Réglée dans Discord",
    "Cette action n’est pas l’une de celles du panel : elle se change dans Discord.",
  ])
})

test("the other exceptions are listed as written, under what the panel does with them, and the section is absent when there is none", () => {
  const html = renderToStaticMarkup(
    <OtherExceptionsSection
      entries={["*youtube.com", "https://m.youtube.com/*"]}
    />
  )

  expect(texts(html)).toEqual([
    "Autres exceptions",
    "Ces entrées de la liste permise ne suivent pas le modèle du panel : elles se modifient dans Discord, et le panel les garde.",
    "*youtube.com",
    "https://m.youtube.com/*",
  ])
  expect(listItems(html)).toEqual(["*youtube.com", "https://m.youtube.com/*"])
  expect(renderToStaticMarkup(<OtherExceptionsSection entries={[]} />)).toBe("")
})
