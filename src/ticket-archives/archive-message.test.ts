import { expect, test } from "vitest"

import { archiveEmbed } from "./archive-message"

test("the test archive is the embed ShorBot posts: its title, its six fields in their order and formats, with the ID in plain text beside each mention and no conversation", () => {
  const embed = archiveEmbed({
    openerId: "1400000000000000001",
    closerId: "1400000000000000002",
    kind: "🚨 Signaler un joueur",
    openedAt: new Date(1762180330 * 1000),
    closedAt: new Date(1762182659 * 1000),
    reason: "Signalement traité",
  })

  expect(embed).toEqual({
    title: "\u{1F5C4}️ ARCHIVE D'UN TICKET",
    color: 0xffffff,
    footer: { text: "Shor — archives des tickets" },
    fields: [
      {
        name: "Ouvert par",
        value: "<@1400000000000000001> (`1400000000000000001`)",
        inline: true,
      },
      {
        name: "Fermé par",
        value: "<@1400000000000000002> (`1400000000000000002`)",
        inline: true,
      },
      { name: "Type de demande", value: "🚨 Signaler un joueur", inline: true },
      { name: "Ouvert le", value: "<t:1762180330:F>", inline: true },
      { name: "Fermé le", value: "<t:1762182659:F>", inline: true },
      { name: "Motif", value: "Signalement traité", inline: false },
    ],
  })
})

test("the test archive of a request kind ShorBot could not read says « Inconnu »", () => {
  const embed = archiveEmbed({ openerId: "1400000000000000001", kind: null })

  expect(
    embed.fields?.find(({ name }) => name === "Type de demande")?.value
  ).toBe("Inconnu")
})
