import {
  BAN_ROLE_ID,
  MODERATION_ROLE_ID,
  STAFF_ROLE_ID,
} from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const SIGRID = { id: "1400000000000000010", username: "sigrid" }

const LYRA = {
  id: "1400000000000000003",
  username: "lyra_gates",
  global_name: "Lyra",
}

const STAFF = { id: STAFF_ROLE_ID, name: "Staff", position: 5 }

const MODERATION = { id: MODERATION_ROLE_ID, name: "Modération", position: 4 }

const BANS = { id: BAN_ROLE_ID, name: "Bannissements", position: 3 }

const PANEL = { id: "1300000000000000020", name: "Shor Panel", position: 2 }

const GUARD = { id: "1300000000000000010", name: "Garde", position: 1 }

test.use({
  discordState: {
    roles: [STAFF, MODERATION, BANS, PANEL, GUARD],
    applicationRoles: [PANEL.id],
    members: [
      { user: ALDIS, roles: [STAFF.id, MODERATION.id] },
      { user: SIGRID, roles: [STAFF.id, MODERATION.id, BANS.id] },
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
  const timeout = main.getByRole("region", { name: "Exclusion temporaire" })
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
  await expect(main.getByRole("region", { name: "Bannissement" })).toHaveCount(
    0
  )
  await checkAccessibility()

  await timeout.getByRole("radio", { name: "1 heure" }).check()
  await timeout
    .getByLabel("Motif de l’exclusion temporaire")
    .fill("Insultes répétées")
  await expect(
    timeout.getByRole("checkbox", { name: "Prévenir en message privé" })
  ).toBeChecked()
  await timeout.getByRole("button", { name: "Exclure temporairement" }).click()
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
  const timeout = main.getByRole("region", { name: "Exclusion temporaire" })

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto(`/records/${LYRA.id}`)
  await page.waitForLoadState()
  await timeout.getByRole("radio", { name: "28 jours" }).check()
  await timeout.getByLabel("Motif de l’exclusion temporaire").fill("  ")
  await timeout
    .getByRole("checkbox", { name: "Prévenir en message privé" })
    .uncheck()
  await timeout.getByRole("button", { name: "Exclure temporairement" }).click()

  await expect(main.getByRole("alert")).toHaveText("Saisis un motif.")
  await expect(main.getByRole("radio", { name: "28 jours" })).toBeChecked()
  await expect(main.getByLabel("Motif de l’exclusion temporaire")).toHaveValue(
    "  "
  )
  await expect(
    timeout.getByRole("checkbox", { name: "Prévenir en message privé" })
  ).not.toBeChecked()
  await expect(main).toContainText("Membre du serveur")
  await checkAccessibility()
})

test("a moderator kicks a member from their record with the direct message, and the record then says the account is absent, its history showing the kick", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")
  const kick = main.getByRole("region", { name: "Expulsion" })
  const entries = main
    .getByRole("region", { name: "Historique des sanctions" })
    .getByRole("listitem")

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto(`/records/${LYRA.id}`)
  await page.waitForLoadState()
  await kick.getByLabel("Motif de l’expulsion").fill("Spam répété")
  await expect(
    kick.getByRole("checkbox", { name: "Prévenir en message privé" })
  ).toBeChecked()
  await kick.getByRole("button", { name: "Expulser" }).click()

  await expect(main.getByRole("status")).toHaveText(
    "L’expulsion de Lyra des Brumes a eu lieu. Le message privé est parti."
  )
  await expect(main).toContainText("Compte absent du serveur")
  await expect(
    main.getByRole("heading", { name: "Sanctions", exact: true })
  ).toBeVisible()
  await expect(main.getByRole("button", { name: "Expulser" })).toHaveCount(0)
  await expect(entries).toHaveCount(1)
  await expect(entries.first()).toContainText("Expulsion")
  await expect(entries.first()).toContainText("par aldis, depuis le panel")
  await expect(entries.first()).toContainText("Motif : Spam répété")
  expect(discord.directMessagesTo(LYRA.id)).toEqual([
    expect.stringContaining("Motif : Spam répété"),
  ])
  expect(await discord.getMember(LYRA.id)).toBeNull()
  await checkAccessibility()
})

test("a staff member who bans bans a member from their record with the direct message, then lifts the ban, the record and its history following each", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
}) => {
  const main = page.getByRole("main")
  const ban = main.getByRole("region", { name: "Bannissement" })
  const entries = main
    .getByRole("region", { name: "Historique des sanctions" })
    .getByRole("listitem")

  await logIn(SIGRID)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto(`/records/${LYRA.id}`)
  await page.waitForLoadState()
  await expect(
    ban.getByRole("radio", { name: "Aucun", exact: true })
  ).toBeChecked()
  await checkAccessibility()

  await ban.getByRole("radio", { name: "Dernière heure" }).check()
  await ban.getByLabel("Motif du bannissement").fill("Menaces répétées")
  await expect(
    ban.getByRole("checkbox", { name: "Prévenir en message privé" })
  ).toBeChecked()
  await ban.getByRole("button", { name: "Bannir" }).click()

  await expect(main.getByRole("status")).toHaveText(
    "Le bannissement de Lyra des Brumes a eu lieu. Le message privé est parti."
  )
  await expect(main).toContainText("Compte banni")
  await expect(
    main.getByText("Menaces répétées", { exact: true })
  ).toBeVisible()
  await expect(main.getByText("sigrid", { exact: true })).toBeVisible()
  await expect(main.getByRole("button", { name: "Bannir" })).toHaveCount(0)
  await expect(entries).toHaveCount(1)
  await expect(entries.first()).toContainText("Bannissement")
  await expect(entries.first()).toContainText("par sigrid, depuis le panel")
  await expect(entries.first()).toContainText("Motif : Menaces répétées")
  expect(discord.directMessagesTo(LYRA.id)).toEqual([
    expect.stringContaining("Motif : Menaces répétées"),
  ])
  expect(discord.deletedMessageSecondsOf(LYRA.id)).toBe(3600)
  await checkAccessibility()

  await ban.getByLabel("Motif de la levée").fill("Erreur de cible")
  await ban.getByRole("button", { name: "Lever le bannissement" }).click()

  await expect(main.getByRole("status")).toHaveText(
    "Le bannissement de Lyra est levé."
  )
  await expect(main).toContainText("Compte absent du serveur")
  await expect(entries).toHaveCount(2)
  await expect(entries.first()).toContainText("Levée du bannissement")
  await expect(entries.first()).toContainText("Motif : Erreur de cible")
  await expect(ban.getByRole("button", { name: "Bannir" })).toBeVisible()
  await expect(ban.getByRole("checkbox")).toHaveCount(0)
  expect(await discord.getBan(LYRA.id)).toBeNull()
  await checkAccessibility()
})
