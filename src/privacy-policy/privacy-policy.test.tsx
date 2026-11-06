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
      "Mise à jour le 6 nov. 2026.",
    ],
    updated: ["2026-11-06", "6 nov. 2026"],
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
  expect(text).toMatch(
    /celles de la liste des comptes, du journal d’audit, du journal du jeu, du Journal du Bot et des tickets de support, le texte cherché, un nom, un ID ou une mention, les mots d’un motif/
  )
})

test("the privacy policy says the panel reads the game log, for the staff who view its channel on Discord, from the game server's webhook alone, and keeps none of it", () => {
  const text = sectionText("Ce que le panel lit sans le garder")

  expect(text).toMatch(
    /pour le staff qui voit le salon du journal du jeu sur Discord, la page du journal du jeu/
  )
  expect(text).toMatch(/parmi les messages de ce webhook seul/)
  expect(text).toMatch(
    /le nom du personnage et le numéro de son compte de jeu, la cible, le motif et le lieu de l’événement/
  )
  expect(text).toMatch(/les mots et la période que le staff a choisis/)
  expect(text).toMatch(
    /tant qu’un membre du staff n’a pas supprimé leur message/
  )
  expect(sectionText("Qui le voit")).toMatch(
    /le journal du jeu et le Journal du Bot, que voit seul le staff qui voit leur salon sur Discord/
  )
})

test("the privacy policy says the panel reads the Bot log, for the staff who view its channel on Discord, from the application's messages alone, and keeps none of it", () => {
  const text = sectionText("Ce que le panel lit sans le garder")

  expect(text).toMatch(
    /pour le staff qui voit le salon du Journal du Bot sur Discord, la page du Journal du Bot/
  )
  expect(text).toMatch(/parmi les messages de l’application seule/)
  expect(text).toMatch(
    /les comptes concernés, dont il cherche le nom sur Discord, les rôles et les salons, et, pour la fermeture d’un ticket, le motif que le membre a saisi/
  )
  expect(text).toMatch(
    /les mots, la période, et l’ID du compte ou du salon que le staff a choisis/
  )
  expect(sectionText("Qui le voit")).toMatch(
    /le journal du jeu et le Journal du Bot, que voit seul le staff qui voit leur salon sur Discord/
  )
})

test("the privacy policy says the panel reads, for the staff who moderate, the archives of the support tickets an account opened from the archives channel, with no conversation, and that they stay in Discord until a staff member deletes their message", () => {
  const text = sectionText("Ce que le panel lit sans le garder")

  expect(text).toMatch(/les tickets de support qu’il a ouverts/)
  expect(text).toMatch(
    /le type de demande, les dates d’ouverture et de fermeture, le nom de la personne qui l’a fermé et le motif de la fermeture, sans aucune conversation/
  )
  expect(text).toMatch(
    /tant qu’un membre du staff n’a pas supprimé son message/
  )
})

test("the privacy policy says that, to find tickets, the panel sends Discord's search of messages the account's ID, the words of the reason or the emoji of the request kind that the staff chose, and reads the members and the banned accounts to find an account by its name", () => {
  const text = sectionText("Ce que le panel lit sans le garder")

  expect(text).toMatch(
    /Pour trouver des tickets, le panel envoie à la recherche de messages de Discord l’ID du compte, les mots du motif ou l’emoji du type de demande que le staff a choisis/
  )
  expect(text).toMatch(
    /pour chercher un compte par son nom, il lit la liste des membres et des comptes bannis sans l’afficher/
  )
})

test("the privacy policy says the whole staff reads the archives of every support ticket on their page, with who opened and who closed each, where only the staff who moderate read them on a record", () => {
  expect(sectionText("Ce que le panel lit sans le garder")).toMatch(
    /pour tout le staff, sur la page des tickets de support, ceux de tous les comptes.*le nom de la personne qui l’a ouvert, le type de demande/
  )
  expect(sectionText("Qui le voit")).toMatch(
    /Tout le staff voit le journal d’audit et les archives des tickets de support/
  )
})

test("the privacy policy says the panel reads, for the whole staff, the conversations of the support tickets in progress whose channel they view on Discord, 100 messages at most, and keeps none of them", () => {
  const text = sectionText("Ce que le panel lit sans le garder")

  expect(text).toMatch(
    /pour tout le staff, sur la page des tickets de support, les tickets encore ouverts dont le salon est visible pour lui sur Discord/
  )
  expect(text).toMatch(
    /le nombre de messages, le nom des membres du staff qui y ont répondu, et un extrait du dernier message avec le nom de son auteur/
  )
  expect(text).toMatch(
    /lit pour cela les 100 derniers messages de la conversation/
  )
  expect(text).toMatch(/n’en garde rien/)
  expect(sectionText("Qui le voit")).toMatch(
    /les tickets en cours dont il voit le salon sur Discord/
  )
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

test("the privacy policy's footer names the panel, which is for anyone to read here, and marks its own link current", () => {
  const footer = /<footer[^>]*>(.*?)<\/footer>/.exec(policy())?.[1] ?? ""

  expect({
    note: /<p[^>]*>([^<]*)<\/p>/.exec(footer)?.[1],
    links: Array.from(
      footer.matchAll(/<a([^>]*)>([^<]*)/g),
      ([, attributes = "", text]) => ({
        text,
        current: /\saria-current="([^"]*)"/.exec(attributes)?.[1],
      })
    ),
  }).toEqual({
    note: "Panel du staff de Shor",
    links: [
      { text: "Confidentialité", current: "page" },
      { text: "shor-rp.fr", current: undefined },
    ],
  })
})
