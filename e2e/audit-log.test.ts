import { newPanelRule } from "@/blocked-words/panel-rule"
import type { FakeDiscord } from "@/discord/fake-discord"
import { MODERATION_ROLE_ID, STAFF_ROLE_ID } from "../playwright.config"
import { expect, test, type Locator, type Page } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const LYRA = {
  id: "1400000000000000003",
  username: "lyra_gates",
  global_name: "Lyra",
}

test.use({
  discordState: {
    members: [
      {
        user: ALDIS,
        avatar: "f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8",
        roles: [STAFF_ROLE_ID],
      },
      { user: LYRA },
    ],
  },
})

const ALDIS_AVATAR_URL =
  "https://cdn.discordapp.com/guilds/1100000000000000000/users/1400000000000000001/avatars/f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8.webp?size=64"

function parisDay(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeZone: "Europe/Paris",
  }).format(date)
}

function shortDay(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "Europe/Paris",
  }).format(date)
}

function addition(word: string) {
  return `aldis (${ALDIS.id}) : ajout de « ${word} »`
}

async function seedBlockedWordChanges(discord: FakeDiscord, count: number) {
  const rule = await discord.createAutoModerationRule(
    newPanelRule(["mot0"]),
    addition("mot0")
  )
  for (let index = 1; index < count; index++) {
    await discord.modifyAutoModerationRule(
      rule.id,
      { trigger_metadata: { keyword_filter: [`mot${index}`] } },
      addition(`mot${index}`)
    )
  }
}

test("a staff member reads the audit log, newest changes first, each beside its staff member's avatar, then the older ones", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
}) => {
  await seedBlockedWordChanges(discord, 51)
  const seededAt = new Date()
  const changes = page.getByRole("listitem")
  const newest = changes.filter({ hasText: "Ajout de « mot50 »" })
  const oldest = changes.filter({ hasText: "Ajout de « mot0 »" })
  const newestAvatar = newest.locator("img")

  await logIn(ALDIS)
  await page.goto("/audit-log")
  await expect(page).toHaveTitle("Journal d’audit – Panel de Shor")
  await expect(
    page.getByRole("heading", { level: 1, name: "Journal d’audit" })
  ).toBeVisible()
  await expect(
    page.getByText("45 derniers jours · Heures de Paris", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: parisDay(seededAt),
      exact: true,
    })
  ).toBeVisible()
  await expect(newest).toContainText("aldis")
  await expect(newestAvatar).toHaveAttribute("src", ALDIS_AVATAR_URL)
  await expect(newestAvatar).toHaveAttribute("alt", "")
  await expect(oldest).toHaveCount(0)
  await checkAccessibility()

  await page.getByRole("link", { name: "Plus anciens" }).click()
  await expect(oldest).toBeVisible()
  await expect(
    page.getByText(`Jusqu’au ${shortDay(seededAt)}`, { exact: true })
  ).toBeVisible()
  await expect(newest).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Plus anciens" })).toHaveCount(0)
  await checkAccessibility()

  await page.getByRole("link", { name: "Revenir aux plus récents" }).click()
  await expect(newest).toBeVisible()
  await expect(page).toHaveURL("/audit-log")

  await page.setViewportSize({ width: 360, height: 760 })
  await expect(newestAvatar).toBeVisible()
  await expect(newest.getByText("aldis", { exact: true })).toBeVisible()
})

const HELD_SCRIPT_MS = 1_000

const HELD_SCRIPTS = "**/_next/static/chunks/*.js"

async function logOutWithScriptsHeld(page: Page, links: Locator[]) {
  const linksVisibleOnRelease: boolean[] = []
  const holdScript: Parameters<Page["route"]>[1] = async (route) => {
    await new Promise((resolve) => setTimeout(resolve, HELD_SCRIPT_MS))
    linksVisibleOnRelease.push(
      (await Promise.all(links.map((link) => link.isVisible()))).every(Boolean)
    )
    await route.continue()
  }
  await page.route(HELD_SCRIPTS, holdScript)
  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Se déconnecter" })
    .click()
  await expect(page).toHaveURL("/login/logged-out")
  expect(linksVisibleOnRelease[0]).toBe(true)
  expect(
    (await page.context().cookies()).filter(
      ({ name }) => name === "__Host-session"
    )
  ).toEqual([])
  await page.unroute(HELD_SCRIPTS, holdScript)
}

test("a staff member logs out from the audit log, with both pagination links still in view while the next page's script loads, and no page is prefetched", async ({
  page,
  logIn,
  discord,
  prefetchedPaths,
  checkAccessibility,
}) => {
  await seedBlockedWordChanges(discord, 101)
  const pagination = page.getByRole("navigation", {
    name: "Pages du journal d’audit",
  })
  const older = pagination.getByRole("link", { name: "Plus anciens" })
  const newer = pagination.getByRole("link", {
    name: "Revenir aux plus récents",
  })

  await logIn(ALDIS)
  await page.goto("/audit-log")
  await expect(older).toBeVisible()
  await expect(newer).toHaveCount(0)
  await checkAccessibility()

  await older.click()
  await expect(page).toHaveURL(/^[^?]*\/audit-log\?before=\d+$/)
  await expect(newer).toBeVisible()
  await expect(older).toBeVisible()
  await checkAccessibility()

  await pagination.scrollIntoViewIfNeeded()
  await expect(newer).toBeInViewport()
  await expect(older).toBeInViewport()
  await logOutWithScriptsHeld(page, [older, newer])
  expect(prefetchedPaths).toEqual([])
})

function inAnHour() {
  return new Date(Date.now() + 3_600_000).toISOString()
}

test.describe("for a staff member who moderates", () => {
  test.use({
    discordState: {
      members: [
        { user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] },
        { user: LYRA },
      ],
    },
  })

  test("a sanction shows in the audit log with its staff member, its account and its reason, and opens the account's record", async ({
    page,
    logIn,
    discord,
    checkAccessibility,
  }) => {
    discord.modifyMemberAs(
      ALDIS.id,
      LYRA.id,
      { communication_disabled_until: inAnHour() },
      "Insultes répétées"
    )
    const row = page
      .getByRole("listitem")
      .filter({ hasText: "Exclusion temporaire jusqu’au" })

    await logIn(ALDIS)
    await page.goto("/audit-log")
    await expect(row).toContainText("aldis")
    await expect(row).toContainText("Compte : Lyra")
    await expect(row).toContainText("Motif : Insultes répétées")
    await checkAccessibility()

    await row.getByRole("link", { name: "Lyra" }).click()
    await expect(page).toHaveURL(`/records/${LYRA.id}`)
    await expect(
      page.getByRole("heading", { level: 1, name: "Lyra" })
    ).toBeVisible()
    await checkAccessibility()
  })

  test("a staff member who moderates logs out from the audit log, with its type filter, « Réinitialiser » and a sanction's link in view while the next page's script loads, and no page is prefetched", async ({
    page,
    logIn,
    discord,
    prefetchedPaths,
    checkAccessibility,
  }) => {
    discord.modifyMemberAs(
      ALDIS.id,
      LYRA.id,
      { communication_disabled_until: inAnHour() },
      "Insultes répétées"
    )
    const typeFilter = page.getByRole("navigation", {
      name: "Filtrer par type",
    })
    const timeouts = typeFilter.getByRole("link", { name: "Exclusions" })
    const reset = page.getByRole("link", { name: "Réinitialiser" })
    const account = page
      .getByRole("listitem")
      .filter({ hasText: "Exclusion temporaire jusqu’au" })
      .getByRole("link", { name: "Lyra" })

    await logIn(ALDIS)
    await page.goto("/audit-log")
    await checkAccessibility()

    await timeouts.click()
    await expect(page).toHaveURL("/audit-log?type=timeouts")
    await expect(timeouts).toHaveAttribute("aria-current", "true")
    await expect(account).toBeVisible()
    await expect(typeFilter.getByRole("link")).toHaveCount(5)
    const links = [
      ...(await typeFilter.getByRole("link").all()),
      reset,
      account,
    ]
    await checkAccessibility()

    for (const link of links) {
      await expect(link).toBeInViewport()
    }
    await logOutWithScriptsHeld(page, links)
    expect(prefetchedPaths).toEqual([])
    await checkAccessibility()
  })
})

const BRYN = { id: "1400000000000000002", username: "bryn" }

test.describe("with changes of several types", () => {
  test.use({
    discordState: {
      members: [
        { user: ALDIS, roles: [STAFF_ROLE_ID] },
        { user: LYRA },
        { user: BRYN },
      ],
    },
  })

  test("a staff member chooses « Exclusions », reads only timeouts and their lifting, then the older ones of that type, then every type again through « Réinitialiser »", async ({
    page,
    logIn,
    discord,
    checkAccessibility,
  }) => {
    for (let index = 1; index <= 26; index++) {
      discord.modifyMemberAs(
        ALDIS.id,
        LYRA.id,
        { communication_disabled_until: inAnHour() },
        `Motif ${index}`
      )
      discord.modifyMemberAs(ALDIS.id, LYRA.id, {
        communication_disabled_until: null,
      })
    }
    await discord.createAutoModerationRule(
      newPanelRule(["mot0"]),
      addition("mot0")
    )
    discord.removeMemberAs(ALDIS.id, BRYN.id, "Provocations")
    const changes = page.locator("ol").getByRole("listitem")
    const timeoutsAndLifts = changes.filter({
      hasText: /Exclusion temporaire jusqu’au|Levée de l’exclusion temporaire/,
    })
    const typeFilter = page.getByRole("navigation", {
      name: "Filtrer par type",
    })
    const reset = page.getByRole("link", { name: "Réinitialiser" })

    await logIn(ALDIS)
    await page.goto("/audit-log")
    await expect(
      typeFilter.getByRole("link", { name: "Tout", exact: true })
    ).toHaveAttribute("aria-current", "true")
    await expect(changes.filter({ hasText: "Ajout de « mot0 »" })).toBeVisible()
    await expect(changes.filter({ hasText: "Expulsion" })).toBeVisible()
    await expect(reset).toHaveCount(0)

    await typeFilter.getByRole("link", { name: "Exclusions" }).click()
    await expect(page).toHaveURL("/audit-log?type=timeouts")
    await expect(
      typeFilter.getByRole("link", { name: "Exclusions" })
    ).toHaveAttribute("aria-current", "true")
    await expect(
      typeFilter.getByRole("link", { name: "Tout", exact: true })
    ).not.toHaveAttribute("aria-current")
    await expect(changes).toHaveCount(50)
    await expect(timeoutsAndLifts).toHaveCount(50)
    await checkAccessibility()

    await page.getByRole("link", { name: "Plus anciens" }).click()
    await expect(page).toHaveURL(/^[^?]*\/audit-log\?type=timeouts&before=\d+$/)
    await expect(
      typeFilter.getByRole("link", { name: "Exclusions" })
    ).toHaveAttribute("aria-current", "true")
    await expect(changes).toHaveCount(2)
    await expect(timeoutsAndLifts).toHaveCount(2)
    await expect(changes.filter({ hasText: "Motif : Motif 1" })).toContainText(
      "Exclusion temporaire jusqu’au"
    )
    await checkAccessibility()

    await reset.click()
    await expect(page).toHaveURL("/audit-log")
    await expect(
      typeFilter.getByRole("link", { name: "Tout", exact: true })
    ).toHaveAttribute("aria-current", "true")
    await expect(changes.filter({ hasText: "Ajout de « mot0 »" })).toBeVisible()
    await expect(changes).toHaveCount(50)
    await expect(reset).toHaveCount(0)
    await checkAccessibility()
  })
})

test("a staff member who does not moderate sees a sanction in the audit log, with no link to the account's record", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
}) => {
  discord.modifyMemberAs(ALDIS.id, LYRA.id, {
    communication_disabled_until: inAnHour(),
  })
  const row = page
    .getByRole("listitem")
    .filter({ hasText: "Exclusion temporaire jusqu’au" })

  await logIn(ALDIS)
  await page.goto("/audit-log")
  await expect(row).toContainText("Compte : Lyra")
  await expect(row).toContainText("Aucun motif")
  await expect(row.getByRole("link")).toHaveCount(0)
  await checkAccessibility()
})
