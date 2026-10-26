import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

test.use({
  discordState: { members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }] },
})

test("a staff member adds a blocked word, then removes it, each write showing its message", async ({
  page,
  logIn,
  discord,
}) => {
  await logIn(ALDIS)
  await page.goto("/blocked-words")
  await expect(page).toHaveTitle("Mots interdits")
  await expect(
    page.getByRole("heading", { level: 1, name: "Mots interdits" })
  ).toBeVisible()
  await expect(
    page.getByText("Aucun mot interdit pour l’instant.")
  ).toBeVisible()

  const field = page.getByLabel("Mot ou expression")
  await field.fill("foo")
  await page.getByRole("button", { name: "Ajouter" }).click()

  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "« foo » est maintenant un mot interdit." })
  ).toBeVisible()
  await expect(field).toHaveValue("")
  await expect(
    page.getByText("1 mot interdit sur 1 000 possibles.")
  ).toBeVisible()
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: ["foo"] } },
  ])

  await page
    .getByRole("listitem")
    .filter({ hasText: "foo" })
    .getByRole("button", { name: "Retirer" })
    .click()

  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "« foo » n’est plus un mot interdit." })
  ).toBeVisible()
  await expect(
    page.getByText("Aucun mot interdit pour l’instant.")
  ).toBeVisible()
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { trigger_metadata: { keyword_filter: [] } },
  ])
})

test("a refused blocked word stays in the field, which its message describes", async ({
  page,
  logIn,
}) => {
  const tooLong = "é".repeat(61)
  await logIn(ALDIS)
  await page.goto("/blocked-words")

  const field = page.getByLabel("Mot ou expression")
  await field.fill(tooLong)
  await page.getByRole("button", { name: "Ajouter" }).click()

  await expect(field).toHaveAccessibleDescription(
    "Raccourcis ce mot : AutoMod n’accepte pas plus de 60 caractères."
  )
  await expect(field).toHaveValue(tooLong)
})
