import { expect, test } from "vitest"

import { highestRoleRankOf, rolesByHierarchy } from "./role-hierarchy"

test("roles are ranked from the highest position to the lowest, and two of the same position by ID, the lower one first, whatever the order they come in", () => {
  const roles = [
    { id: "1300000000000000005", name: "Citoyen", position: 1 },
    { id: "1300000000000000009", name: "Récent", position: 4 },
    { id: "1300000000000000002", name: "Conseil", position: 6 },
    { id: "1300000000000000003", name: "Ancien", position: 4 },
    { id: "1300000000000000001", name: "@everyone", position: 0 },
  ]

  expect(rolesByHierarchy(roles).map(({ name }) => name)).toEqual([
    "Conseil",
    "Ancien",
    "Récent",
    "Citoyen",
    "@everyone",
  ])
  expect(rolesByHierarchy(roles.toReversed())).toEqual(rolesByHierarchy(roles))
})

test("IDs are compared as numbers, not as text, so that a longer ID is the higher one", () => {
  const short = { id: "999999999999999999", name: "Court", position: 2 }
  const long = { id: "1000000000000000000", name: "Long", position: 2 }

  expect(rolesByHierarchy([long, short]).map(({ name }) => name)).toEqual([
    "Court",
    "Long",
  ])
})

test("a member's highest role ranks by its place in the hierarchy, 0 for the highest, whatever the order their roles are held in, and none when they hold no listed role", () => {
  const hierarchy = rolesByHierarchy([
    { id: "1300000000000000001", name: "Bas", position: 1 },
    { id: "1300000000000000002", name: "Haut", position: 5 },
    { id: "1300000000000000003", name: "Milieu", position: 3 },
  ])

  expect(
    highestRoleRankOf(["1300000000000000001", "1300000000000000003"], hierarchy)
  ).toBe(1)
  expect(
    highestRoleRankOf(["1300000000000000003", "1300000000000000002"], hierarchy)
  ).toBe(0)
  expect(highestRoleRankOf(["1300000000000000001"], hierarchy)).toBe(2)
  expect(highestRoleRankOf([], hierarchy)).toBeNull()
  expect(highestRoleRankOf(["1300000000000000099"], hierarchy)).toBeNull()
})

test("ranking leaves the roles it was given as they were", () => {
  const roles = [
    { id: "1300000000000000002", name: "Bas", position: 1 },
    { id: "1300000000000000001", name: "Haut", position: 5 },
  ]

  rolesByHierarchy(roles)

  expect(roles.map(({ name }) => name)).toEqual(["Bas", "Haut"])
})
