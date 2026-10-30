import { DiscordError } from "@/discord/discord-error"
import { ROUTES } from "@/discord/routes"
import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const REPORT_CHANNEL_URL =
  "https://discord.com/channels/1545540661774913626/1550835033311412224"

function minifiedReactError(code: number) {
  return `Minified React error #${code}; visit https://react.dev/errors/${code} for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`
}

test.use({
  discordState: { members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }] },
})

test("an unknown URL shows the French not-found page, without the navigation, whose link leads back to the panel", async ({
  page,
  logIn,
  checkAccessibility,
  browserConsole,
}) => {
  browserConsole.expectProblems([
    "console.error: Failed to load resource: the server responded with a status of 404 (Not Found)",
  ])
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")

  const response = await page.goto("/no-such-page")

  expect(response?.status()).toBe(404)
  await expect(page).toHaveTitle("Page introuvable – Panel de Shor")
  await expect(
    page.getByRole("heading", { level: 1, name: "Page introuvable" })
  ).toHaveCSS("font-family", /^"EB Garamond",/)
  await expect(page.getByText("Cette page n’existe pas.")).toBeVisible()
  await expect(
    page.getByRole("complementary", { includeHidden: true })
  ).toHaveCount(0)
  await expect(page.getByRole("banner", { includeHidden: true })).toHaveCount(0)
  await checkAccessibility()

  await page.getByRole("link", { name: "Revenir à l’accueil" }).click()
  await expect(page).toHaveURL("/blocked-words")
  await expect(
    page.getByText("Aucun mot interdit pour l’instant.")
  ).toBeVisible()
})

test("Discord unavailable while the audit log is read shows the error page, without the navigation, with its reference, then « Réessayer » shows the page", async ({
  page,
  discord,
  logIn,
  checkAccessibility,
  browserConsole,
}) => {
  const main = page.getByRole("main")
  browserConsole.expectProblems([
    `console.error: Error: ${minifiedReactError(441)}`,
    `pageerror: ${minifiedReactError(419)}`,
  ])

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.waitForLoadState()
  discord.failNext(
    "getAuditLog",
    new DiscordError({
      method: "GET",
      route: ROUTES.guildAuditLog,
      status: 503,
    })
  )

  await page.goto("/audit-log")

  await expect(page).toHaveURL("/audit-log")
  await expect(
    page.getByRole("heading", { level: 1, name: "Page indisponible" })
  ).toHaveCSS("font-family", /^"EB Garamond",/)
  await expect(main).toContainText(
    /^Page indisponibleLe panel n’a pas pu afficher cette page\. Discord ne répond peut-être pas : réessaie dans un instant\. Si ça continue, signale-le dans #créer-ticket avec la référence \d+\.Réessayer$/
  )
  await expect(
    main.getByRole("link", { name: "#créer-ticket" })
  ).toHaveAttribute("href", REPORT_CHANNEL_URL)
  await expect(
    page.getByRole("complementary", { includeHidden: true })
  ).toHaveCount(0)
  await expect(page.getByRole("banner", { includeHidden: true })).toHaveCount(0)
  await checkAccessibility()

  await main.getByRole("button", { name: "Réessayer" }).click()

  await expect(
    page.getByText(
      "Aucun changement des mots interdits, aucune sanction ni levée ces 45 derniers jours."
    )
  ).toBeVisible()
  await expect(page.getByRole("complementary")).toContainText("aldis")
  await checkAccessibility()
})
