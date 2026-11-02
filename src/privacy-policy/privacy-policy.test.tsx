import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { PrivacyPolicy } from "./privacy-policy"

function policy() {
  return renderToStaticMarkup(<PrivacyPolicy />)
}

function textOf(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function mainOf(html: string) {
  return /<main[^>]*>(.*)<\/main>/.exec(html)?.[1] ?? ""
}

function sections(html: string) {
  return Array.from(
    mainOf(html).matchAll(
      /<section[^>]*><h2[^>]*>(.*?)<\/h2>(.*?)<\/section>/g
    ),
    ([, heading = "", body = ""]) => ({ heading, text: textOf(body) })
  )
}

function sectionText(heading: string) {
  const section = sections(policy()).find(
    (section) => section.heading === heading
  )
  if (section === undefined) {
    throw new Error(`The privacy policy has no section "${heading}".`)
  }
  return section.text
}

test("the privacy policy opens on the public pages' overline, its heading, what it covers and the day it was last updated, before a rule hidden from assistive technologies", () => {
  const main = mainOf(policy())
  const header = main.slice(0, main.indexOf("<section"))

  expect({
    texts: Array.from(
      header.matchAll(/<(?:p|h1)[^>]*>(.*?)<\/(?:p|h1)>/g),
      ([, text = ""]) => textOf(text)
    ),
    updated: /<time dateTime="([^"]*)">([^<]*)<\/time>/.exec(header)?.slice(1),
    rule: /<div aria-hidden="true"[^>]*>/.test(header),
  }).toEqual({
    texts: [
      "Panel du staff · Skyrim Roleplay",
      "Politique de confidentialité",
      "Ce que le panel du staff de Shor lit, garde et écrit sur les comptes Discord, pourquoi, combien de temps, qui le voit, et comment demander à le corriger ou à l’effacer.",
      "Mise à jour le 2 novembre 2026.",
    ],
    updated: ["2026-11-02", "2 novembre 2026"],
    rule: true,
  })
})

test("the privacy policy says, under a heading each, what it covers, what the panel keeps, reads and writes, why, who sees it, who else touches it, each one's rights, and whom to write to", () => {
  expect(sections(policy()).map(({ heading }) => heading)).toEqual([
    "Ce que couvre cette page",
    "Ce que le panel garde",
    "Ce que le panel lit sans le garder",
    "Ce que le panel écrit dans Discord",
    "Pourquoi",
    "Qui le voit",
    "Qui d’autre y touche",
    "Tes droits",
    "Responsable et contact",
  ])
})

test("the privacy policy covers the panel's two Discord applications, « Shor Panel » and its test one, « Shor Panel Dev »", () => {
  expect(sectionText("Ce que couvre cette page")).toMatch(
    /« Shor Panel ».*« Shor Panel Dev »/
  )
})

test("the privacy policy says the panel keeps the staff member's Discord ID alone, in the __Host-session cookie, in their browser alone, 7 days at most, which logging out deletes", () => {
  const text = sectionText("Ce que le panel garde")

  expect(text).toMatch(/pas de base de données/)
  expect(text).toMatch(
    /ne garde qu’une donnée : l’ID Discord du membre du staff connecté/
  )
  expect(text).toMatch(/__Host-session/)
  expect(text).toMatch(/sur son seul navigateur, 7 jours au plus/)
  expect(text).toMatch(/Se déconnecter efface ce cookie\./)
})

test("the privacy policy says the panel reads from Discord, at each page, what it shows the staff, and keeps none of it, but in the URLs that the browser's history keeps", () => {
  const text = sectionText("Ce que le panel lit sans le garder")

  expect(text).toMatch(
    /À chaque page, le panel lit sur Discord ce qu’il montre au staff, et n’en garde rien :/
  )
  expect(text).toMatch(/AutoMod/)
  expect(text).toMatch(/la liste des comptes/)
  expect(text).toMatch(/la fiche d’un compte/)
  expect(text).toMatch(/« Server Members Intent »/)
  expect(text).toMatch(/l’historique du navigateur les garde/)
})

test("the privacy policy says Discord keeps what the panel writes, every change's reason naming its staff member 45 days, a ban's reason while the ban lasts, and a sanction's direct message until the application deletes it", () => {
  const text = sectionText("Ce que le panel écrit dans Discord")

  expect(text).toMatch(/le panel n’en garde aucune copie/)
  expect(text).toMatch(
    /nomme le membre du staff qui l’a fait, son nom et son ID, et que le journal d’audit de Discord garde 45 jours/
  )
  expect(text).toMatch(/où il reste tant que dure le bannissement/)
  expect(text).toMatch(/de la dernière heure aux 7 derniers jours/)
  expect(text).toMatch(/message privé/)
})

test("the privacy policy says only the staff open the panel, and only those who moderate see the list of accounts and their records", () => {
  expect(sectionText("Qui le voit")).toMatch(
    /seul le staff qui modère voit la liste des comptes et leurs fiches/
  )
})

test("the privacy policy says Vercel hosts the panel and keeps its logs an hour, which hold no member's ID, name or IP address", () => {
  const text = sectionText("Qui d’autre y touche")

  expect(text).toMatch(/Vercel, qui héberge le panel/)
  expect(text).toMatch(/ni l’ID, ni le nom, ni l’adresse IP d’un membre/)
  expect(text).toMatch(/une heure/)
})

test("the privacy policy offers access, correction and deletion", () => {
  expect(sectionText("Tes droits")).toMatch(
    /accéder aux données qui te concernent, à les faire corriger ou à les faire effacer/
  )
})

test("the privacy policy names no one responsible yet, and sends a request to Shor's staff on Shor's Discord server meanwhile", () => {
  expect(sectionText("Responsable et contact")).toBe(
    "Le responsable de ces données et l’adresse où lui écrire restent à désigner. En attendant, adresse ta demande au staff de Shor, sur le serveur Discord de Shor."
  )
})

test("the privacy policy's footer marks its own link current", () => {
  const footer = /<footer[^>]*>(.*?)<\/footer>/.exec(policy())?.[1] ?? ""

  expect(
    Array.from(
      footer.matchAll(/<a([^>]*)>([^<]*)/g),
      ([, attributes = "", text]) => ({
        text,
        current: /\saria-current="([^"]*)"/.exec(attributes)?.[1],
      })
    )
  ).toEqual([
    { text: "Confidentialité", current: "page" },
    { text: "shor-rp.fr", current: undefined },
  ])
})
