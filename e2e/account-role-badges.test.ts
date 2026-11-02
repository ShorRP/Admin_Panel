import type { FakeRole } from "@/discord/fake-discord"
import { MODERATION_ROLE_ID, STAFF_ROLE_ID } from "../playwright.config"
import { expect, test, type Locator, type Page } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

const CORVUS = { id: "1400000000000000003", username: "corvus" }

const DAGNY = { id: "1400000000000000004", username: "dagny" }

const ERIK = { id: "1400000000000000005", username: "erik" }

const FJORD = { id: "1400000000000000006", username: "fjord" }

const GUNNAR = { id: "1400000000000000007", username: "gunnar" }

const HALVAR = { id: "1400000000000000008", username: "halvar" }

function role(
  id: string,
  name: string,
  position: number,
  primaryColor: number
): FakeRole {
  return {
    id,
    name,
    position,
    colors: {
      primary_color: primaryColor,
      secondary_color: null,
      tertiary_color: null,
    },
  }
}

const CITIZEN = role("1300000000000000010", "Citoyen", 1, 0x3498db)

const GUEST = role("1300000000000000011", "Invité", 2, 0)

const GUARD = role("1300000000000000012", "Garde de Blancherive", 3, 0xe67e22)

const LONG_NAME =
  "Gardien des archives de la Couronne et chevalier de l’Ordre de Blancherive"

const ARCHIVIST = role("1300000000000000013", LONG_NAME, 4, 0x2ecc71)

const TIMEOUT = "2099-11-02T18:30:00.000000+00:00"

test.use({
  discordState: {
    roles: [CITIZEN, GUEST, GUARD, ARCHIVIST],
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] },
      { user: BRYNJA, roles: [CITIZEN.id, GUARD.id] },
      { user: CORVUS, roles: [GUEST.id] },
      { user: DAGNY },
      {
        user: ERIK,
        roles: [GUARD.id],
        communication_disabled_until: TIMEOUT,
      },
      { user: FJORD, communication_disabled_until: TIMEOUT },
      { user: HALVAR, roles: [ARCHIVIST.id] },
    ],
    bans: [{ user: GUNNAR }],
  },
})

const RANKS = "1–8 sur 8"

function rowOf(page: Page, username: string) {
  return page
    .getByRole("main")
    .getByRole("list", { name: RANKS })
    .getByRole("link")
    .filter({ hasText: `@${username}` })
}

function badgeOf(row: Locator, text: string | RegExp) {
  return row.getByText(text).locator("xpath=..")
}

function dotOf(badge: Locator) {
  return badge.locator("> span[aria-hidden='true']")
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("The element is not visible.")
  }
  return box
}

async function mutedForeground(page: Page) {
  return await page.evaluate(() => {
    const probe = document.createElement("div")
    probe.style.backgroundColor = "var(--muted-foreground)"
    document.body.append(probe)
    const { backgroundColor } = getComputedStyle(probe)
    probe.remove()
    return backgroundColor
  })
}

test("the list shows a member's highest role as a badge whose dot has the role's color on Discord, a role with no color a neutral dot, a timed-out member's role beside the end of their timeout, « Membre du serveur » for a member with no role and « Compte banni » for a banned account", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto("/records")
  await expect(
    page.getByRole("main").getByRole("list", { name: RANKS })
  ).toBeVisible()

  await expect(rowOf(page, "brynja")).toHaveAccessibleName(
    /^brynja\s*@brynja\s*Garde de Blancherive$/
  )
  const guard = badgeOf(rowOf(page, "brynja"), "Garde de Blancherive")
  await expect(dotOf(guard)).toHaveCSS("background-color", "rgb(230, 126, 34)")
  await expect(dotOf(guard)).toHaveAttribute("aria-hidden", "true")
  await expect(rowOf(page, "brynja")).not.toContainText("Citoyen")
  await expect(rowOf(page, "brynja")).not.toContainText("Membre du serveur")

  await expect(rowOf(page, "corvus")).toHaveAccessibleName(
    /^corvus\s*@corvus\s*Invité$/
  )
  await expect(dotOf(badgeOf(rowOf(page, "corvus"), "Invité"))).toHaveCSS(
    "background-color",
    await mutedForeground(page)
  )

  await expect(rowOf(page, "dagny")).toHaveAccessibleName(
    /^dagny\s*@dagny\s*Membre du serveur$/
  )
  await expect(rowOf(page, "aldis")).toHaveAccessibleName(
    /^aldis\s*@aldis\s*Membre du serveur$/
  )

  await expect(rowOf(page, "erik")).toHaveAccessibleName(
    /^erik\s*@erik\s*Garde de Blancherive\s*Exclu jusqu’au 2 nov\. 2099, 19:30$/
  )
  await expect(rowOf(page, "fjord")).toHaveAccessibleName(
    /^fjord\s*@fjord\s*Exclu jusqu’au 2 nov\. 2099, 19:30$/
  )
  await expect(rowOf(page, "gunnar")).toHaveAccessibleName(
    /^gunnar\s*@gunnar\s*Compte banni$/
  )
  await expect(rowOf(page, "halvar")).toHaveAccessibleName(
    new RegExp(`^halvar\\s*@halvar\\s*${LONG_NAME}$`)
  )

  const role = badgeOf(rowOf(page, "erik"), "Garde de Blancherive")
  const timeout = badgeOf(rowOf(page, "erik"), /Exclu jusqu’au/)
  const [roleBox, timeoutBox] = [await boxOf(role), await boxOf(timeout)]
  expect(timeoutBox.x).toBeGreaterThan(roleBox.x + roleBox.width)
  expect(timeoutBox.y).toBeCloseTo(roleBox.y, 0)
  await checkAccessibility()
})

test("on a 360 px screen, a timed-out member's role and the end of their timeout wrap onto two lines under their name, and a long role name stays inside the row", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  await page.setViewportSize({ width: 360, height: 760 })
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto("/records")
  await expect(
    page.getByRole("main").getByRole("list", { name: RANKS })
  ).toBeVisible()

  const role = badgeOf(rowOf(page, "erik"), "Garde de Blancherive")
  const timeout = badgeOf(rowOf(page, "erik"), /Exclu jusqu’au/)
  const name = rowOf(page, "erik").getByText("erik", { exact: true })
  const [nameBox, roleBox, timeoutBox] = [
    await boxOf(name),
    await boxOf(role),
    await boxOf(timeout),
  ]
  expect(roleBox.y).toBeGreaterThan(nameBox.y + nameBox.height - 1)
  expect(timeoutBox.y).toBeGreaterThanOrEqual(roleBox.y + roleBox.height - 1)
  for (const box of [roleBox, timeoutBox]) {
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(360)
  }

  const long = badgeOf(rowOf(page, "halvar"), LONG_NAME)
  const longBox = await boxOf(long)
  expect(longBox.x).toBeGreaterThanOrEqual(0)
  expect(longBox.x + longBox.width).toBeLessThanOrEqual(360)
  expect(longBox.height).toBeGreaterThan(24)
  await checkAccessibility()
})
