import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { AllowedDomainsSection } from "./allowed-domains-section"
import { ExemptChannelsSection } from "./exempt-channels-section"
import { ExemptRolesSection } from "./exempt-roles-section"
import { LinkRuleActionSection } from "./link-rule-action-section"
import { OtherExceptionsSection } from "./other-exceptions-section"
import type { ExemptChannel } from "./read-link-rule"

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

function exemptRoles(roles: { id: string; name: string | null }[]) {
  return renderToStaticMarkup(
    <ExemptRolesSection
      roles={roles}
      staffRoleId="1"
      form={<b>the form</b>}
      list={<b>the list</b>}
    />
  )
}

test("the exempt roles come under their title, with the form to add one, then say that their members post any link and that the staff role has no cross, over their list and under what AutoMod spares whatever the rule says", () => {
  const html = exemptRoles([
    { id: "1", name: "Staff" },
    { id: "2", name: "Garde" },
  ])

  expect(texts(html)).toEqual([
    "Rôles exemptés",
    "the form",
    "Les membres de ces rôles postent n’importe quel lien. Le rôle du staff est toujours exempté : il n’a pas de croix.",
    "the list",
    "AutoMod laisse aussi passer le propriétaire du serveur Discord et les membres qui ont la permission « Administrateur » ou « Gérer le serveur ».",
  ])
  expect(html).toMatch(/<section[^>]*aria-labelledby="exempt-roles"/)
})

test("a rule that does not exempt the staff role says nothing of its cross", () => {
  const html = exemptRoles([{ id: "2", name: "Garde" }])

  expect(texts(html)).toContain(
    "Les membres de ces rôles postent n’importe quel lien."
  )
})

test("with no exempt role, the section says so, and keeps the form and the list", () => {
  const html = exemptRoles([])

  expect(texts(html)).toEqual([
    "Rôles exemptés",
    "the form",
    "Aucun rôle exempté.",
    "the list",
    "AutoMod laisse aussi passer le propriétaire du serveur Discord et les membres qui ont la permission « Administrateur » ou « Gérer le serveur ».",
  ])
})

function exemptChannels(channels: ExemptChannel[]) {
  return renderToStaticMarkup(
    <ExemptChannelsSection
      channels={channels}
      form={<b>the form</b>}
      list={<b>the list</b>}
    />
  )
}

test("the exempt channels come under their title, with the form to add one, then say that a link is allowed in them, over their list", () => {
  const html = exemptChannels([
    { id: "1", name: "galerie", category: false },
    { id: "2", name: "Jeux", category: true },
  ])

  expect(texts(html)).toEqual([
    "Salons exemptés",
    "the form",
    "Un lien est permis dans ces salons.",
    "the list",
  ])
  expect(html).toMatch(/<section[^>]*aria-labelledby="exempt-channels"/)
})

test("with no exempt channel, the section says that a link is blocked in every channel, and keeps the form and the list", () => {
  const html = exemptChannels([])

  expect(texts(html)).toEqual([
    "Salons exemptés",
    "the form",
    "Aucun salon exempté : un lien est bloqué dans tous les salons.",
    "the list",
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
