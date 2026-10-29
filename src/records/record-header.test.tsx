import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import type { AccountRecord, Standing } from "./read-record"
import { RecordHeader } from "./record-header"

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
    roles: [{ id: "1300000000000000010", name: "Garde" }],
    timedOutUntil: null,
  },
}

function text(html: string) {
  return html.replace(/<[^>]*>/g, "")
}

function visibleText(html: string) {
  return text(html.replace(/<(\w+)[^>]*aria-hidden="true"[^>]*>.*?<\/\1>/g, ""))
}

function heading(html: string) {
  return /<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1]
}

test("a member's record opens with their name as the page's heading, beside their avatar hidden from assistive technologies, then their standing and their username, over a decorative rule", () => {
  const html = renderToStaticMarkup(<RecordHeader record={LYRA} />)

  expect(heading(html)).toBe("Lyra des Brumes")
  expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>.*?LD/)
  expect(html).toMatch(/<div aria-hidden="true"[^>]*><span/)
  expect(visibleText(html)).toBe("Lyra des BrumesMembre du serveur@lyra_gates")
})

test("the header leaves the account's ID to the details", () => {
  expect(
    text(renderToStaticMarkup(<RecordHeader record={LYRA} />))
  ).not.toContain(LYRA.id)
})

const STANDINGS: [string, Standing, string][] = [
  [
    "a timed-out member's header says until when, in Paris time",
    {
      kind: "member",
      joinedAt: null,
      roles: [],
      timedOutUntil: new Date("2099-11-02T18:30:00.000Z"),
    },
    "Exclu jusqu’au 2 nov. 2099, 19:30",
  ],
  [
    "a banned account's header says it is banned",
    { kind: "banned", reason: null, staffMemberName: null },
    "Compte banni",
  ],
  [
    "an absent account's header says it is not on the Discord server",
    { kind: "absent" },
    "Absent du serveur",
  ],
]

test.each(STANDINGS)("%s", (_, standing, badge) => {
  const html = renderToStaticMarkup(
    <RecordHeader record={{ ...LYRA, standing }} />
  )

  expect(visibleText(html)).toBe(`Lyra des Brumes${badge}@lyra_gates`)
})

test("an ID that names no account keeps « Fiche » as the page's heading, and says so", () => {
  const html = renderToStaticMarkup(<RecordHeader record={null} />)

  expect(heading(html)).toBe("Fiche")
  expect(visibleText(html)).toBe("FicheAucun compte Discord n’a cet ID.")
})
