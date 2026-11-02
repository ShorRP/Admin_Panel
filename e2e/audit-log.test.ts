import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"

import { blockedWordAction } from "@/blocked-words/blocked-word-action"
import { newPanelRule } from "@/blocked-words/panel-rule"
import type { FakeDiscord } from "@/discord/fake-discord"
import { MODERATION_ROLE_ID, STAFF_ROLE_ID } from "../playwright.config"
import { expect, test, type Locator, type Page } from "./fixtures"
import { logOutWithScriptsHeld } from "./log-out-with-scripts-held"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = { id: "1400000000000000002", username: "bryn" }

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
    newPanelRule(blockedWordAction("block"), STAFF_ROLE_ID, ["mot0"]),
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

const SAME_AXIS_TOLERANCE = 1

type Span = { top: number; bottom: number }

type RowMeasure = Record<
  "insideBorders" | "time" | "tile" | "changed" | "avatar" | "author",
  Span
>

async function measureRow(row: Locator): Promise<RowMeasure> {
  await expect(row).toBeVisible()
  return await row.evaluate((element) => {
    function spanOf(target: Element | null | undefined, name: string) {
      if (target === null || target === undefined) {
        throw new Error(`The row has no ${name} to measure.`)
      }
      const { top, bottom } = target.getBoundingClientRect()
      return { top, bottom }
    }
    const { borderTopWidth, borderBottomWidth } = getComputedStyle(element)
    const { top, bottom } = element.getBoundingClientRect()
    const tile = Array.from(element.querySelectorAll("span[aria-hidden]")).find(
      (span) => span.querySelector("svg") !== null
    )
    return {
      insideBorders: {
        top: top + parseFloat(borderTopWidth),
        bottom: bottom - parseFloat(borderBottomWidth),
      },
      time: spanOf(element.querySelector("time"), "time"),
      tile: spanOf(tile, "tile"),
      changed: spanOf(
        element.querySelector("p")?.parentElement,
        "what changed"
      ),
      avatar: spanOf(element.querySelector('[data-slot="avatar"]'), "avatar"),
      author: spanOf(element.querySelector("p[title]"), "author's name"),
    }
  })
}

function centerOf({ top, bottom }: Span) {
  return (top + bottom) / 2
}

function expectCentersAt(
  kind: string,
  cells: Record<string, Span>,
  axis: number
) {
  for (const [name, cell] of Object.entries(cells)) {
    expect(
      Math.abs(centerOf(cell) - axis),
      `the ${name} of the ${kind}'s row, against the axis at ${axis}`
    ).toBeLessThanOrEqual(SAME_AXIS_TOLERANCE)
  }
}

function expectCentersTogether(kind: string, cells: Record<string, Span>) {
  const centers = Object.values(cells).map(centerOf)
  expect(
    Math.max(...centers) - Math.min(...centers),
    `the centers of the ${Object.keys(cells).join(", ")} of the ${kind}'s row`
  ).toBeLessThanOrEqual(SAME_AXIS_TOLERANCE)
}

test("the time, the icon and the author's avatar of a row share one axis, the row's middle, on one line of text as on two, and on a phone they share a first line above what changed", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
}) => {
  await discord.createAutoModerationRule(
    newPanelRule(blockedWordAction("block"), STAFF_ROLE_ID, ["mot0"]),
    addition("mot0")
  )
  discord.modifyMemberAs(
    ALDIS.id,
    LYRA.id,
    { communication_disabled_until: inAnHour() },
    "Insultes répétées"
  )
  const rows = {
    "blocked word": page
      .getByRole("listitem")
      .filter({ hasText: "Ajout de « mot0 »" }),
    sanction: page
      .getByRole("listitem")
      .filter({ hasText: "Exclusion temporaire jusqu’au" }),
  }

  await logIn(ALDIS)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/audit-log")
  await expect(rows.sanction).toContainText(
    "Compte : Lyra · Motif : Insultes répétées"
  )
  await expect(rows["blocked word"]).not.toContainText("Compte :")
  await expect(rows.sanction.locator("img")).toBeVisible()
  await checkAccessibility()

  for (const [kind, row] of Object.entries(rows)) {
    const { insideBorders, time, tile, changed, avatar, author } =
      await measureRow(row)
    expectCentersAt(
      kind,
      { time, tile, changed, avatar, author },
      centerOf(insideBorders)
    )
    expectCentersTogether(kind, { time, tile, avatar })
  }

  await page.setViewportSize({ width: 360, height: 760 })
  for (const [kind, row] of Object.entries(rows)) {
    await expect(row.getByText("aldis", { exact: true })).toBeVisible()
    const { time, tile, changed, avatar, author } = await measureRow(row)
    expectCentersAt(kind, { time, avatar, author }, centerOf(tile))
    expectCentersTogether(kind, { time, tile, avatar })
    expect(
      changed.top,
      `what changed in the ${kind}'s row, against the bottom of its first line`
    ).toBeGreaterThanOrEqual(
      Math.max(...[time, tile, avatar, author].map(({ bottom }) => bottom))
    )
  }
})

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

test("a staff member who does not moderate sees each change's author and their own identity as text, in the sidebar, the bar and the menu, with no link to a record", async ({
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
  const sidebar = page.getByRole("complementary")
  const header = page.getByRole("banner")
  const menu = page.getByRole("dialog", { name: "Menu" })

  await logIn(ALDIS)
  await page.goto("/audit-log")
  await expect(row).toContainText("aldis")
  await expect(row.getByRole("link")).toHaveCount(0)
  await expect(sidebar.getByText("aldis", { exact: true })).toBeVisible()
  await expect(sidebar.getByRole("link", { name: /aldis/ })).toHaveCount(0)
  await checkAccessibility()

  await page.setViewportSize({ width: 360, height: 760 })
  await expect(row.getByText("aldis", { exact: true })).toBeVisible()
  await expect(header.getByRole("link")).toHaveCount(1)
  await header.getByRole("button", { name: "Ouvrir le menu" }).click()
  await expect(menu.getByText("aldis", { exact: true })).toBeVisible()
  await expect(menu.getByRole("link", { name: /aldis/ })).toHaveCount(0)
})

test.describe("for a staff member who moderates", () => {
  test.use({
    discordState: {
      members: [
        { user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] },
        { user: BRYN },
        { user: LYRA },
      ],
    },
  })

  test("the avatar and the name of the author of a change open their record, a sanction's account opens its own, and the staff member's own identity in the sidebar opens theirs", async ({
    page,
    logIn,
    discord,
    checkAccessibility,
  }) => {
    discord.modifyMemberAs(
      BRYN.id,
      LYRA.id,
      { communication_disabled_until: inAnHour() },
      "Insultes répétées"
    )
    const row = page
      .getByRole("listitem")
      .filter({ hasText: "Exclusion temporaire jusqu’au" })
    const author = row.getByRole("link", { name: "bryn", exact: true })
    const account = row.getByRole("link", { name: "Lyra" })
    const identity = page
      .getByRole("complementary")
      .getByRole("link", { name: "aldis", exact: true })

    await logIn(ALDIS)
    await page.goto("/audit-log")
    await expect(author.locator('[data-slot="avatar"]')).toBeVisible()
    await expect(author).toHaveAttribute("href", `/records/${BRYN.id}`)
    await expect(account).toHaveAttribute("href", `/records/${LYRA.id}`)
    await expect(identity).toHaveAttribute("href", `/records/${ALDIS.id}`)
    await expect(identity).not.toHaveAttribute("aria-current")
    await checkAccessibility()

    await author.click()
    await expect(page).toHaveURL(`/records/${BRYN.id}`)
    await expect(
      page.getByRole("heading", { level: 1, name: "bryn" })
    ).toBeVisible()
    await expect(identity).not.toHaveAttribute("aria-current")
    await checkAccessibility()

    await identity.click()
    await expect(page).toHaveURL(`/records/${ALDIS.id}`)
    await expect(
      page.getByRole("heading", { level: 1, name: "aldis" })
    ).toBeVisible()
    await expect(identity).toHaveAttribute("aria-current", "page")
    await checkAccessibility()
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

  test("an automatic timeout shows under « Tout » and « Exclusions » with its account and its rule, under « AutoMod » with no avatar and no link to an author, and the author filter finds it by « AutoMod » and never by the member it timed out", async ({
    page,
    logIn,
    discord,
    checkAccessibility,
  }) => {
    const insults = discord.createAutoModerationRuleAs(BRYN.id, {
      name: "Insultes",
      event_type: AutoModerationRuleEventType.MessageSend,
      trigger_type: AutoModerationRuleTriggerType.Keyword,
      trigger_metadata: { keyword_filter: ["crétin"] },
      actions: [
        {
          type: AutoModerationActionType.Timeout,
          metadata: { duration_seconds: 600 },
        },
      ],
    })
    discord.modifyMemberAs(
      BRYN.id,
      LYRA.id,
      { communication_disabled_until: inAnHour() },
      "Insultes répétées"
    )
    discord.timeOutByAutoModeration(insults.id, LYRA.id)
    const changes = page.locator("ol").getByRole("listitem")
    const automatic = changes.filter({
      hasText: "Exclusion temporaire automatique",
    })
    const byStaff = changes.filter({ hasText: "Exclusion temporaire jusqu’au" })
    const typeFilter = page.getByRole("navigation", {
      name: "Filtrer par type",
    })
    const author = page.getByLabel("Auteur")

    await logIn(ALDIS)
    await page.goto("/audit-log")
    await expect(automatic).toHaveCount(1)
    await expect(automatic).toContainText(
      "Compte : Lyra · Règle : « Insultes »"
    )
    await expect(automatic).not.toContainText("Aucun motif")
    await expect(automatic).not.toContainText("Message contained keyword")
    await expect(automatic.getByText("AutoMod", { exact: true })).toBeVisible()
    await expect(automatic.locator('[data-slot="avatar"]')).toHaveCount(0)
    await expect(automatic.getByRole("link")).toHaveCount(1)
    await expect(automatic.getByRole("link", { name: "Lyra" })).toHaveAttribute(
      "href",
      `/records/${LYRA.id}`
    )
    await expect(byStaff).toHaveCount(1)
    await expect(
      byStaff.getByRole("link", { name: "bryn", exact: true })
    ).toHaveAttribute("href", `/records/${BRYN.id}`)
    await checkAccessibility()

    await typeFilter.getByRole("link", { name: "Exclusions" }).click()
    await expect(page).toHaveURL("/audit-log?type=timeouts")
    await expect(changes).toHaveCount(2)
    await expect(automatic).toContainText("Règle : « Insultes »")
    await checkAccessibility()

    await author.fill("AutoMod")
    await page.getByRole("button", { name: "Filtrer" }).click()
    await expect
      .poll(() => searchParamsOf(page))
      .toMatchObject({ type: "timeouts", author: "AutoMod" })
    await expect(changes).toHaveCount(1)
    await expect(automatic).toHaveCount(1)
    await expect(byStaff).toHaveCount(0)
    await checkAccessibility()

    await page.setViewportSize({ width: 360, height: 760 })
    await expect(automatic.getByText("AutoMod", { exact: true })).toBeVisible()
    await expect(automatic.getByRole("link")).toHaveCount(1)
    await checkAccessibility()
    await page.setViewportSize({ width: 1280, height: 800 })

    await author.fill(`<@${LYRA.id}>`)
    await page.getByRole("button", { name: "Filtrer" }).click()
    await expect
      .poll(() => searchParamsOf(page))
      .toMatchObject({ type: "timeouts", author: `<@${LYRA.id}>` })
    await expect(
      page.getByText(
        "Aucun changement ne correspond à ces filtres ces 45 derniers jours."
      )
    ).toBeVisible()
    await expect(changes).toHaveCount(0)
    await checkAccessibility()
  })

  test("a staff member who moderates logs out from the audit log, with its type filter, its form, « Réinitialiser », and a sanction's account and author in view while the next page's script loads, and no page is prefetched", async ({
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
    const row = page
      .getByRole("listitem")
      .filter({ hasText: "Exclusion temporaire jusqu’au" })
    const account = row.getByRole("link", { name: "Lyra" })
    const author = row.getByRole("link", { name: "aldis", exact: true })

    await logIn(ALDIS)
    await page.goto("/audit-log")
    await checkAccessibility()

    await timeouts.click()
    await expect(page).toHaveURL("/audit-log?type=timeouts")
    await expect(timeouts).toHaveAttribute("aria-current", "true")
    await expect(account).toBeVisible()
    await expect(author).toBeVisible()
    await expect(typeFilter.getByRole("link")).toHaveCount(5)
    const links = [
      ...(await typeFilter.getByRole("link").all()),
      reset,
      page.getByLabel("Auteur"),
      page.getByLabel("Compte", { exact: true }),
      page.getByRole("button", { name: "Filtrer" }),
      account,
      author,
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
      newPanelRule(blockedWordAction("block"), STAFF_ROLE_ID, ["mot0"]),
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

const TORVALD = { id: "1400000000000000004", username: "torvald" }

function searchParamsOf(page: Page) {
  return Object.fromEntries(new URL(page.url()).searchParams)
}

test.describe("filtered by an author and an account", () => {
  test.use({
    discordState: {
      members: [
        { user: ALDIS, roles: [STAFF_ROLE_ID] },
        { user: BRYN },
        { user: LYRA },
        { user: TORVALD },
      ],
    },
  })

  test("a staff member combines an author, an account and a type, keeps them from page to page and from type to type, reopens the copied link, reads an empty page, then clears them all through « Réinitialiser », which empties the fields too", async ({
    page,
    logIn,
    discord,
    checkAccessibility,
  }) => {
    for (let index = 1; index <= 26; index++) {
      discord.modifyMemberAs(
        BRYN.id,
        LYRA.id,
        { communication_disabled_until: inAnHour() },
        `Motif ${index}`
      )
      discord.modifyMemberAs(BRYN.id, LYRA.id, {
        communication_disabled_until: null,
      })
    }
    discord.modifyMemberAs(
      ALDIS.id,
      LYRA.id,
      { communication_disabled_until: inAnHour() },
      "Par aldis"
    )
    discord.modifyMemberAs(
      BRYN.id,
      TORVALD.id,
      { communication_disabled_until: inAnHour() },
      "Pour Torvald"
    )
    discord.removeMemberAs(BRYN.id, LYRA.id, "Provocations")
    const mention = `<@${LYRA.id}>`
    const changes = page.locator("ol").getByRole("listitem")
    const typeFilter = page.getByRole("navigation", {
      name: "Filtrer par type",
    })
    const author = page.getByLabel("Auteur")
    const account = page.getByLabel("Compte", { exact: true })
    const reset = page.getByRole("link", { name: "Réinitialiser" })

    await logIn(ALDIS)
    await page.goto("/audit-log")
    await expect(changes).toHaveCount(50)
    await expect(author).toHaveValue("")
    await expect(account).toHaveValue("")
    await expect(reset).toHaveCount(0)
    await checkAccessibility()

    await typeFilter.getByRole("link", { name: "Exclusions" }).click()
    await expect(page).toHaveURL("/audit-log?type=timeouts")
    await author.fill("BRYN")
    await account.fill(mention)
    await page.getByRole("button", { name: "Filtrer" }).click()
    await expect
      .poll(() => searchParamsOf(page))
      .toEqual({ type: "timeouts", author: "BRYN", account: mention })
    await expect(changes).toHaveCount(50)
    await expect(changes.filter({ hasText: "bryn" })).toHaveCount(50)
    await expect(changes.filter({ hasText: "Compte : Lyra" })).toHaveCount(50)
    await expect(author).toHaveValue("BRYN")
    await expect(account).toHaveValue(mention)
    await expect(reset).toBeVisible()
    await checkAccessibility()

    await page.getByRole("link", { name: "Plus anciens" }).click()
    await expect
      .poll(() => searchParamsOf(page))
      .toMatchObject({
        type: "timeouts",
        author: "BRYN",
        account: mention,
        before: expect.stringMatching(/^\d+$/),
      })
    await expect(changes).toHaveCount(2)
    await expect(changes.filter({ hasText: "bryn" })).toHaveCount(2)
    await expect(changes.filter({ hasText: "Compte : Lyra" })).toHaveCount(2)
    await expect(author).toHaveValue("BRYN")
    await expect(account).toHaveValue(mention)
    await checkAccessibility()

    await page.getByRole("link", { name: "Revenir aux plus récents" }).click()
    await expect
      .poll(() => searchParamsOf(page))
      .toEqual({ type: "timeouts", author: "BRYN", account: mention })
    await expect(changes).toHaveCount(50)

    await typeFilter.getByRole("link", { name: "Tout", exact: true }).click()
    await expect
      .poll(() => searchParamsOf(page))
      .toEqual({ author: "BRYN", account: mention })
    await expect(changes).toHaveCount(50)
    await expect(changes.filter({ hasText: "Expulsion" })).toBeVisible()
    await expect(author).toHaveValue("BRYN")
    await expect(account).toHaveValue(mention)
    await checkAccessibility()

    await typeFilter.getByRole("link", { name: "Expulsions" }).click()
    await expect
      .poll(() => searchParamsOf(page))
      .toEqual({ type: "kicks", author: "BRYN", account: mention })
    await expect(changes).toHaveCount(1)
    await expect(changes).toContainText(["Provocations"])
    await expect(author).toHaveValue("BRYN")
    await expect(account).toHaveValue(mention)
    await checkAccessibility()

    const copied = page.url()
    await page.goto(copied)
    await expect(page).toHaveURL(copied)
    await expect(changes).toHaveCount(1)
    await expect(changes).toContainText(["Provocations"])
    await expect(author).toHaveValue("BRYN")
    await expect(account).toHaveValue(mention)
    await expect(
      typeFilter.getByRole("link", { name: "Expulsions" })
    ).toHaveAttribute("aria-current", "true")
    await expect(reset).toBeVisible()
    await checkAccessibility()

    await author.fill("personne")
    await page.getByRole("button", { name: "Filtrer" }).click()
    await expect
      .poll(() => searchParamsOf(page))
      .toEqual({ type: "kicks", author: "personne", account: mention })
    const noMatch = page.getByText(
      "Aucun changement ne correspond à ces filtres ces 45 derniers jours."
    )
    await expect(noMatch).toBeVisible()
    await expect(changes).toHaveCount(0)
    await checkAccessibility()

    await noMatch
      .locator("..")
      .getByRole("link", { name: "Réinitialiser" })
      .click()
    await expect(page).toHaveURL("/audit-log")
    await expect(author).toHaveValue("")
    await expect(account).toHaveValue("")
    await expect(reset).toHaveCount(0)
    await expect(
      typeFilter.getByRole("link", { name: "Tout", exact: true })
    ).toHaveAttribute("aria-current", "true")
    await expect(changes).toHaveCount(50)
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
