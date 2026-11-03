import { Search, type LucideIcon } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import type { AccountListFilters } from "./account-list-filters"
import { AccountSearchForm } from "./account-search-form"

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

function render(filters: AccountListFilters = NO_FILTERS, roles = ROLES) {
  return renderToStaticMarkup(
    <AccountSearchForm filters={filters} roles={roles} />
  )
}

function drawing(Icon: LucideIcon) {
  return /<svg[^>]*>(.*)<\/svg>/.exec(renderToStaticMarkup(<Icon />))?.[1]
}

function attribute(tag: string, name: string) {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

function choiceOf(html: string, name: string) {
  const select = new RegExp(
    `<select[^>]*\\sname="${name}"[^>]*>(.*?)</select>`
  ).exec(html)
  const tag = new RegExp(`<select[^>]*\\sname="${name}"[^>]*>`).exec(html)?.[0]
  const id = attribute(tag ?? "", "id")
  const label = new RegExp(
    `<label[^>]*\\sfor="${id}"[^>]*>([^<]*)</label>`
  ).exec(html)?.[1]
  const options = Array.from(
    (select?.[1] ?? "").matchAll(/<option([^>]*)>([^<]*)<\/option>/g),
    ([, attributes = "", text]) => ({
      value: attribute(attributes, "value"),
      text,
      selected: /\sselected(=|\s|>|$)/.test(attributes),
    })
  )
  return { label, options }
}

function selectedOf(html: string, name: string) {
  return choiceOf(html, name).options.filter(({ selected }) => selected)
}

test("the search sends its fields to /records by GET, the text under the label « Compte », holding what was searched", () => {
  const html = render({ ...NO_FILTERS, query: "ald" })
  const form = /<form[^>]*>/.exec(html)?.[0] ?? ""
  const field = /<input[^>]*>/.exec(html)?.[0] ?? ""
  const [, labelFor, label] =
    /<label[^>]*\sfor="([^"]*)"[^>]*>([^<]*)<\/label>/.exec(html) ?? []

  expect(attribute(form, "action")).toBe("/records")
  expect(attribute(form, "method")).toBeUndefined()
  expect(attribute(field, "name")).toBe("query")
  expect(attribute(field, "value")).toBe("ald")
  expect(label).toBe("Compte")
  expect(attribute(field, "id")).toBe(labelFor)
  expect(html).not.toMatch(/\s(required|maxLength|pattern)=/)
})

test("the search field holds nothing when nothing was searched", () => {
  const field = /<input[^>]*>/.exec(render())?.[0] ?? ""

  expect(attribute(field, "value")).toBe("")
})

test("the search's button reads « Chercher », after a hidden search icon", () => {
  const html = render()
  const [, iconAttributes = "", iconDrawing, text] =
    /<button[^>]*type="submit"[^>]*><svg([^>]*)>(.*?)<\/svg>(.*?)<\/button>/.exec(
      html
    ) ?? []

  expect({
    icon: iconDrawing,
    iconHidden: /\saria-hidden="true"/.test(iconAttributes),
    text,
  }).toEqual({ icon: drawing(Search), iconHidden: true, text: "Chercher" })
})

test("the search's field suggests what it takes, beside a search icon hidden from assistive technologies", () => {
  const html = render()
  const field = /<input[^>]*>/.exec(html)?.[0] ?? ""
  const [, iconAttributes = "", iconDrawing] =
    /<svg([^>]*)>(.*?)<\/svg><input/.exec(html) ?? []

  expect({
    placeholder: attribute(field, "placeholder"),
    icon: iconDrawing,
    iconHidden: /\saria-hidden="true"/.test(iconAttributes),
  }).toEqual({
    placeholder: "Nom, pseudo, ID ou mention",
    icon: drawing(Search),
    iconHidden: true,
  })
})

test("the field comes first, then the six choices, each a native select under a visible label, then the button", () => {
  const html = render()
  const order = [
    html.indexOf('name="query"'),
    html.indexOf('name="role"'),
    html.indexOf('name="standing"'),
    html.indexOf('name="joined"'),
    html.indexOf('name="created"'),
    html.indexOf('name="bots"'),
    html.indexOf('name="sort"'),
    html.indexOf('type="submit"'),
  ]

  expect(order.every((position) => position > 0)).toBe(true)
  expect(order).toEqual(order.toSorted((left, right) => left - right))
  expect(
    ["role", "standing", "joined", "created", "bots", "sort"].map(
      (name) => choiceOf(html, name).label
    )
  ).toEqual([
    "Rôle",
    "État",
    "Arrivée sur le serveur",
    "Âge du compte Discord",
    "Comptes de bot",
    "Trier par",
  ])
})

test("the role choice lists every role it is given, in the order given, after « Tous les rôles » and « Aucun rôle »", () => {
  expect(choiceOf(render(), "role").options).toEqual([
    { value: "", text: "Tous les rôles", selected: true },
    { value: "none", text: "Aucun rôle", selected: false },
    { value: "1300000000000000002", text: "Scribe", selected: false },
    {
      value: "1300000000000000001",
      text: "Garde de Blancherive",
      selected: false,
    },
  ])
})

test("each other choice offers its choices, the first of which stands for no filter and has an empty value", () => {
  const html = render()

  const values = (name: string) =>
    choiceOf(html, name).options.map(({ value, text }) => [value, text])
  expect(values("standing")).toEqual([
    ["", "Tous les comptes"],
    ["members", "Membres"],
    ["timed-out", "Exclus en ce moment"],
    ["banned", "Bannis"],
  ])
  expect(values("joined")).toEqual([
    ["", "Toutes les dates"],
    ["7d", "7 derniers jours"],
    ["30d", "30 derniers jours"],
    ["6m", "6 derniers mois"],
    ["over-1y", "Plus d’un an"],
  ])
  expect(values("created")).toEqual([
    ["", "Tous les âges"],
    ["7d", "Moins de 7 jours"],
    ["30d", "Moins de 30 jours"],
  ])
  expect(values("bots")).toEqual([
    ["", "Masqués"],
    ["shown", "Affichés"],
  ])
  expect(values("sort")).toEqual([
    ["", "Nom"],
    ["joined-recent", "Arrivée récente"],
    ["joined-old", "Arrivée ancienne"],
    ["role", "Rôle le plus haut"],
  ])
})

test("with no filter in the URL, each choice opens on its first, empty, option", () => {
  const html = render()

  for (const name of [
    "role",
    "standing",
    "joined",
    "created",
    "bots",
    "sort",
  ]) {
    expect(selectedOf(html, name), name).toEqual([
      expect.objectContaining({ value: "" }),
    ])
  }
})

test("each choice opens on the value of the URL", () => {
  const html = render({
    query: "ald",
    role: "1300000000000000001",
    standing: "timed-out",
    joined: "over-1y",
    created: "30d",
    bots: "shown",
    sort: "joined-old",
  })

  expect(
    ["role", "standing", "joined", "created", "bots", "sort"].map((name) =>
      selectedOf(html, name).map(({ value }) => value)
    )
  ).toEqual([
    ["1300000000000000001"],
    ["timed-out"],
    ["over-1y"],
    ["30d"],
    ["shown"],
    ["joined-old"],
  ])
})

test("« Aucun rôle » opens selected when the URL asks for no role", () => {
  expect(selectedOf(render({ ...NO_FILTERS, role: "none" }), "role")).toEqual([
    { value: "none", text: "Aucun rôle", selected: true },
  ])
})

function filtersButton(html: string) {
  return /<button([^>]*)>(?:(?!<\/button>).)*Filtres(?:(?!<\/button>).)*<\/button>/.exec(
    html
  )
}

test("a button « Filtres » comes between the search and the choices, opens a dialog and sends nothing, so that « Chercher » stays the form's one submit", () => {
  const html = render()
  const button = filtersButton(html)

  expect(attribute(button?.[1] ?? "", "type")).toBe("button")
  expect(attribute(button?.[1] ?? "", "aria-haspopup")).toBe("dialog")
  expect(html.indexOf('name="query"')).toBeLessThan(html.indexOf(">Filtres"))
  expect(html.indexOf(">Filtres")).toBeLessThan(html.indexOf('name="role"'))
  expect(html.match(/type="submit"/g)).toHaveLength(1)
})

test("with no choice set, « Filtres » counts none and no chip shows", () => {
  const html = render({ ...NO_FILTERS, query: "ald" })

  expect(filtersButton(html)?.[0].replace(/<[^>]*>/g, "")).toBe("Filtres")
  expect(html).not.toContain("<ul")
})

test("« Filtres » counts the choices set, not the search, in words for assistive technologies", () => {
  const html = render({
    ...NO_FILTERS,
    query: "ald",
    standing: "members",
    sort: "role",
  })

  expect(filtersButton(html)?.[0].replace(/<[^>]*>/g, "")).toBe(
    "Filtres22 filtres actifs"
  )
})

test("each choice set shows under the search as a chip, a link to the list without it, keeping the search and the other choices", () => {
  const html = render({
    ...NO_FILTERS,
    query: "ald",
    standing: "members",
    sort: "role",
  })
  const chips = Array.from(
    /<ul[^>]*>(.*?)<\/ul>/.exec(html)?.[1]?.matchAll(/<a([^>]*)>(.*?)<\/a>/g) ??
      [],
    ([, attributes = "", content = ""]) => ({
      href: attribute(attributes, "href")?.replaceAll("&amp;", "&"),
      name: content.replace(/<[^>]*>/g, ""),
    })
  )

  expect(chips).toEqual([
    {
      href: "/records?query=ald&sort=role",
      name: "Retirer le filtre État : Membres",
    },
    {
      href: "/records?query=ald&standing=members",
      name: "Retirer le filtre Trier par : Rôle le plus haut",
    },
  ])
})
