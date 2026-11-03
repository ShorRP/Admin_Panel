import { DiscordError } from "@/discord/discord-error"
import { ROUTES } from "@/discord/routes"
import { MODERATION_ROLE_ID, STAFF_ROLE_ID } from "../playwright.config"
import { expect, test, type Locator } from "./fixtures"
import { logOutWithScriptsHeld } from "./log-out-with-scripts-held"
import { minifiedReactError } from "./minified-react-error"
import { resize, settle } from "./settle"

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
  const current = pagination.locator('ol:visible [aria-current="page"]')

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

function targetsOf(pagination: Locator) {
  return pagination.evaluate((nav) => {
    const shown = [...nav.querySelectorAll("a, [aria-current=page]")].filter(
      (element) => element.getClientRects().length > 0
    )
    const box = nav.getBoundingClientRect()
    return {
      nav: { height: Math.round(box.height) },
      targets: shown.map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect()
        const hit = document.elementFromPoint(x + width / 2, y + height / 2)
        return {
          name: (element.textContent ?? "").trim(),
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
          hit: hit !== null && element.contains(hit),
        }
      }),
      gaps: [...nav.querySelectorAll("li[aria-hidden] > span")]
        .filter((glyph) => glyph.getClientRects().length > 0)
        .map((glyph) => {
          const item = glyph.parentElement
          const before = item?.previousElementSibling?.getBoundingClientRect()
          const after = item?.nextElementSibling?.getBoundingClientRect()
          const { x, width } = glyph.getBoundingClientRect()
          return {
            beforeRight: Math.round(before?.right ?? NaN),
            afterLeft: Math.round(after?.left ?? NaN),
            center: Math.round(x + width / 2),
          }
        }),
    }
  })
}

test.describe("on a 360 px screen", () => {
  test.use({ viewport: { width: 360, height: 760 } })

  test("past 7 pages, the navigation keeps the first and the last page, the current one and its neighbours, apart by  … , in one row of 44 px targets between two arrows that no  …  covers, and from 768 px the list of pages comes back with its arrows' text", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    const pagination = page
      .getByRole("main")
      .getByRole("navigation", { name: "Pages des comptes" })
    const entries = pagination.locator("ol:visible > li")

    await logIn(ALDIS)
    await expect(page).toHaveURL("/blocked-words")
    await page.goto("/records?page=5")
    await settle(page)
    await expect(pagination.locator("ol:visible")).toHaveCount(1)
    await expect(entries).toHaveText([
      "Page 1",
      "…",
      "Page 4",
      "Page 5",
      "Page 6",
      "…",
      "Page 9",
    ])
    await expect(
      pagination.locator('ol:visible [aria-current="page"]')
    ).toHaveText("Page 5")
    await pagination.scrollIntoViewIfNeeded()
    const narrow = await targetsOf(pagination)
    expect(narrow.nav.height).toBe(44)
    expect(narrow.targets.map(({ name }) => name)).toEqual([
      "Page précédente",
      "Page 1",
      "Page 4",
      "Page 5",
      "Page 6",
      "Page 9",
      "Page suivante",
    ])
    for (const [index, target] of narrow.targets.entries()) {
      expect(target, target.name).toMatchObject({
        y: narrow.targets[0]?.y,
        width: 44,
        height: 44,
        hit: true,
      })
      expect(target.x, target.name).toBeGreaterThanOrEqual(20)
      expect(target.x + target.width, target.name).toBeLessThanOrEqual(340)
      const next = narrow.targets[index + 1]
      if (next !== undefined) {
        expect(next.x, target.name).toBeGreaterThanOrEqual(
          target.x + target.width
        )
      }
    }
    expect(narrow.gaps).toHaveLength(2)
    for (const { beforeRight, afterLeft, center } of narrow.gaps) {
      expect(afterLeft).toBe(beforeRight)
      expect(Math.abs(center - beforeRight)).toBeLessThanOrEqual(1)
    }
    await checkAccessibility()

    await resize(page, { width: 768, height: 1024 })
    await expect(pagination.locator("ol:visible")).toHaveCount(1)
    await expect(entries).toHaveText([
      "Page 1",
      "…",
      "Page 4",
      "Page 5",
      "Page 6",
      "…",
      "Page 9",
    ])
    await pagination.scrollIntoViewIfNeeded()
    const medium = await targetsOf(pagination)
    expect(medium.targets.map(({ name }) => name)).toEqual(
      narrow.targets.map(({ name }) => name)
    )
    for (const target of medium.targets) {
      expect(target, target.name).toMatchObject({ height: 44, hit: true })
      expect(target.width, target.name).toBeGreaterThanOrEqual(44)
    }
    expect(medium.targets[0]?.width).toBeGreaterThan(100)
    expect(medium.targets.at(-1)?.width).toBeGreaterThan(100)
    await checkAccessibility()
  })
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
