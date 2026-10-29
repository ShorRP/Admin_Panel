import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import type { AccountRecord } from "./read-record"
import { RecordDetails } from "./record-details"

const LYRA: AccountRecord = {
  id: "175928847299117063",
  name: "Lyra des Brumes",
  nick: "Lyra des Brumes",
  globalName: "Lyra",
  username: "lyra_gates",
  avatarUrl: null,
  createdAt: new Date("2016-04-30T11:18:25.796Z"),
  standing: {
    kind: "member",
    joinedAt: new Date("2026-03-14T09:26:53.589Z"),
    roles: [
      { id: "1300000000000000010", name: "Garde" },
      { id: "1300000000000000011", name: "Joueur" },
    ],
    timedOutUntil: null,
  },
}

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function entries(html: string) {
  return Array.from(
    html.matchAll(/<dt[^>]*>(.*?)<\/dt><dd[^>]*>(.*?)<\/dd>/g),
    ([, term = "", details = ""]) => [text(term), text(details)]
  )
}

function times(html: string) {
  return Array.from(
    html.matchAll(/<time dateTime="([^"]*)">([^<]*)<\/time>/g),
    ([, dateTime, shown]) => ({ dateTime, shown })
  )
}

function card(html: string) {
  const labelledBy = /^<section aria-labelledby="([^"]+)"/.exec(html)?.[1]
  return {
    name: new RegExp(`<h2 id="${labelledBy}"[^>]*>([^<]*)</h2>`).exec(
      html
    )?.[1],
    header: text(/^<section[^>]*>(.*?)<dl/.exec(html)?.[1] ?? ""),
  }
}

test("a record's details sit in a card named « Détails », whose overline says once that its dates are in Paris time", () => {
  const html = renderToStaticMarkup(<RecordDetails record={LYRA} />)

  expect(card(html)).toEqual({
    name: "Détails",
    header: "DétailsHeures de Paris",
  })
  expect(text(html)).not.toContain("Heures de Paris.")
})

test("a member's details give their names, ID, dates in Paris time and roles, each role an item of its own, and leave their standing to the header", () => {
  const html = renderToStaticMarkup(<RecordDetails record={LYRA} />)

  expect(entries(html)).toEqual([
    ["Pseudo sur le serveur", "Lyra des Brumes"],
    ["Nom d’affichage", "Lyra"],
    ["Nom d’utilisateur", "lyra_gates"],
    ["ID", "175928847299117063"],
    ["Création du compte", "30 avr. 2016, 13:18"],
    ["Arrivée sur le serveur", "14 mars 2026, 10:26"],
    ["Rôles", "GardeJoueur"],
  ])
  expect(
    Array.from(html.matchAll(/<li[^>]*>([^<]*)<\/li>/g), ([, role]) => role)
  ).toEqual(["Garde", "Joueur"])
  expect(times(html)).toEqual([
    { dateTime: "2016-04-30T11:18:25.796Z", shown: "30 avr. 2016, 13:18" },
    { dateTime: "2026-03-14T09:26:53.589Z", shown: "14 mars 2026, 10:26" },
  ])
})

test("a member without a nickname, a display name, a known arrival or roles shows each as missing", () => {
  const html = renderToStaticMarkup(
    <RecordDetails
      record={{
        ...LYRA,
        name: "lyra_gates",
        nick: null,
        globalName: null,
        standing: {
          kind: "member",
          joinedAt: null,
          roles: [],
          timedOutUntil: null,
        },
      }}
    />
  )

  expect(entries(html)).toEqual(
    expect.arrayContaining([
      ["Pseudo sur le serveur", "Aucun"],
      ["Nom d’affichage", "Aucun"],
      ["Arrivée sur le serveur", "Inconnue"],
      ["Rôles", "Aucun"],
    ])
  )
})

test("a banned account's details give the ban's reason and the staff member who banned it, with no member's details", () => {
  const html = renderToStaticMarkup(
    <RecordDetails
      record={{
        ...LYRA,
        name: "Lyra",
        nick: null,
        standing: {
          kind: "banned",
          reason: "insultes répétées",
          staffMemberName: "Aldis",
        },
      }}
    />
  )

  expect(entries(html)).toEqual([
    ["Motif du bannissement", "insultes répétées"],
    ["Banni par", "Aldis"],
    ["Nom d’affichage", "Lyra"],
    ["Nom d’utilisateur", "lyra_gates"],
    ["ID", "175928847299117063"],
    ["Création du compte", "30 avr. 2016, 13:18"],
  ])
})

test("a ban without a reason, or whose reason names no staff member, says so", () => {
  const html = renderToStaticMarkup(
    <RecordDetails
      record={{
        ...LYRA,
        standing: { kind: "banned", reason: null, staffMemberName: null },
      }}
    />
  )

  expect(entries(html)[0]).toEqual(["Motif du bannissement", "Aucun motif"])
  expect(text(html)).not.toContain("Banni par")
})

test("an account absent from the Discord server's details give its names, ID and creation alone", () => {
  const html = renderToStaticMarkup(
    <RecordDetails record={{ ...LYRA, standing: { kind: "absent" } }} />
  )

  expect(entries(html)).toEqual([
    ["Nom d’affichage", "Lyra"],
    ["Nom d’utilisateur", "lyra_gates"],
    ["ID", "175928847299117063"],
    ["Création du compte", "30 avr. 2016, 13:18"],
  ])
})
