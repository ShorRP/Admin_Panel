import { expect, test } from "vitest"

import { NO_FILTERS } from "./bot-log-filters"
import { botLogHref, hiddenFieldsOf } from "./bot-log-href"

test("no filter leads to the page itself", () => {
  expect(botLogHref(NO_FILTERS)).toBe("/bot-log")
})

test("the filters set are written in the order of the form's fields, and the cursor last", () => {
  expect(
    botLogHref({
      family: "tickets",
      action: "Ticket fermé",
      account: "lyra",
      channel: "ticket-0042",
      text: "résolu",
      from: "2026-11-01",
      to: "2026-11-05",
      before: "1568500000000000000",
    })
  ).toBe(
    "/bot-log?family=tickets&action=Ticket+ferm%C3%A9&account=lyra&channel=ticket-0042&text=r%C3%A9solu&from=2026-11-01&to=2026-11-05&before=1568500000000000000"
  )
})

test("a filter left out is not written", () => {
  expect(botLogHref({ ...NO_FILTERS, account: "lyra" })).toBe(
    "/bot-log?account=lyra"
  )
})

test("the form keeps the family, which its pills choose, in a hidden field, and nothing else", () => {
  expect(hiddenFieldsOf(NO_FILTERS)).toEqual([])
  expect(hiddenFieldsOf({ ...NO_FILTERS, family: "voice-channels" })).toEqual([
    { name: "family", value: "voice-channels" },
  ])
})
