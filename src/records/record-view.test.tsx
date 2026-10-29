import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import type { SanctionOptions } from "@/sanctions/sanction-options"
import type { AccountRecord } from "./read-record"
import { RecordView } from "./record-view"

const LYRA: AccountRecord = {
  id: "1400000000000000003",
  name: "Lyra des Brumes",
  nick: "Lyra des Brumes",
  globalName: "Lyra",
  username: "lyra_gates",
  avatarUrl: null,
  createdAt: new Date("2016-04-30T11:18:25.796Z"),
  standing: {
    kind: "member",
    joinedAt: null,
    roles: [],
    timedOutUntil: null,
  },
}

const REFUSED: SanctionOptions = {
  kind: "refused",
  reason: "Tu ne peux pas sanctionner ce membre.",
}

function regions(html: string) {
  return Array.from(
    html.matchAll(/<section aria-labelledby="([^"]+)"/g),
    ([, id]) => id
  )
}

function sanctionsColumnHidden(html: string) {
  return /<div hidden=""[^>]*><section aria-labelledby="sanctions"/.test(html)
}

test("a record shows its header, then its details, its sanctions and its history", () => {
  const html = renderToStaticMarkup(
    <RecordView record={LYRA} options={REFUSED} history={[]} />
  )

  expect(/<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1]).toBe("Lyra des Brumes")
  expect(regions(html)).toEqual([
    "record-details",
    "sanctions",
    "sanction-history",
  ])
  expect(sanctionsColumnHidden(html)).toBe(false)
})

test("a record that offers no sanction hides the column of its sanctions, which stays in the page", () => {
  const html = renderToStaticMarkup(
    <RecordView
      record={{ ...LYRA, standing: { kind: "absent" } }}
      options={{ kind: "none" }}
      history={[]}
    />
  )

  expect(regions(html)).toEqual([
    "record-details",
    "sanctions",
    "sanction-history",
  ])
  expect(sanctionsColumnHidden(html)).toBe(true)
})

test("an ID that names no account shows its header alone", () => {
  const html = renderToStaticMarkup(
    <RecordView record={null} options={{ kind: "none" }} history={null} />
  )

  expect(/<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1]).toBe("Fiche")
  expect(regions(html)).toEqual([])
})
