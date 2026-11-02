import { expect, test } from "vitest"

import { accountListFormOf } from "./account-list-filters"

const GUILD_ID = "1100000000000000000"

const ROLES = [
  { id: GUILD_ID, name: "@everyone", position: 0 },
  { id: "1300000000000000001", name: "Citoyen", position: 1 },
  { id: "1300000000000000002", name: "Scribe", position: 7 },
  { id: "1300000000000000003", name: "Garde", position: 3 },
]

test("the roles offered by the form are the roles of the Discord server but @everyone, from the highest to the lowest", () => {
  const { roles } = accountListFormOf({}, ROLES, GUILD_ID)

  expect(roles).toEqual([
    { id: "1300000000000000002", name: "Scribe" },
    { id: "1300000000000000003", name: "Garde" },
    { id: "1300000000000000001", name: "Citoyen" },
  ])
})

test("a filter in the URL is kept as it is when it is one of its choices, a role among the roles offered, the text searched without the spaces around it", () => {
  const { filters } = accountListFormOf(
    {
      query: "  Alda la Noire ",
      role: "1300000000000000003",
      standing: "banned",
      joined: "6m",
      created: "7d",
      bots: "shown",
      sort: "role",
      page: "3",
    },
    ROLES,
    GUILD_ID
  )

  expect(filters).toEqual({
    query: "Alda la Noire",
    role: "1300000000000000003",
    standing: "banned",
    joined: "6m",
    created: "7d",
    bots: "shown",
    sort: "role",
  })
})

test("the choice « Aucun rôle » is kept, and a role that is not offered, @everyone included, counts as absent", () => {
  expect(
    accountListFormOf({ role: "none" }, ROLES, GUILD_ID).filters.role
  ).toBe("none")
  for (const role of [GUILD_ID, "1300000000000000099", "None", "", 7]) {
    expect(
      accountListFormOf({ role }, ROLES, GUILD_ID).filters.role,
      JSON.stringify(role)
    ).toBeNull()
  }
})

test("a value that is not one of its choices, a blank text, an empty value or a repeated one counts as absent", () => {
  const empty = {
    query: null,
    role: null,
    standing: null,
    joined: null,
    created: null,
    bots: null,
    sort: null,
  }

  expect(
    accountListFormOf(
      {
        query: "   ",
        role: "",
        standing: "",
        joined: "1y",
        created: "90d",
        bots: "hidden",
        sort: "name",
      },
      ROLES,
      GUILD_ID
    ).filters
  ).toEqual(empty)
  expect(
    accountListFormOf(
      {
        query: ["a", "b"],
        role: ["1300000000000000003", "1300000000000000002"],
        standing: ["banned"],
        joined: ["7d", "7d"],
        created: ["7d"],
        bots: ["shown"],
        sort: ["role"],
      },
      ROLES,
      GUILD_ID
    ).filters
  ).toEqual(empty)
})
