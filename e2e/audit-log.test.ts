import { newPanelRule } from "@/blocked-words/panel-rule"
import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

test.use({
  discordState: { members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }] },
})

function addition(word: string) {
  return `aldis (${ALDIS.id}) : ajout de « ${word} »`
}

test("a staff member reads the audit log, newest changes first, then the older ones", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
}) => {
  const rule = await discord.createAutoModerationRule(
    newPanelRule(["mot0"]),
    addition("mot0")
  )
  for (let index = 1; index <= 50; index++) {
    await discord.modifyAutoModerationRule(
      rule.id,
      { trigger_metadata: { keyword_filter: [`mot${index}`] } },
      addition(`mot${index}`)
    )
  }
  const newest = page.getByRole("cell", {
    name: "Ajout de « mot50 »",
    exact: true,
  })
  const oldest = page.getByRole("cell", {
    name: "Ajout de « mot0 »",
    exact: true,
  })

  await logIn(ALDIS)
  await page.goto("/audit-log")
  await expect(page).toHaveTitle("Journal d’audit")
  await expect(
    page.getByRole("heading", { level: 1, name: "Journal d’audit" })
  ).toBeVisible()
  await expect(
    page.getByText("L’historique couvre 45 jours. Heures de Paris.")
  ).toBeVisible()
  await expect(page.getByRole("row").filter({ has: newest })).toContainText(
    "aldis"
  )
  await expect(oldest).toHaveCount(0)
  await checkAccessibility()

  await page.getByRole("link", { name: "Plus anciens" }).click()
  await expect(oldest).toBeVisible()
  await expect(newest).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Plus anciens" })).toHaveCount(0)
  await checkAccessibility()

  await page.getByRole("link", { name: "Revenir aux plus récents" }).click()
  await expect(newest).toBeVisible()
  await expect(page).toHaveURL("/audit-log")
})
