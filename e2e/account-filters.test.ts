import { MODERATION_ROLE_ID, STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"
import { resize, settle } from "./settle"

const DAY_MS = 24 * 60 * 60 * 1000

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const GUARD = { id: "1300000000000000010", name: "Garde", position: 3 }

const SCRIBE = { id: "1300000000000000011", name: "Scribe", position: 7 }

const NOW = Date.now()

function daysAgo(days: number) {
  return new Date(NOW - days * DAY_MS).toISOString()
}

function numbered(prefix: string, count: number, firstId: string) {
  return Array.from({ length: count }, (_, index) => ({
    id: (BigInt(firstId) + BigInt(index)).toString(),
    username: `${prefix}-${String(index).padStart(2, "0")}`,
  }))
}

const GUARDS = numbered("garde", 30, "1400000000000001000")

const SCRIBES = numbered("scribe", 3, "1400000000000002000")

const ERRANTS = numbered("errant", 2, "1400000000000003000")

const EXILES = numbered("exile", 2, "1400000000000004000")

const HELPER = { id: "1400000000000005000", username: "helper-bot", bot: true }

const TIMED_OUT = GUARDS[5]

if (TIMED_OUT === undefined) {
  throw new Error("The guards lack a member to time out.")
}

test.use({
  discordState: {
    roles: [GUARD, SCRIBE],
    members: [
      {
        user: ALDIS,
        roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID],
        joined_at: daysAgo(200),
      },
      ...GUARDS.map((user, index) => ({
        user,
        roles: [GUARD.id],
        joined_at: daysAgo(index % 2 === 0 ? 3 : 100),
        ...(user.id === TIMED_OUT.id
          ? { communication_disabled_until: "2099-11-02T18:30:00.000000+00:00" }
          : {}),
      })),
      ...SCRIBES.map((user) => ({
        user,
        roles: [SCRIBE.id],
        joined_at: daysAgo(400),
      })),
      ...ERRANTS.map((user) => ({
        user,
        joined_at: daysAgo(10),
      })),
      { user: HELPER, joined_at: daysAgo(10) },
    ],
    bans: EXILES.map((user) => ({ user })),
  },
})

const MEMBERS_AND_BANS = 1 + 30 + 3 + 2 + 2

function ranks(first: number, last: number, total: number) {
  return first === last
    ? `${first} sur ${total}`
    : `${first}–${last} sur ${total}`
}

const CHOICE_LABELS = [
  "Rôle",
  "État",
  "Arrivée sur le serveur",
  "Âge du compte Discord",
  "Comptes de bot",
  "Trier par",
]

const SENT_KEYS = [
  "query",
  "role",
  "standing",
  "joined",
  "created",
  "bots",
  "sort",
]

function sent(values: Record<string, string>) {
  const fields = [
    "query",
    "role",
    "standing",
    "joined",
    "created",
    "bots",
    "sort",
  ]
  return `/records?${fields.map((name) => `${name}=${values[name] ?? ""}`).join("&")}`
}

const COMBINED = sent({
  query: "garde",
  role: GUARD.id,
  standing: "members",
  sort: "joined-recent",
})

test("a staff member who moderates filters, sorts and searches the list in one form, goes through the pages, and the URL keeps all of it, which reopens the same list", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")
  const rows = (range: string) =>
    main.getByRole("list", { name: range }).getByRole("link")
  const pagination = main.getByRole("navigation", { name: "Pages des comptes" })
  const field = page.getByLabel("Compte", { exact: true })
  const role = page.getByLabel("Rôle", { exact: true })
  const sort = page.getByLabel("Trier par", { exact: true })
  const search = page.getByRole("button", { name: "Chercher" })
  const filtered = sent({
    query: "garde",
    role: GUARD.id,
    sort: "joined-recent",
  })

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto("/records")
  await expect(
    main.getByRole("list", { name: ranks(1, 25, MEMBERS_AND_BANS) })
  ).toBeVisible()
  await expect(field).toHaveValue("")
  await expect(role).toHaveValue("")
  await expect(sort).toHaveValue("")
  await checkAccessibility()

  await field.fill("garde")
  await role.selectOption({ label: "Garde" })
  await sort.selectOption({ label: "Arrivée récente" })
  await search.click()
  await expect(page).toHaveURL(filtered)
  await expect(rows(ranks(1, 25, 30))).toHaveCount(25)
  await expect(rows(ranks(1, 25, 30)).nth(0)).toHaveAccessibleName(
    /^garde-00\s*@garde-00\s*Garde$/
  )
  await expect(rows(ranks(1, 25, 30)).nth(14)).toHaveAccessibleName(
    /^garde-28\s*@garde-28\s*Garde$/
  )
  await expect(rows(ranks(1, 25, 30)).nth(15)).toHaveAccessibleName(
    /^garde-01\s*@garde-01\s*Garde$/
  )
  await expect(rows(ranks(1, 25, 30)).nth(17)).toHaveAccessibleName(
    /^garde-05\s*@garde-05\s*Garde\s*Exclu jusqu’au 2 nov\. 2099, 19:30$/
  )
  await expect(field).toHaveValue("garde")
  await expect(role).toHaveValue(GUARD.id)
  await expect(sort).toHaveValue("joined-recent")
  await checkAccessibility()

  await pagination.getByRole("link", { name: "Page suivante" }).click()
  await expect(page).toHaveURL(
    `/records?query=garde&role=${GUARD.id}&sort=joined-recent&page=2`
  )
  await expect(rows(ranks(26, 30, 30))).toHaveCount(5)
  await expect(rows(ranks(26, 30, 30)).nth(0)).toHaveAccessibleName(
    /^garde-21\s*@garde-21\s*Garde$/
  )
  await expect(field).toHaveValue("garde")
  await expect(role).toHaveValue(GUARD.id)
  await expect(sort).toHaveValue("joined-recent")
  await checkAccessibility()

  await search.click()
  await expect(page).toHaveURL(filtered)
  await expect(rows(ranks(1, 25, 30))).toHaveCount(25)

  await page.goto("/records")
  await expect(
    main.getByRole("list", { name: ranks(1, 25, MEMBERS_AND_BANS) })
  ).toBeVisible()
  await page.goto(filtered)
  await expect(rows(ranks(1, 25, 30)).nth(0)).toHaveAccessibleName(
    /^garde-00\s*@garde-00\s*Garde$/
  )
  await expect(field).toHaveValue("garde")
  await expect(role).toHaveValue(GUARD.id)
  await expect(sort).toHaveValue("joined-recent")
  await checkAccessibility()
})

test("the filters combine, « Aucun rôle » and the arrival of the last 30 days keep the members with no role who just came, and a list that keeps no account says so", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")
  const field = page.getByLabel("Compte", { exact: true })
  const search = page.getByRole("button", { name: "Chercher" })

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto("/records?query=garde&role=none&sort=role")
  await expect(
    main.getByText("Aucun compte ne correspond à ta recherche.")
  ).toBeVisible()
  await expect(
    main.getByRole("navigation", { name: "Pages des comptes" })
  ).toHaveCount(0)
  await checkAccessibility()

  await field.fill("")
  await page.getByLabel("Arrivée sur le serveur").selectOption({
    label: "30 derniers jours",
  })
  await search.click()
  await expect(page).toHaveURL(
    sent({ role: "none", joined: "30d", sort: "role" })
  )
  const found = main.getByRole("list", { name: "1–2 sur 2" }).getByRole("link")
  await expect(found).toHaveCount(2)
  await expect(found.nth(0)).toHaveAccessibleName(
    /^errant-00\s*@errant-00\s*Membre du serveur$/
  )
  await expect(found.nth(1)).toHaveAccessibleName(
    /^errant-01\s*@errant-01\s*Membre du serveur$/
  )
  await checkAccessibility()

  await page.getByLabel("État").selectOption({ label: "Bannis" })
  await search.click()
  await expect(
    main.getByText("Aucun compte ne correspond à ta recherche.")
  ).toBeVisible()
  await checkAccessibility()
})

test("bot accounts are left out until the staff ask for them, the application's own account among them", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto("/records?query=h")
  await expect(
    main.getByText("Aucun compte ne correspond à ta recherche.")
  ).toBeVisible()
  await expect(page.getByLabel("Comptes de bot")).toHaveValue("")
  await checkAccessibility()

  await page.getByLabel("Comptes de bot").selectOption({ label: "Affichés" })
  await page.getByRole("button", { name: "Chercher" }).click()
  await expect(page).toHaveURL(sent({ query: "h", bots: "shown" }))
  await expect(
    main.getByRole("list", { name: "1 sur 1" }).getByRole("link")
  ).toHaveAccessibleName(/^helper-bot\s*@helper-bot\s*Membre du serveur$/)
  await checkAccessibility()

  await page.goto("/records?query=shor&bots=shown")
  await expect(
    main.getByRole("list", { name: "1 sur 1" }).getByRole("link")
  ).toHaveAccessibleName(/^Shor Panel\s*@Shor Panel\s*Membre du serveur$/)
  await checkAccessibility()
})

test("the arrival, the account age, the state and the sort are read from the URL, and the choices open on them", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")
  async function names(range: string) {
    const list = main.getByRole("list", { name: range })
    await expect(list).toBeVisible()
    const texts = await list.getByRole("link").allInnerTexts()
    return texts.map((text) => /@(\S+)/.exec(text)?.[1])
  }

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")

  await page.goto("/records?joined=over-1y&sort=joined-old")
  expect(await names("1–3 sur 3")).toEqual([
    "scribe-00",
    "scribe-01",
    "scribe-02",
  ])
  await expect(page.getByLabel("Arrivée sur le serveur")).toHaveValue("over-1y")
  await expect(page.getByLabel("Trier par")).toHaveValue("joined-old")
  await checkAccessibility()

  await page.goto("/records?standing=timed-out")
  expect(await names("1 sur 1")).toEqual(["garde-05"])
  await expect(page.getByLabel("État")).toHaveValue("timed-out")
  await checkAccessibility()

  await page.goto("/records?standing=banned&sort=role")
  expect(await names("1–2 sur 2")).toEqual(["exile-00", "exile-01"])
  await checkAccessibility()

  await page.goto("/records?created=7d")
  await expect(
    main.getByText("Aucun compte ne correspond à ta recherche.")
  ).toBeVisible()
  await expect(page.getByLabel("Âge du compte Discord")).toHaveValue("7d")
  await checkAccessibility()

  await page.goto("/records?sort=role&joined=6m")
  expect((await names("1–25 sur 32"))[0]).toBe("garde-00")
  await checkAccessibility()
})

test("a value that is not one of the choices, a role the Discord server does not list and a page that does not exist count as absent, and the choices open on their first option", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto(
    "/records?role=1300000000000009999&standing=nope&joined=2y&created=1d&bots=yes&sort=name&page=zz"
  )

  await expect(
    main.getByRole("list", { name: ranks(1, 25, MEMBERS_AND_BANS) })
  ).toBeVisible()
  for (const label of [
    "Rôle",
    "État",
    "Arrivée sur le serveur",
    "Âge du compte Discord",
    "Comptes de bot",
    "Trier par",
  ]) {
    await expect(page.getByLabel(label, { exact: true }), label).toHaveValue("")
  }
  await checkAccessibility()
})

test("from 768 px the six choices stay in the form, three to a row at 768 px and four at 1,280 px, the last ones sharing a row with the button, with no  Filtres  and no chip, and the form sends the address of the sheet", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const labels = ["Compte", ...CHOICE_LABELS]
  async function boxes() {
    return await Promise.all(
      labels.map(async (label) => {
        const box = await page.getByLabel(label, { exact: true }).boundingBox()
        if (box === null) {
          throw new Error(`${label} is not shown.`)
        }
        return box
      })
    )
  }
  const button = page.getByRole("button", { name: "Chercher" })

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto("/records?query=garde&standing=members")
  await settle(page)
  await expect(page.getByRole("button", { name: /^Filtres/ })).toBeHidden()
  await expect(page.getByRole("list", { name: "Filtres actifs" })).toBeHidden()
  const wide = await boxes()
  const wideButton = await button.boundingBox()
  const lastRow = wide[5]
  expect(new Set(wide.slice(1, 5).map(({ y }) => y)).size).toBe(1)
  expect(wide[1]?.y).toBeGreaterThan(wide[0]?.y ?? Infinity)
  expect(lastRow?.y).toBeGreaterThan(wide[1]?.y ?? Infinity)
  expect(wide[6]?.y).toBe(lastRow?.y)
  expect(wideButton?.y).toBeGreaterThanOrEqual(lastRow?.y ?? Infinity)
  expect(wideButton?.y).toBeLessThan((lastRow?.y ?? 0) + (lastRow?.height ?? 0))
  await checkAccessibility()

  await resize(page, { width: 768, height: 1024 })
  const medium = await boxes()
  const mediumButton = await button.boundingBox()
  expect(new Set(medium.slice(1, 4).map(({ y }) => y)).size).toBe(1)
  expect(new Set(medium.slice(4, 7).map(({ y }) => y)).size).toBe(1)
  expect(medium[1]?.y).toBeGreaterThan(medium[0]?.y ?? Infinity)
  expect(medium[4]?.y).toBeGreaterThan(medium[1]?.y ?? Infinity)
  expect(mediumButton?.y).toBeGreaterThan(
    (medium[4]?.y ?? 0) + (medium[4]?.height ?? 0)
  )
  await expect(page.getByRole("button", { name: /^Filtres/ })).toBeHidden()
  await expect(page.getByRole("list", { name: "Filtres actifs" })).toBeHidden()
  await checkAccessibility()

  await page
    .getByLabel("Rôle", { exact: true })
    .selectOption({ label: "Garde" })
  await page
    .getByLabel("Trier par", { exact: true })
    .selectOption({ label: "Arrivée récente" })
  await button.click()
  await expect(page).toHaveURL(COMBINED)
})

test.describe("on a 360 px screen", () => {
  test.use({ viewport: { width: 360, height: 760 }, hasTouch: true })

  test(" Filtres  and  Chercher  share a row, the sheet holds the six choices and  Appliquer  lands on the address of the sheet's choices, not of the form of the page, which a search sent from the page keeps, each chip removes one choice and  Réinitialiser  clears them", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    const main = page.getByRole("main")
    const field = page.getByLabel("Compte", { exact: true })
    const filters = page.getByRole("button", { name: /^Filtres/ })
    const search = page.getByRole("button", { name: "Chercher" })
    const sheet = page.getByRole("dialog", { name: "Filtres" })
    const chips = page.getByRole("list", { name: "Filtres actifs" })
    const rows = (range: string) =>
      main.getByRole("list", { name: range }).getByRole("link")

    await logIn(ALDIS)
    await expect(page).toHaveURL("/blocked-words")
    await page.goto("/records?query=garde&standing=members")
    await settle(page)
    for (const label of CHOICE_LABELS) {
      await expect(page.getByLabel(label, { exact: true }), label).toBeHidden()
    }
    await expect(filters).toHaveAccessibleName(/^Filtres\s?1 filtre actif$/)
    await expect(chips.getByRole("link")).toHaveText([
      "Retirer le filtre État : Membres",
    ])
    const [mainBox, fieldBox, filtersBox, searchBox] = await Promise.all([
      main.boundingBox(),
      field.boundingBox(),
      filters.boundingBox(),
      search.boundingBox(),
    ])
    expect(filtersBox?.y).toBe(searchBox?.y)
    expect([filtersBox?.height, searchBox?.height]).toEqual([44, 44])
    expect(filtersBox?.y).toBeGreaterThan(
      (fieldBox?.y ?? Infinity) + (fieldBox?.height ?? 0) - 1
    )
    expect(filtersBox?.x).toBe(mainBox?.x)
    expect(Math.round((searchBox?.x ?? 0) + (searchBox?.width ?? 0))).toBe(
      Math.round((mainBox?.x ?? 0) + (mainBox?.width ?? 0))
    )
    expect(
      Math.abs((filtersBox?.width ?? 0) - (searchBox?.width ?? 0))
    ).toBeLessThanOrEqual(1)
    await checkAccessibility()

    await field.fill("zzz")
    await filters.tap()
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole("combobox")).toHaveCount(6)
    await expect(sheet.getByLabel("État", { exact: true })).toHaveValue(
      "members"
    )
    await expect(sheet.getByLabel("Rôle", { exact: true })).toHaveValue("")
    await expect(
      sheet.getByRole("link", { name: "Réinitialiser" })
    ).toBeVisible()
    await expect(sheet.getByRole("button", { name: "Appliquer" })).toBeVisible()
    await checkAccessibility()

    await sheet
      .getByLabel("Rôle", { exact: true })
      .selectOption({ label: "Garde" })
    await sheet
      .getByLabel("Trier par", { exact: true })
      .selectOption({ label: "Arrivée récente" })
    await sheet.getByRole("button", { name: "Appliquer" }).click()
    await expect(sheet).toBeHidden()
    await expect(page).toHaveURL(COMBINED)
    expect([...new URL(page.url()).searchParams.keys()]).toEqual(SENT_KEYS)
    await expect(field).toHaveValue("garde")
    await expect(rows(ranks(1, 25, 30))).toHaveCount(25)
    await expect(filters).toHaveAccessibleName(/^Filtres\s?3 filtres actifs$/)
    const removers = chips.getByRole("link")
    await expect(removers).toHaveText([
      "Retirer le filtre Rôle : Garde",
      "Retirer le filtre État : Membres",
      "Retirer le filtre Trier par : Arrivée récente",
    ])
    for (const chip of await removers.all()) {
      expect((await chip.boundingBox())?.height).toBe(44)
    }
    await checkAccessibility()

    await removers.nth(1).click()
    await expect(page).toHaveURL(
      `/records?query=garde&role=${GUARD.id}&sort=joined-recent`
    )
    await expect(removers).toHaveCount(2)
    await expect(filters).toHaveAccessibleName(/^Filtres\s?2 filtres actifs$/)

    await field.fill("garde-0")
    await search.tap()
    await expect(page).toHaveURL(
      sent({ query: "garde-0", role: GUARD.id, sort: "joined-recent" })
    )
    await expect(rows(ranks(1, 10, 10))).toHaveCount(10)
    await expect(removers).toHaveCount(2)

    await filters.tap()
    await expect(sheet.getByLabel("Rôle", { exact: true })).toHaveValue(
      GUARD.id
    )
    await sheet.getByRole("link", { name: "Réinitialiser" }).click()
    await expect(sheet).toBeHidden()
    await expect(page).toHaveURL("/records?query=garde-0")
    await expect(chips).toHaveCount(0)
    await expect(filters).toHaveAccessibleName("Filtres")
    await expect(field).toHaveValue("garde-0")
    await checkAccessibility()
  })
})

test.describe("under 768 px", () => {
  test.use({ viewport: { width: 639, height: 760 }, hasTouch: true })

  test("the sheet of the filters opens from the bottom under 640 px and from the right, 384 px wide, from 640 px", async ({
    page,
    logIn,
  }) => {
    const sheet = page.getByRole("dialog", { name: "Filtres" })

    await logIn(ALDIS)
    await expect(page).toHaveURL("/blocked-words")
    await page.goto("/records")
    await settle(page)
    for (const { width, side } of [
      { width: 639, side: "bottom" },
      { width: 640, side: "right" },
      { width: 700, side: "right" },
      { width: 767, side: "right" },
    ] as const) {
      await resize(page, { width, height: 760 })
      await page.getByRole("button", { name: /^Filtres/ }).click()
      await expect(sheet).toBeVisible()
      await expect
        .poll(
          async () => {
            const box = await sheet.boundingBox()
            return box === null
              ? null
              : [box.x, box.y, box.width, Math.round(box.y + box.height)]
          },
          { message: `a sheet at ${width} px` }
        )
        .toEqual(
          side === "bottom"
            ? [0, expect.any(Number), width, 760]
            : [width - 384, 0, 384, 760]
        )
      await sheet.getByRole("button", { name: "Fermer" }).click()
      await expect(sheet).toBeHidden()
    }
  })
})
