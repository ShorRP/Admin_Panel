import { expect, test } from "vitest"

import { messageTextsOf, rawMessageOf } from "./message-texts"

test("a message with no embed is its content", () => {
  expect(rawMessageOf({ content: "  Redémarrage  ", embeds: [] })).toEqual({
    title: "Redémarrage",
    fields: [],
  })
})

test("a message with neither content nor embed has no title and no text", () => {
  expect(rawMessageOf({ content: " ", embeds: [] })).toEqual({
    title: null,
    fields: [],
  })
})

test("an embed gives its title, then every other text it shows in the order Discord shows it", () => {
  expect(
    rawMessageOf({
      content: "Annonce",
      embeds: [
        {
          title: "Serveur redémarré",
          author: { name: "Skyrim" },
          description: "Redémarrage planifié",
          fields: [{ name: "Durée", value: "12 s", inline: true }],
          footer: { text: "pied" },
        },
      ],
    })
  ).toEqual({
    title: "Serveur redémarré",
    fields: [
      { name: null, value: "Annonce" },
      { name: null, value: "Skyrim" },
      { name: null, value: "Redémarrage planifié" },
      { name: "Durée", value: "12 s" },
      { name: null, value: "pied" },
    ],
  })
})

test("the first embed with a title is the main one, and the others follow with their title", () => {
  expect(
    rawMessageOf({
      content: "",
      embeds: [
        { description: "sans titre" },
        { title: "Principal", description: "texte" },
        { title: "Autre", fields: [{ name: "a", value: "b" }] },
      ],
    })
  ).toEqual({
    title: "Principal",
    fields: [
      { name: null, value: "texte" },
      { name: null, value: "sans titre" },
      { name: null, value: "Autre" },
      { name: "a", value: "b" },
    ],
  })
})

test("an embed with no title gives no title", () => {
  expect(
    rawMessageOf({ content: "", embeds: [{ description: "seulement" }] })
  ).toEqual({ title: null, fields: [{ name: null, value: "seulement" }] })
})

test("every text of a message is searchable on its own: its content, its titles, field names and values, descriptions, authors and footers", () => {
  expect(
    messageTextsOf({
      content: "Annonce",
      embeds: [
        {
          title: "Titre",
          author: { name: "Auteur" },
          description: "Description",
          fields: [{ name: "Nom", value: "Valeur", inline: true }],
          footer: { text: "Pied" },
        },
        { fields: [{ name: "Autre", value: "Texte" }] },
      ],
    }).toSorted()
  ).toEqual(
    [
      "Annonce",
      "Titre",
      "Auteur",
      "Description",
      "Nom",
      "Valeur",
      "Pied",
      "Autre",
      "Texte",
    ].toSorted()
  )
})

test("a message with nothing to read has no text", () => {
  expect(messageTextsOf({ content: "", embeds: [{}] })).toEqual([])
})
