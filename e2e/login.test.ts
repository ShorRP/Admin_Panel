import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

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

test("a staff member logs in and lands on the panel", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  await logIn(ALDIS)

  await expect(page).toHaveURL("/")
  await expect(page).toHaveTitle("Panel d’administration de Shor")
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Panel d’administration de Shor",
    })
  ).toBeVisible()
  await expect(
    page.getByText("Le staff de Shor y administre le serveur Discord.")
  ).toBeVisible()
  await checkAccessibility()
})

test("a member without the staff role is refused in French", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  await logIn(BRYNJA)

  await expect(page).toHaveURL("/login/refused")
  await expect(page).toHaveTitle(/^Accès refusé/)
  await expect(
    page.getByText(
      "Ce compte Discord n’a pas le rôle staff sur le serveur Discord de Shor."
    )
  ).toBeVisible()
  expect(sessionCookiesIn(await page.context().cookies())).toEqual([])
  await checkAccessibility()
})

test("a visitor without a session goes to /login", async ({ page }) => {
  const response = await page.request.get("/", { maxRedirects: 0 })

  expect(response.status()).toBe(307)
  expect(response.headers()["location"]).toBe("/login")
})

test("a staff member who loses the staff role lands on /login/refused at the next page, and can still log out", async ({
  page,
  discord,
  logIn,
  checkAccessibility,
}) => {
  await logIn(ALDIS)
  await expect(page).toHaveURL("/")
  await expect(
    page.getByText("Le staff de Shor y administre le serveur Discord.")
  ).toBeVisible()
  await checkAccessibility()

  discord.removeMemberRole(ALDIS.id, STAFF_ROLE_ID)
  await page.reload()

  await expect(page).toHaveURL("/login/refused")
  await checkAccessibility()
  await page.getByRole("button", { name: "Se déconnecter" }).click()
  await expect(page).toHaveURL("/login/logged-out")
  await expect(
    page.getByText("Ta session sur le panel est terminée.")
  ).toBeVisible()
  expect(sessionCookiesIn(await page.context().cookies())).toEqual([])
  await checkAccessibility()
})
