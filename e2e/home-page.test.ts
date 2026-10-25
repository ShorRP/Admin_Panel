import { expect, test } from "./fixtures"

test("the home page is titled in French", async ({ page }) => {
  await page.goto("/")

  await expect(page).toHaveTitle("Panel d’administration de Shor")
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Panel d’administration de Shor",
    })
  ).toBeVisible()
})
