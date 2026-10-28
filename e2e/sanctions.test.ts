import { MODERATION_ROLE_ID, STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const LYRA = {
  id: "1400000000000000003",
  username: "lyra_gates",
  global_name: "Lyra",
}

const STAFF = { id: STAFF_ROLE_ID, name: "Staff", position: 4 }

const MODERATION = { id: MODERATION_ROLE_ID, name: "Modération", position: 3 }

const PANEL = { id: "1300000000000000020", name: "Shor Panel", position: 2 }

const GUARD = { id: "1300000000000000010", name: "Garde", position: 1 }

test.use({
  discordState: {
    roles: [STAFF, MODERATION, PANEL, GUARD],
    applicationRoles: [PANEL.id],
    members: [
      { user: ALDIS, roles: [STAFF.id, MODERATION.id] },
      { user: LYRA, nick: "Lyra des Brumes", roles: [GUARD.id] },
    ],
  },
})

test("a moderator finds a member, opens their record, times them out with the direct message, then lifts the timeout, each in the record's history", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")
  const status = main.getByRole("status")
  const history = main.getByRole("region", {
    name: "Historique des sanctions",
  })
  const entries = history.getByRole("listitem")

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto("/records")
  await page.waitForLoadState()
  await page.getByLabel("Compte").fill("lyr")
  await page.getByRole("button", { name: "Chercher" }).click()
  await main.getByRole("link", { name: /^Lyra/ }).click()
  await expect(page).toHaveURL(`/records/${LYRA.id}`)
  await expect(
    main.getByRole("heading", { name: "Sanctions", exact: true })
  ).toBeVisible()
  await expect(main).toContainText("Membre du serveur")
  await expect(
    main.getByRole("button", { name: "Lever l’exclusion temporaire" })
  ).toHaveCount(0)
  await expect(history).toContainText(
    "Aucune sanction ni levée dans l’historique."
  )
  await checkAccessibility()

  await main.getByRole("radio", { name: "1 heure" }).check()
  await main
    .getByLabel("Motif de l’exclusion temporaire")
    .fill("Insultes répétées")
  await expect(
    main.getByRole("checkbox", { name: "Prévenir en message privé" })
  ).toBeChecked()
  await main.getByRole("button", { name: "Exclure temporairement" }).click()
  await expect(status).toHaveText(
    /^Lyra des Brumes est en exclusion temporaire jusqu’au .+\. Le message privé est parti\.$/
  )
  await expect(main).toContainText("Membre exclu temporairement jusqu’au")
  await expect(main.getByLabel("Motif de l’exclusion temporaire")).toHaveValue(
    ""
  )
  await expect(main.getByRole("radio", { name: "1 heure" })).not.toBeChecked()
  expect(discord.directMessagesTo(LYRA.id)).toEqual([
    expect.stringContaining("Motif : Insultes répétées"),
  ])
  await expect(entries).toHaveCount(1)
  await expect(entries.first()).toContainText("Exclusion temporaire jusqu’au")
  await expect(entries.first()).toContainText("par aldis, depuis le panel")
  await expect(entries.first()).toContainText("Motif : Insultes répétées")
  await checkAccessibility()

  await main.getByLabel("Motif de la levée").fill("Erreur de cible")
  await main
    .getByRole("button", { name: "Lever l’exclusion temporaire" })
    .click()
  await expect(status).toHaveText(
    "L’exclusion temporaire de Lyra des Brumes est levée."
  )
  await expect(main).toContainText("Membre du serveur")
  await expect(
    main.getByRole("button", { name: "Lever l’exclusion temporaire" })
  ).toHaveCount(0)
  await expect(entries).toHaveCount(2)
  await expect(entries.first()).toContainText("Levée de l’exclusion temporaire")
  await expect(entries.first()).toContainText("Motif : Erreur de cible")
  await checkAccessibility()
})

test("a refused timeout stays in its form, with its message", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto(`/records/${LYRA.id}`)
  await page.waitForLoadState()
  await main.getByRole("radio", { name: "28 jours" }).check()
  await main.getByLabel("Motif de l’exclusion temporaire").fill("  ")
  await main
    .getByRole("checkbox", { name: "Prévenir en message privé" })
    .uncheck()
  await main.getByRole("button", { name: "Exclure temporairement" }).click()

  await expect(main.getByRole("alert")).toHaveText("Saisis un motif.")
  await expect(main.getByRole("radio", { name: "28 jours" })).toBeChecked()
  await expect(main.getByLabel("Motif de l’exclusion temporaire")).toHaveValue(
    "  "
  )
  await expect(
    main.getByRole("checkbox", { name: "Prévenir en message privé" })
  ).not.toBeChecked()
  await expect(main).toContainText("Membre du serveur")
  await checkAccessibility()
})
