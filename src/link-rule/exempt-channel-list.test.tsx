import { CircleAlert, X, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { ExemptChannelList } from "./exempt-channel-list"
import type { ExemptChannel } from "./read-link-rule"
import type { ChannelFields, WriteResult } from "./write-result"

const GALLERY: ExemptChannel = { id: "11", name: "galerie", category: false }

const GAMES: ExemptChannel = { id: "12", name: "Jeux", category: true }

function render(
  channels: ExemptChannel[],
  state: WriteResult<ChannelFields> | null = null,
  pending = false
) {
  return renderToStaticMarkup(
    <ExemptChannelList
      channels={channels}
      state={state}
      pending={pending}
      action={() => {}}
    />
  )
}

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function region(html: string, role: "status" | "alert") {
  const content =
    new RegExp(`<p role="${role}"[^>]*>(.*?)</p>`).exec(html)?.[1] ?? ""
  return {
    icon: /<svg[^>]*>(.*?)<\/svg>/.exec(content)?.[1],
    text: content.replace(/<[^>]*>/g, ""),
  }
}

function chips(html: string) {
  return Array.from(
    html.matchAll(/<li[^>]*>(.*?)<\/li>/g),
    ([, chip = ""]) => ({
      name: /^<span[^>]*>([^<]*)<\/span>/.exec(chip)?.[1],
      sent: /<input[^>]*type="hidden"[^>]*name="channel"[^>]*value="([^"]*)"/.exec(
        chip
      )?.[1],
      cross: /<button[^>]*>(?:<svg([^>]*)>(.*?)<\/svg>)(.*?)<\/button>/
        .exec(chip)
        ?.slice(1),
      disabled: /<button[^>]*\sdisabled=""/.test(chip),
    })
  )
}

function chip(id: string, name: string, crossName: string, disabled = false) {
  return {
    name,
    sent: id,
    cross: [
      expect.stringContaining('aria-hidden="true"'),
      drawing(X),
      `<span class="sr-only">${crossName}</span>`,
    ],
    disabled,
  }
}

const GALLERY_CHIP = chip("11", "#galerie", "Retirer « #galerie »")

const GAMES_CHIP = chip(
  "12",
  "Jeux (catégorie)",
  "Retirer « Jeux (catégorie) »"
)

const EMPTY = { icon: undefined, text: "" }

test("each exempt channel is a chip with a cross that sends its ID, a channel under its # and a category under its name followed by « (catégorie) », whose hidden icon leaves the cross the name « Retirer « salon » » for assistive technologies", () => {
  const html = render([GALLERY, GAMES])

  expect(chips(html)).toEqual([GALLERY_CHIP, GAMES_CHIP])
})

test("the cross submits at once: it asks for no confirmation, since adding the channel back undoes it", () => {
  const html = render([GALLERY])

  expect(html).toMatch(/<button[^>]*type="submit"/)
  expect(html).not.toContain("aria-haspopup")
})

test("a channel that Discord does not list shows as « Salon introuvable » and keeps its cross, which sends its ID", () => {
  const html = render([{ id: "99", name: null, category: false }])

  expect(chips(html)).toEqual([
    chip("99", "Salon introuvable", "Retirer « Salon introuvable » (99)"),
  ])
})

test("two channels that Discord does not list read alike in the list and are told apart by their ID in the name of their cross", () => {
  const html = render([
    { id: "98", name: null, category: false },
    { id: "99", name: null, category: false },
  ])

  expect(chips(html).map(({ name, cross }) => [name, cross?.[2]])).toEqual([
    [
      "Salon introuvable",
      '<span class="sr-only">Retirer « Salon introuvable » (98)</span>',
    ],
    [
      "Salon introuvable",
      '<span class="sr-only">Retirer « Salon introuvable » (99)</span>',
    ],
  ])
})

test("a channel name is escaped in the chip and in the cross's name", () => {
  const html = render([{ id: "13", name: '"><script>', category: false }])

  expect(html).not.toContain('"><script>')
  expect(chips(html)).toEqual([
    chip(
      "13",
      "#&quot;&gt;&lt;script&gt;",
      "Retirer « #&quot;&gt;&lt;script&gt; »"
    ),
  ])
})

test("with no exempt channel the list draws no list", () => {
  const html = render([])

  expect(html).not.toContain("<ul")
  expect(chips(html)).toEqual([])
})

test("with nothing written, the status and alert regions are empty", () => {
  const html = render([GALLERY])

  expect(region(html, "status")).toEqual(EMPTY)
  expect(region(html, "alert")).toEqual(EMPTY)
})

test("while a write is pending, every cross is disabled and the status region reads « Envoi en cours… »", () => {
  const html = render([GALLERY, GAMES], null, true)

  expect(chips(html)).toEqual([
    chip("11", "#galerie", "Retirer « #galerie »", true),
    chip("12", "Jeux (catégorie)", "Retirer « Jeux (catégorie) »", true),
  ])
  expect(region(html, "status")).toEqual({
    icon: undefined,
    text: "Envoi en cours…",
  })
})

test("a refused removal shows its message in the alert region, after a hidden alert icon", () => {
  const html = render([GALLERY], {
    ok: false,
    message: "La règle des liens n’existe pas encore.",
    channel: "11",
  })

  expect(region(html, "alert")).toEqual({
    icon: drawing(CircleAlert),
    text: "La règle des liens n’existe pas encore.",
  })
})
