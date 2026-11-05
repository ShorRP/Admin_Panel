import {
  AuditLogEvent,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"

import { blockedWordAction } from "@/blocked-words/blocked-word-action"
import { newPanelRule } from "@/blocked-words/panel-rule"
import type { FakeDiscord } from "@/discord/fake-discord"
import { firstSnowflakeAt } from "@/discord/snowflake-date"
import { MODERATION_ROLE_ID, STAFF_ROLE_ID } from "../playwright.config"
import { dialogTransitions } from "./dialog-opening"
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

function parisDayIn(days: number) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(
    new Date(Date.now() + days * 86_400_000)
  )
}

function written(day: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(day))
}

const DAY_BEFORE = parisDayIn(-1)

const DAY_AFTER = parisDayIn(1)

const FILTERED_ADDRESS = `/audit-log?type=timeouts&author=aldis&account=lyra&text=insultes&from=${DAY_BEFORE}&to=${DAY_AFTER}`

const TOUCH_TARGET_PX = 44

test.describe("on a 360 px screen", () => {
  test.use({ viewport: { width: 360, height: 760 }, hasTouch: true })

  test("the author, the account, the text and the period fold behind a button that opens a sheet docked to the bottom, which sends the address of the inline form, each filter set is a chip that removes it, and a staff member logs out with the button, the chips and the pills in view, and no page is prefetched", async ({
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
    const fold = page.getByRole("button", { name: /^Filtres/ })
    const sheet = page.getByRole("dialog", { name: "Filtres" })
    const chips = page.getByRole("list", { name: "Filtres actifs" })
    const author = sheet.getByLabel("Auteur")
    const account = sheet.getByLabel("Compte", { exact: true })
    const text = sheet.getByLabel("Texte")
    const from = sheet.getByLabel("Du", { exact: true })
    const to = sheet.getByLabel("Au", { exact: true })
    const changes = page.locator("ol").getByRole("listitem")
    const menu = page.getByRole("dialog", { name: "Menu" })

    await logIn(ALDIS)
    await page.goto("/audit-log")
    await expect(page.getByLabel("Auteur")).toBeHidden()
    await expect(page.getByRole("button", { name: "Filtrer" })).toHaveCount(0)
    await expect(fold).toHaveAccessibleName("Filtres")
    await expect(chips).toHaveCount(0)
    const [button, main] = await Promise.all([
      fold.boundingBox(),
      page.getByRole("main").boundingBox(),
    ])
    expect(button).toMatchObject({
      width: main?.width,
      height: TOUCH_TARGET_PX,
    })
    for (const pill of await typeFilter.getByRole("link").all()) {
      expect((await pill.boundingBox())?.height).toBe(TOUCH_TARGET_PX)
    }
    await checkAccessibility()

    await typeFilter.getByRole("link", { name: "Exclusions" }).click()
    await expect(page).toHaveURL("/audit-log?type=timeouts")
    await fold.tap()
    await expect(sheet).toBeVisible()
    await expect(sheet).toBeFocused()
    await expect(sheet.getByRole("button", { name: "Filtrer" })).toBeVisible()
    await expect(
      sheet.getByRole("link", { name: "Réinitialiser" })
    ).toBeVisible()
    await expect
      .poll(async () => {
        const box = await sheet.boundingBox()
        return [
          box?.x,
          box?.width,
          Math.round((box?.y ?? 0) + (box?.height ?? 0)),
        ]
      })
      .toEqual([0, 360, 760])
    await expect(author).toHaveValue("")
    await expect(account).toHaveValue("")
    await checkAccessibility()

    await expect(text).toHaveValue("")
    await expect(from).toHaveAttribute("type", "date")
    await expect(from).toHaveValue("")
    await expect(to).toHaveValue("")
    for (const field of [author, account, text, from, to]) {
      expect((await field.boundingBox())?.height).toBe(TOUCH_TARGET_PX)
    }
    await author.fill("aldis")
    await account.fill("lyra")
    await text.fill("insultes")
    await from.fill(DAY_BEFORE)
    await to.fill(DAY_AFTER)
    await sheet.getByRole("button", { name: "Filtrer" }).click()
    await expect(sheet).toBeHidden()
    await expect(page).toHaveURL(FILTERED_ADDRESS)
    expect([...new URL(page.url()).searchParams.keys()]).toEqual([
      "type",
      "author",
      "account",
      "text",
      "from",
      "to",
    ])
    await expect(changes).toHaveCount(1)
    await expect(fold).toHaveAccessibleName(/^Filtres\s?5 filtres actifs$/)
    const removers = chips.getByRole("link")
    await expect(removers).toHaveText([
      "Retirer le filtre Auteur : aldis",
      "Retirer le filtre Compte : lyra",
      "Retirer le filtre Texte : insultes",
      `Retirer le filtre Du : ${written(DAY_BEFORE)}`,
      `Retirer le filtre Au : ${written(DAY_AFTER)}`,
    ])
    await expect(removers.first()).toHaveAccessibleName(
      "Retirer le filtre Auteur : aldis"
    )
    for (const chip of await removers.all()) {
      expect((await chip.boundingBox())?.height).toBe(TOUCH_TARGET_PX)
    }
    await checkAccessibility()

    await removers.nth(2).click()
    await expect(page).toHaveURL(
      `/audit-log?type=timeouts&author=aldis&account=lyra&from=${DAY_BEFORE}&to=${DAY_AFTER}`
    )
    await expect(removers).toHaveCount(4)
    await expect(fold).toHaveAccessibleName(/^Filtres\s?4 filtres actifs$/)
    await removers.last().click()
    await expect(removers).toHaveCount(3)
    await removers.last().click()
    await expect(page).toHaveURL(
      "/audit-log?type=timeouts&author=aldis&account=lyra"
    )
    await expect(removers).toHaveCount(2)
    await removers.first().click()
    await expect(page).toHaveURL(/\/audit-log\?type=timeouts&account=lyra$/)
    await expect(removers).toHaveText(["Retirer le filtre Compte : lyra"])
    await expect(fold).toHaveAccessibleName(/^Filtres\s?1 filtre actif$/)
    await fold.click()
    await expect(author).toHaveValue("")
    await expect(account).toHaveValue("lyra")
    await expect(text).toHaveValue("")
    await expect(from).toHaveValue("")
    await expect(to).toHaveValue("")
    await sheet.getByRole("link", { name: "Réinitialiser" }).click()
    await expect(sheet).toBeHidden()
    await expect(page).toHaveURL("/audit-log")
    await expect(chips).toHaveCount(0)
    await expect(
      typeFilter.getByRole("link", { name: "Tout", exact: true })
    ).toHaveAttribute("aria-current", "true")
    await checkAccessibility()

    await page.goto(FILTERED_ADDRESS)
    await page.waitForLoadState()
    await expect(removers).toHaveCount(5)
    const inView = [
      ...(await typeFilter.getByRole("link").all()),
      page.getByRole("link", { name: "Réinitialiser" }),
      fold,
      ...(await removers.all()),
    ]
    for (const control of inView) {
      await expect(control).toBeInViewport()
    }
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Ouvrir le menu" })
      .click()
    await expect(menu).toBeVisible()
    const mounted = await page
      .locator('main a[href], main button[aria-haspopup="dialog"]')
      .all()
    expect(mounted).toHaveLength(inView.length)
    await logOutWithScriptsHeld(
      page,
      mounted,
      menu.getByRole("button", { name: "Se déconnecter" })
    )
    expect(prefetchedPaths).toEqual([])
  })

  test("the filter sheet fades in and slides up only with motion", async ({
    page,
    logIn,
  }) => {
    const fold = page.getByRole("button", { name: /^Filtres/ })
    const sheet = page.getByRole("dialog", { name: "Filtres" })

    await logIn(ALDIS)
    await page.goto("/audit-log")
    await page.waitForLoadState()
    for (const reducedMotion of ["reduce", "no-preference"] as const) {
      await page.emulateMedia({ reducedMotion })
      const transitions = dialogTransitions(page)
      await fold.click()
      expect(await (await transitions).jsonValue()).toEqual(
        reducedMotion === "reduce" ? ["opacity"] : ["opacity", "translate"]
      )
      await expect(sheet).toBeVisible()
      await sheet.getByRole("button", { name: "Fermer" }).click()
      await expect(sheet).toBeHidden()
    }
  })

  test("the pagination's links take the whole width, side by side when both show", async ({
    page,
    logIn,
    discord,
    checkAccessibility,
  }) => {
    await seedBlockedWordChanges(discord, 101)
    const main = page.getByRole("main")
    const pagination = page.getByRole("navigation", {
      name: "Pages du journal d’audit",
    })
    const older = pagination.getByRole("link", { name: "Plus anciens" })
    const newer = pagination.getByRole("link", {
      name: "Revenir aux plus récents",
    })

    await logIn(ALDIS)
    await page.goto("/audit-log?author=aldis")
    await expect(older).toBeVisible()
    await expect(newer).toHaveCount(0)
    const alone = await older.boundingBox()
    expect([alone?.width, alone?.height]).toEqual([
      (await main.boundingBox())?.width,
      TOUCH_TARGET_PX,
    ])
    await checkAccessibility()

    await older.click()
    await expect(page).toHaveURL(/^[^?]*\/audit-log\?author=aldis&before=\d+$/)
    await expect(newer).toBeVisible()
    await expect(older).toBeVisible()
    const [first, second, column] = await Promise.all([
      newer.boundingBox(),
      older.boundingBox(),
      main.boundingBox(),
    ])
    expect(first?.y).toBe(second?.y)
    expect(first?.height).toBe(second?.height)
    expect(
      Math.abs((first?.width ?? 0) - (second?.width ?? 0))
    ).toBeLessThanOrEqual(1)
    expect(first?.height).toBeGreaterThanOrEqual(TOUCH_TARGET_PX)
    expect((first?.x ?? 0) + (first?.width ?? 0)).toBeLessThan(second?.x ?? 0)
    expect(first?.x).toBe(column?.x)
    expect(Math.round((second?.x ?? 0) + (second?.width ?? 0))).toBe(
      Math.round((column?.x ?? 0) + (column?.width ?? 0))
    )
    await checkAccessibility()
  })
})

test.describe("on a 768 px screen", () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test("the author, the account, the text and the period stay in the page's form, with no button and no chip, and send the address of the sheet", async ({
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
    const typeFilter = page.getByRole("navigation", {
      name: "Filtrer par type",
    })

    await logIn(ALDIS)
    await page.goto("/audit-log?type=timeouts")
    await expect(page.getByRole("button", { name: /^Filtres/ })).toHaveCount(0)
    for (const pill of await typeFilter.getByRole("link").all()) {
      expect((await pill.boundingBox())?.height).toBe(TOUCH_TARGET_PX)
    }
    await page.getByLabel("Auteur").fill("aldis")
    await page.getByLabel("Compte", { exact: true }).fill("lyra")
    await page.getByLabel("Texte").fill("insultes")
    await page.getByLabel("Du", { exact: true }).fill(DAY_BEFORE)
    await page.getByLabel("Au", { exact: true }).fill(DAY_AFTER)
    await page.getByRole("button", { name: "Filtrer" }).click()
    await expect(page).toHaveURL(FILTERED_ADDRESS)
    await expect(
      page.getByRole("list", { name: "Filtres actifs" })
    ).toHaveCount(0)
    await expect(page.getByLabel("Texte")).toHaveValue("insultes")
    await checkAccessibility()
  })
})

test.describe("on a 1,024 px screen", () => {
  test.use({ viewport: { width: 1024, height: 768 } })

  test("the fields of the page's form sit in view, in lines of the page's column, and the form sends the same address", async ({
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

    await logIn(ALDIS)
    await page.goto("/audit-log?type=timeouts")
    await expect(page.getByRole("button", { name: /^Filtres/ })).toHaveCount(0)
    const fields = [
      page.getByLabel("Auteur"),
      page.getByLabel("Compte", { exact: true }),
      page.getByLabel("Texte"),
      page.getByLabel("Du", { exact: true }),
      page.getByLabel("Au", { exact: true }),
    ]
    const main = await page.getByRole("main").boundingBox()
    for (const field of fields) {
      await expect(field).toBeInViewport()
      const box = await field.boundingBox()
      expect(box?.x).toBeGreaterThanOrEqual(main?.x ?? 0)
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
        (main?.x ?? 0) + (main?.width ?? 0)
      )
    }
    await fields[0]?.fill("aldis")
    await fields[1]?.fill("lyra")
    await fields[2]?.fill("insultes")
    await fields[3]?.fill(DAY_BEFORE)
    await fields[4]?.fill(DAY_AFTER)
    await page.getByRole("button", { name: "Filtrer" }).click()
    await expect(page).toHaveURL(FILTERED_ADDRESS)
    await expect(
      page.getByRole("listitem").filter({ hasText: "Insultes" })
    ).toBeVisible()
    await checkAccessibility()
  })
})

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
      page.getByLabel("Texte"),
      page.getByLabel("Du", { exact: true }),
      page.getByLabel("Au", { exact: true }),
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
  return Object.fromEntries(
    [...new URL(page.url()).searchParams].filter(([, value]) => value !== "")
  )
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

function kickedDaysAgo(days: number, reason: string) {
  const moment = new Date(Date.now() - days * 86_400_000)
  return {
    id: firstSnowflakeAt(moment) ?? "0",
    action_type: AuditLogEvent.MemberKick,
    user_id: BRYN.id,
    target_id: LYRA.id,
    reason,
  }
}

test.describe("filtered by a period and a text", () => {
  test.use({
    discordState: {
      members: [
        { user: ALDIS, roles: [STAFF_ROLE_ID] },
        { user: BRYN },
        { user: LYRA },
      ],
      auditLogEntries: [
        kickedDaysAgo(0.01, "Spam d’aujourd’hui"),
        kickedDaysAgo(10, "Spam ancien"),
        kickedDaysAgo(30, "Provocations"),
      ],
    },
  })

  test("a staff member keeps the changes whose reason holds a text, whatever its case, then those of a period of days, reads that only 45 days are read when the period starts earlier, that a period outside them or reversed matches nothing, and that an invalid bound counts as absent", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    const changes = page.locator("ol").getByRole("listitem")
    const text = page.getByLabel("Texte")
    const from = page.getByLabel("Du", { exact: true })
    const to = page.getByLabel("Au", { exact: true })
    const note = page.getByText("Seuls les 45 derniers jours sont lus", {
      exact: false,
    })
    const reset = page.getByRole("link", { name: "Réinitialiser" })

    await logIn(ALDIS)
    await page.goto("/audit-log")
    await expect(changes).toHaveCount(3)
    await checkAccessibility()

    await text.fill("SPAM")
    await page.getByRole("button", { name: "Filtrer" }).click()
    await expect.poll(() => searchParamsOf(page)).toEqual({ text: "SPAM" })
    await expect(changes).toHaveCount(2)
    await expect(
      changes.filter({ hasText: "Motif : Spam ancien" })
    ).toBeVisible()
    await expect(text).toHaveValue("SPAM")
    await checkAccessibility()

    await from.fill(parisDayIn(-12))
    await to.fill(parisDayIn(-8))
    await page.getByRole("button", { name: "Filtrer" }).click()
    await expect
      .poll(() => searchParamsOf(page))
      .toEqual({
        text: "SPAM",
        from: parisDayIn(-12),
        to: parisDayIn(-8),
      })
    await expect(changes).toHaveCount(1)
    await expect(changes).toContainText("Motif : Spam ancien")
    await expect(from).toHaveValue(parisDayIn(-12))
    await expect(to).toHaveValue(parisDayIn(-8))
    await expect(note).toHaveCount(0)
    await checkAccessibility()

    await page.goto("/audit-log?from=2020-01-01")
    await expect(changes).toHaveCount(3)
    await expect(note).toBeVisible()
    await checkAccessibility()

    await page.goto("/audit-log?from=2020-01-01&text=introuvable")
    await expect(changes).toHaveCount(0)
    await expect(note).toBeVisible()
    await expect(
      page.getByText(
        "Aucun changement ne correspond à ces filtres ces 45 derniers jours."
      )
    ).toBeVisible()
    await checkAccessibility()

    await page.goto("/audit-log?to=2020-12-31")
    await expect(changes).toHaveCount(0)
    await expect(
      page.getByText(
        "Cette période n’est pas dans les 45 derniers jours, les seuls que le journal d’audit de Discord garde."
      )
    ).toBeVisible()
    await expect(note).toHaveCount(0)
    await expect(reset.first()).toBeVisible()
    await checkAccessibility()

    await page.goto(`/audit-log?from=${parisDayIn(1)}`)
    await expect(changes).toHaveCount(0)
    await expect(
      page.getByText("Cette période n’est pas dans les 45 derniers jours", {
        exact: false,
      })
    ).toBeVisible()

    await page.goto(`/audit-log?from=${parisDayIn(-1)}&to=${parisDayIn(-5)}`)
    await expect(changes).toHaveCount(0)
    await expect(
      page.getByText(
        "Le premier jour de la période est après son dernier jour",
        {
          exact: false,
        }
      )
    ).toBeVisible()
    await checkAccessibility()

    await page.goto("/audit-log?from=2026-02-30&to=hier&text=%20%20")
    await expect(changes).toHaveCount(3)
    await expect(from).toHaveValue("")
    await expect(to).toHaveValue("")
    await expect(text).toHaveValue("")
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
