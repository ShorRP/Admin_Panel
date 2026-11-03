import { expect, test } from "vitest"

import {
  choiceChipsOf,
  choiceFieldsOf,
  withoutChoices,
} from "./account-choices"
import type { AccountListFilters } from "./account-list-filters"

const NO_FILTERS: AccountListFilters = {
  query: null,
  role: null,
  standing: null,
  joined: null,
  created: null,
  bots: null,
  sort: null,
}

const ROLES = [
  { id: "1300000000000000002", name: "Scribe" },
  { id: "1300000000000000001", name: "Garde de Blancherive" },
]

test("the six choices come in the order of the form, each with its name, its label and its options, the first of which stands for no filter", () => {
  const fields = choiceFieldsOf(ROLES)

  expect(fields.map(({ name, label }) => [name, label])).toEqual([
    ["role", "Rôle"],
    ["standing", "État"],
    ["joined", "Arrivée sur le serveur"],
    ["created", "Âge du compte Discord"],
    ["bots", "Comptes de bot"],
    ["sort", "Trier par"],
  ])
  for (const { name, choices } of fields) {
    expect(choices[0]?.value, name).toBe("")
  }
})

test("the role choice lists « Tous les rôles », « Aucun rôle » and then each role it is given, in the order given", () => {
  expect(choiceFieldsOf(ROLES)[0]?.choices).toEqual([
    { value: "", label: "Tous les rôles" },
    { value: "none", label: "Aucun rôle" },
    { value: "1300000000000000002", label: "Scribe" },
    { value: "1300000000000000001", label: "Garde de Blancherive" },
  ])
})

test("with no choice set, no chip shows, whatever the search", () => {
  expect(choiceChipsOf(NO_FILTERS, ROLES)).toEqual([])
  expect(choiceChipsOf({ ...NO_FILTERS, query: "ald" }, ROLES)).toEqual([])
})

test("each choice that differs from its first option shows as a chip named by its field, with the label of the option, in the order of the form", () => {
  const chips = choiceChipsOf(
    {
      query: null,
      role: "1300000000000000001",
      standing: "members",
      joined: "over-1y",
      created: "30d",
      bots: "shown",
      sort: "joined-recent",
    },
    ROLES
  )

  expect(chips.map(({ name, value }) => [name, value])).toEqual([
    ["Rôle", "Garde de Blancherive"],
    ["État", "Membres"],
    ["Arrivée sur le serveur", "Plus d’un an"],
    ["Âge du compte Discord", "Moins de 30 jours"],
    ["Comptes de bot", "Affichés"],
    ["Trier par", "Arrivée récente"],
  ])
})

test("« Aucun rôle » shows as a chip too", () => {
  expect(
    choiceChipsOf({ ...NO_FILTERS, role: "none" }, ROLES).map(
      ({ name, value }) => [name, value]
    )
  ).toEqual([["Rôle", "Aucun rôle"]])
})

test("a chip leads to the list without its choice, keeping the search and the other choices, on its first page", () => {
  const chips = choiceChipsOf(
    {
      ...NO_FILTERS,
      query: "ald",
      standing: "members",
      sort: "role",
    },
    ROLES
  )

  expect(chips.map(({ href }) => href)).toEqual([
    "/records?query=ald&sort=role",
    "/records?query=ald&standing=members",
  ])
})

test("the last chip left leads to the list with nothing but the search, or to the list itself when nothing was searched", () => {
  expect(
    choiceChipsOf({ ...NO_FILTERS, standing: "banned" }, ROLES).map(
      ({ href }) => href
    )
  ).toEqual(["/records"])
  expect(
    choiceChipsOf({ ...NO_FILTERS, query: "ald", sort: "role" }, ROLES).map(
      ({ href }) => href
    )
  ).toEqual(["/records?query=ald"])
})

test("without its choices, the filters keep the search alone", () => {
  expect(
    withoutChoices({
      query: "ald",
      role: "none",
      standing: "banned",
      joined: "7d",
      created: "7d",
      bots: "shown",
      sort: "role",
    })
  ).toEqual({ ...NO_FILTERS, query: "ald" })
})
