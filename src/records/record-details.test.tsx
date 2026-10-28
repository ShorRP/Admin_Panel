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

test("a member's record names them, beside their avatar hidden from assistive technologies, then says they are a member, with their names, ID, dates in Paris time and roles", () => {
  const html = renderToStaticMarkup(<RecordDetails record={LYRA} />)

  expect(/<h2[^>]*>([^<]*)<\/h2>/.exec(html)?.[1]).toBe("Lyra des Brumes")
  expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>.*?LD/)
  expect(entries(html)).toEqual([
    ["État", "Membre du serveur"],
    ["Pseudo sur le serveur", "Lyra des Brumes"],
    ["Nom d’affichage", "Lyra"],
    ["Nom d’utilisateur", "lyra_gates"],
    ["ID", "175928847299117063"],
    ["Création du compte", "30 avr. 2016, 13:18"],
    ["Arrivée sur le serveur", "14 mars 2026, 10:26"],
    ["Rôles", "GardeJoueur"],
  ])
  expect(times(html)).toEqual([
    { dateTime: "2016-04-30T11:18:25.796Z", shown: "30 avr. 2016, 13:18" },
    { dateTime: "2026-03-14T09:26:53.589Z", shown: "14 mars 2026, 10:26" },
  ])
  expect(text(html)).toContain("Heures de Paris.")
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

test("a timed-out member's record says until when, in Paris time", () => {
  const html = renderToStaticMarkup(
    <RecordDetails
      record={{
        ...LYRA,
        standing: {
          ...LYRA.standing,
          kind: "member",
          joinedAt: null,
          roles: [],
          timedOutUntil: new Date("2099-11-02T18:30:00.000Z"),
        },
      }}
    />
  )

  expect(entries(html)[0]).toEqual([
    "État",
    "Membre exclu temporairement jusqu’au 2 nov. 2099, 19:30",
  ])
  expect(times(html)).toContainEqual({
    dateTime: "2099-11-02T18:30:00.000Z",
    shown: "2 nov. 2099, 19:30",
  })
})

test("a banned account's record gives the ban's reason and the staff member who banned it, with no member's details", () => {
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
    ["État", "Compte banni"],
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

  expect(entries(html).slice(0, 2)).toEqual([
    ["État", "Compte banni"],
    ["Motif du bannissement", "Aucun motif"],
  ])
  expect(text(html)).not.toContain("Banni par")
})

test("an account absent from the Discord server's record says so", () => {
  const html = renderToStaticMarkup(
    <RecordDetails record={{ ...LYRA, standing: { kind: "absent" } }} />
  )

  expect(entries(html)[0]).toEqual(["État", "Compte absent du serveur"])
})

test("an ID that names no account says so", () => {
  expect(text(renderToStaticMarkup(<RecordDetails record={null} />))).toBe(
    "Aucun compte Discord n’a cet ID."
  )
})
