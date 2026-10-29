import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test, type Locator, type Page } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

test.use({
  discordState: {
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID] },
      { user: BRYNJA, roles: [] },
    ],
  },
})

function sessionCookiesIn(cookies: { name: string }[]) {
  return cookies.filter(({ name }) => name === "__Host-session")
}

async function expectThemeColors(
  page: Page,
  control: Locator,
  colors: Record<string, string>
) {
  await page.mouse.move(0, 0)
  const expected = await page.evaluate((colors) => {
    const probe = document.createElement("div")
    for (const [property, variable] of Object.entries(colors)) {
      probe.style.setProperty(property, `var(${variable})`)
    }
    document.body.append(probe)
    const style = getComputedStyle(probe)
    const values = Object.keys(colors).map(
      (property) => [property, style.getPropertyValue(property)] as const
    )
    probe.remove()
    return values
  }, colors)
  for (const [property, value] of expected) {
    await expect(control).toHaveCSS(property, value)
  }
}

test("a staff member logs in and lands on the blocked words, beside a sidebar that names them", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  await logIn(ALDIS)

  await expect(page).toHaveURL("/blocked-words")
  await expect(page).toHaveTitle("Mots interdits – Panel de Shor")
  await expect(page.getByRole("complementary")).toContainText("aldis")
  await expect(
    page.getByText("Aucun mot interdit pour l’instant.")
  ).toBeVisible()
  await checkAccessibility()
})

test("a member without the staff role is refused in French, offered to log in again through a primary button, or to log out through an outline one", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  await logIn(BRYNJA)

  await expect(page).toHaveURL("/login/refused")
  await expect(page).toHaveTitle("Accès refusé – Panel de Shor")
  await expect(
    page.getByRole("heading", { level: 1, name: "Accès refusé" })
  ).toBeVisible()
  await expect(
    page.getByText(
      "Ce compte Discord n’a pas le rôle staff sur le serveur Discord de Shor."
    )
  ).toBeVisible()
  await expect(
    page.getByRole("complementary", { includeHidden: true })
  ).toHaveCount(0)
  await expect(page.getByRole("banner", { includeHidden: true })).toHaveCount(0)
  expect(sessionCookiesIn(await page.context().cookies())).toEqual([])
  await expectThemeColors(
    page,
    page.getByRole("link", { name: "Se reconnecter" }),
    { "background-color": "--primary", color: "--primary-foreground" }
  )
  await expectThemeColors(
    page,
    page.getByRole("button", { name: "Se déconnecter" }),
    {
      "background-color": "--background",
      "border-top-color": "--border",
      color: "--foreground",
    }
  )
  await checkAccessibility()
})

test("a visitor without a session goes to /login", async ({ page }) => {
  const response = await page.request.get("/blocked-words", {
    maxRedirects: 0,
  })

  expect(response.status()).toBe(307)
  expect(response.headers()["location"]).toBe("/login")
})

test("a staff member who loses the staff role lands on /login/refused at the next page, and can still log out, then log in with Discord again through a primary button", async ({
  page,
  discord,
  logIn,
  checkAccessibility,
}) => {
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await expect(
    page.getByText("Aucun mot interdit pour l’instant.")
  ).toBeVisible()
  await checkAccessibility()

  discord.removeMemberRole(ALDIS.id, STAFF_ROLE_ID)
  await page.reload()

  await expect(page).toHaveURL("/login/refused")
  await checkAccessibility()
  await page.getByRole("button", { name: "Se déconnecter" }).click()
  await expect(page).toHaveURL("/login/logged-out")
  await expect(
    page.getByRole("heading", { level: 1, name: "Ta session est terminée." })
  ).toBeVisible()
  await expectThemeColors(
    page,
    page.getByRole("link", { name: "Se connecter avec Discord" }),
    { "background-color": "--primary", color: "--primary-foreground" }
  )
  await expect(
    page.getByRole("complementary", { includeHidden: true })
  ).toHaveCount(0)
  await expect(page.getByRole("banner", { includeHidden: true })).toHaveCount(0)
  expect(sessionCookiesIn(await page.context().cookies())).toEqual([])
  await checkAccessibility()
})
