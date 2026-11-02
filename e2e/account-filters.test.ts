import { MODERATION_ROLE_ID, STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

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

test("on a 360 px screen, the form wraps, each choice under its label and within the screen, and on a 1,280 px one four choices share a row, the last two sharing the next with the button", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const labels = [
    "Compte",
    "Rôle",
    "État",
    "Arrivée sur le serveur",
    "Âge du compte Discord",
    "Comptes de bot",
    "Trier par",
  ]
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

  await page.setViewportSize({ width: 1280, height: 900 })
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto("/records")
  await expect(page.getByLabel("Trier par")).toBeVisible()
  const wide = await boxes()
  const button = await page
    .getByRole("button", { name: "Chercher" })
    .boundingBox()
  const lastRow = wide[5]
  expect(new Set(wide.slice(1, 5).map(({ y }) => y)).size).toBe(1)
  expect(wide[1]?.y).toBeGreaterThan(wide[0]?.y ?? Infinity)
  expect(lastRow?.y).toBeGreaterThan(wide[1]?.y ?? Infinity)
  expect(wide[6]?.y).toBe(lastRow?.y)
  expect(button?.y).toBeGreaterThanOrEqual(lastRow?.y ?? Infinity)
  expect(button?.y).toBeLessThan((lastRow?.y ?? 0) + (lastRow?.height ?? 0))
  await checkAccessibility()

  await page.setViewportSize({ width: 360, height: 900 })
  const narrow = await boxes()
  for (const [index, box] of narrow.entries()) {
    expect(box.x, labels[index]).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, labels[index]).toBeLessThanOrEqual(360)
    if (index > 0) {
      const previous = narrow[index - 1]
      expect(box.y, labels[index]).toBeGreaterThan(
        (previous?.y ?? Infinity) + (previous?.height ?? 0) - 1
      )
    }
  }
  await checkAccessibility()
})
