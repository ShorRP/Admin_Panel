import { expect, test } from "vitest"

import { accountIdOf } from "./account-id"

const ID = "1400000000000000002"

test("an ID, or a mention of one, names that account's ID", () => {
  for (const text of [ID, `<@${ID}>`, `<@!${ID}>`]) {
    expect(accountIdOf(text)).toBe(ID)
  }
})

test("any other text names no ID, a name made of digits too short for an ID included", () => {
  for (const text of [
    "",
    "aldis",
    "12345",
    `${ID}1234567`,
    `<@${ID}`,
    `<@&${ID}>`,
    ` <@${ID}>`,
    "99999999999999999999",
  ]) {
    expect(accountIdOf(text)).toBeNull()
  }
})
