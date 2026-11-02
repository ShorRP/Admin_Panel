import { DiscordError } from "@/discord/discord-error"
import { ROUTES } from "@/discord/routes"
import { MODERATION_ROLE_ID, STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"
import { logOutWithScriptsHeld } from "./log-out-with-scripts-held"
import { minifiedReactError } from "./minified-react-error"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const TOTAL = 201

function numbered(prefix: string, count: number, firstId: string) {
  return Array.from({ length: count }, (_, index) => ({
    id: (BigInt(firstId) + BigInt(index)).toString(),
    username: `${prefix}-${String(index).padStart(3, "0")}`,
  }))
}

const MEMBERS = numbered("compte", 160, "1400000000000001000")

const BANNED = numbered("exile", 40, "1400000000000002000")

const TIMED_OUT = MEMBERS[3]

if (TIMED_OUT === undefined) {
  throw new Error("The accounts of the list lack a member to time out.")
}

test.use({
  discordState: {
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] },
      ...MEMBERS.map((user) => ({
        user,
        ...(user.id === TIMED_OUT.id
          ? { communication_disabled_until: "2099-11-02T18:30:00.000000+00:00" }
          : {}),
      })),
    ],
    bans: BANNED.map((user) => ({ user })),
  },
})

const SENT_EMPTY = "&role=&standing=&joined=&created=&bots=&sort="

function ranks(first: number, last: number, total = TOTAL) {
  return first === last
    ? `${first} sur ${total}`
    : `${first}–${last} sur ${total}`
}

test("a staff member who moderates reads every account, 25 a page, without searching, then goes to the next page, to a page number, to the previous page and to the last, the URL following the page", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")
  const moderation = page
    .getByRole("complementary")
    .getByRole("navigation", { name: "Sections du panel" })
    .getByRole("list", { name: "Modération" })
    .getByRole("link", { name: "Modération" })
  const pagination = main.getByRole("navigation", { name: "Pages des comptes" })
  const rows = (range: string) =>
    main.getByRole("list", { name: range }).getByRole("link")
  const current = pagination.locator('[aria-current="page"]')

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await moderation.click()
  await expect(page).toHaveURL("/records")
  await expect(rows(ranks(1, 25))).toHaveCount(25)
  await expect(rows(ranks(1, 25)).nth(0)).toHaveAccessibleName(
    /^aldis\s*@aldis\s*Membre du serveur$/
  )
  await expect(rows(ranks(1, 25)).nth(4)).toHaveAccessibleName(
    /^compte-003\s*@compte-003\s*Exclu jusqu’au 2 nov\. 2099, 19:30$/
  )
  await expect(rows(ranks(1, 25)).nth(24)).toHaveAccessibleName(
    /^compte-023\s*@compte-023\s*Membre du serveur$/
  )
  await expect(main).toContainText("Heures de Paris.")
  await expect(current).toHaveText("Page 1")
  await expect(
    pagination.getByRole("link", { name: "Page précédente" })
  ).toHaveCount(0)
  await checkAccessibility()

  await pagination.getByRole("link", { name: "Page suivante" }).click()
  await expect(page).toHaveURL("/records?page=2")
  await expect(rows(ranks(26, 50))).toHaveCount(25)
  await expect(rows(ranks(26, 50)).nth(0)).toHaveAccessibleName(
    /^compte-024\s*@compte-024\s*Membre du serveur$/
  )
  await expect(current).toHaveText("Page 2")
  await expect(main).not.toContainText("Heures de Paris.")
  await checkAccessibility()

  await pagination.getByRole("link", { name: "Page 3", exact: true }).click()
  await expect(page).toHaveURL("/records?page=3")
  await expect(rows(ranks(51, 75))).toHaveCount(25)
  await expect(current).toHaveText("Page 3")
  await checkAccessibility()

  await pagination.getByRole("link", { name: "Page précédente" }).click()
  await expect(page).toHaveURL("/records?page=2")
  await expect(rows(ranks(26, 50))).toHaveCount(25)

  await pagination.getByRole("link", { name: "Page 1", exact: true }).click()
  await expect(page).toHaveURL("/records")
  await expect(rows(ranks(1, 25))).toHaveCount(25)

  await pagination.getByRole("link", { name: "Page 9", exact: true }).click()
  await expect(page).toHaveURL("/records?page=9")
  await expect(rows(ranks(201, 201))).toHaveCount(1)
  await expect(rows(ranks(201, 201)).nth(0)).toHaveAccessibleName(
    /^exile-039\s*@exile-039\s*Compte banni$/
  )
  await expect(current).toHaveText("Page 9")
  await expect(
    pagination.getByRole("link", { name: "Page suivante" })
  ).toHaveCount(0)
  await checkAccessibility()
})

test("past 7 pages, the navigation keeps the first and the last page, the current one and its neighbours, apart by « … », and fits a 360 px screen", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const pagination = page
    .getByRole("main")
    .getByRole("navigation", { name: "Pages des comptes" })

  await page.setViewportSize({ width: 360, height: 760 })
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto("/records?page=5")

  await expect(pagination.locator("li")).toHaveText([
    "Page 1",
    "…",
    "Page 4",
    "Page 5",
    "Page 6",
    "…",
    "Page 9",
  ])
  await expect(pagination.locator('[aria-current="page"]')).toHaveText("Page 5")
  for (const entry of await pagination.locator("a, li").all()) {
    const box = await entry.boundingBox()
    expect(box?.x).toBeGreaterThanOrEqual(0)
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360)
  }
  await checkAccessibility()
})

test("a page that is no page of the list shows the first, whatever it is, and a search by name shows its results counted and paged like the list, an ID or a mention its record", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")
  const firstPage = main.getByRole("list", { name: ranks(1, 25) })
  const field = page.getByLabel("Compte", { exact: true })

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  for (const invalid of ["abc", "0", "-1", "1.5", "10", "2&page=3"]) {
    await page.goto(`/records?page=${invalid}`)
    await expect(firstPage, `?page=${invalid}`).toBeVisible()
    await expect(page).toHaveURL(`/records?page=${invalid}`)
  }
  await checkAccessibility()

  await page.goto("/records?page=2")
  await expect(main.getByRole("list", { name: ranks(26, 50) })).toBeVisible()
  await field.fill("compte-00")
  await page.getByRole("button", { name: "Chercher" }).click()
  await expect(page).toHaveURL(`/records?query=compte-00${SENT_EMPTY}`)
  await expect(main.getByRole("list", { name: ranks(1, 10, 10) })).toBeVisible()
  await expect(
    main.getByRole("navigation", { name: "Pages des comptes" })
  ).toHaveCount(0)
  await checkAccessibility()

  await field.fill(`<@${BANNED[0]?.id}>`)
  await page.getByRole("button", { name: "Chercher" }).click()
  await expect(page).toHaveURL(`/records/${BANNED[0]?.id}`)
  await expect(
    main.getByRole("heading", { level: 1, name: "exile-000" })
  ).toBeVisible()
  await checkAccessibility()
})

test("a members' list Discord refuses for want of the Server Members Intent shows the error page, without the navigation or the search field", async ({
  page,
  discord,
  logIn,
  checkAccessibility,
  browserConsole,
}) => {
  browserConsole.expectProblems([
    `console.error: Error: ${minifiedReactError(441)}`,
  ])

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.waitForLoadState()
  discord.failNext(
    "listMembers",
    new DiscordError({
      method: "GET",
      route: ROUTES.guildMembers,
      status: 403,
      code: 50001,
      discordMessage: "Missing Access",
    })
  )

  await page.goto("/records")

  await expect(
    page.getByRole("heading", { level: 1, name: "Page indisponible" })
  ).toBeVisible()
  await expect(
    page.getByRole("complementary", { includeHidden: true })
  ).toHaveCount(0)
  await expect(page.getByRole("banner", { includeHidden: true })).toHaveCount(0)
  await expect(page.getByLabel("Compte", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Chercher" })).toHaveCount(0)
  await checkAccessibility()
})

test("a staff member logs out from the list of accounts, with the navigation between its pages still in view while the next page's script loads, and no page is prefetched", async ({
  page,
  logIn,
  prefetchedPaths,
  checkAccessibility,
}) => {
  const pagination = page
    .getByRole("main")
    .getByRole("navigation", { name: "Pages des comptes" })

  await logIn(ALDIS)
  await page.goto("/records?page=5")
  await expect(pagination.getByRole("link", { name: "Page 6" })).toBeVisible()
  await checkAccessibility()

  await pagination.scrollIntoViewIfNeeded()
  const links = await pagination.getByRole("link").all()
  expect(links).toHaveLength(6)
  for (const link of links) {
    await expect(link).toBeInViewport()
  }
  await logOutWithScriptsHeld(page, links)
  expect(prefetchedPaths).toEqual([])
  await checkAccessibility()
})
