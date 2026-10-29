import {
  BAN_ROLE_ID,
  MODERATION_ROLE_ID,
  STAFF_ROLE_ID,
} from "../playwright.config"
import { expect, test, type Page } from "./fixtures"

type Locator = ReturnType<Page["locator"]>

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

function sanctionsOf(page: Page) {
  return page
    .getByRole("main")
    .getByRole("region", { name: "Sanctions", exact: true })
}

async function expectRed(page: Page, button: Locator) {
  const [red, onRed] = await page.evaluate(() => {
    const probe = document.createElement("div")
    probe.style.backgroundColor = "var(--destructive)"
    probe.style.color = "var(--destructive-foreground)"
    document.body.append(probe)
    const { backgroundColor, color } = getComputedStyle(probe)
    probe.remove()
    return [backgroundColor, color]
  })
  await expect(button).toHaveCSS("background-color", red)
  await expect(button).toHaveCSS("color", onRed)
}

test("a moderator finds a member, opens their record, times them out for the hour chosen by default with the direct message, then lifts the timeout from its notice, each saying so in a toast and showing in the record's history", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
  readToast,
}) => {
  const main = page.getByRole("main")
  const sanctions = sanctionsOf(page)
  const timeout = sanctions.getByRole("tabpanel", {
    name: "Exclusion temporaire",
  })
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
  await expect(main).toContainText("Membre du serveur")
  await expect(sanctions.getByRole("tab")).toHaveText([
    "Exclusion temporaire",
    "Expulsion",
  ])
  await expect(
    sanctions.getByRole("tab", { name: "Exclusion temporaire" })
  ).toHaveAttribute("aria-selected", "true")
  await expect(timeout).not.toContainText("Exclusion temporaire en cours")
  await expect(history).toContainText(
    "Aucune sanction ni levée dans l’historique."
  )
  await checkAccessibility()

  await expect(timeout.getByRole("radio", { name: "1 heure" })).toBeChecked()
  await timeout
    .getByLabel("Motif de l’exclusion temporaire")
    .fill("Insultes répétées")
  await expect(
    timeout.getByRole("checkbox", { name: "Prévenir en message privé" })
  ).toBeChecked()
  await timeout.getByRole("button", { name: "Exclure temporairement" }).click()
  await readToast(
    /^Lyra des Brumes est en exclusion temporaire jusqu’au .+\. Le message privé est parti\.$/
  )
  await expect(main).toContainText("Exclu jusqu’au")
  await expect(timeout).toContainText(
    /^Exclusion temporaire en coursJusqu’au \d{1,2} \S+ \d{4}, \d{2}:\d{2}/
  )
  await expect(
    timeout.getByLabel("Motif de l’exclusion temporaire")
  ).toHaveValue("")
  await expect(timeout.getByRole("radio", { name: "1 heure" })).toBeChecked()
  expect(discord.directMessagesTo(LYRA.id)).toEqual([
    expect.stringContaining("Motif : Insultes répétées"),
  ])
  await expect(entries).toHaveCount(1)
  await expect(entries.first()).toContainText("Exclusion temporaire jusqu’au")
  await expect(entries.first()).toContainText("par aldis, depuis le panel")
  await expect(entries.first()).toContainText("Motif : Insultes répétées")
  await checkAccessibility()

  await timeout.getByLabel("Motif de la levée").fill("Erreur de cible")
  await timeout
    .getByRole("button", { name: "Lever l’exclusion temporaire" })
    .click()
  await readToast("L’exclusion temporaire de Lyra des Brumes est levée.")
  await expect(main).toContainText("Membre du serveur")
  await expect(timeout).not.toContainText("Exclusion temporaire en cours")
  await expect(
    main.getByRole("button", { name: "Lever l’exclusion temporaire" })
  ).toHaveCount(0)
  await expect(entries).toHaveCount(2)
  await expect(entries.first()).toContainText("Levée de l’exclusion temporaire")
  await expect(entries.first()).toContainText("Motif : Erreur de cible")
  await checkAccessibility()
})

test("a refused timeout stays in its form, with its message, and makes no toast", async ({
  page,
  logIn,
  checkAccessibility,
  toast,
  readToast,
}) => {
  const main = page.getByRole("main")
  const timeout = sanctionsOf(page).getByRole("tabpanel", {
    name: "Exclusion temporaire",
  })

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
  await expect(timeout.getByRole("radio", { name: "28 jours" })).toBeChecked()
  await expect(
    timeout.getByRole("radio", { name: "1 heure" })
  ).not.toBeChecked()
  await expect(
    timeout.getByLabel("Motif de l’exclusion temporaire")
  ).toHaveValue("  ")
  await expect(
    timeout.getByRole("checkbox", { name: "Prévenir en message privé" })
  ).not.toBeChecked()
  await expect(main).toContainText("Membre du serveur")
  await checkAccessibility()

  await timeout
    .getByLabel("Motif de l’exclusion temporaire")
    .fill("Insultes répétées")
  await timeout.getByRole("button", { name: "Exclure temporairement" }).click()
  await readToast(
    /^Lyra des Brumes est en exclusion temporaire jusqu’au .+\d{2}:\d{2}\.$/
  )
  await expect(toast()).toHaveCount(1)
  await checkAccessibility()
})

test("a moderator kicks a member from the kick's tab with the direct message, through a red button, which a toast confirms, and the record then says the account is absent, with no « Sanctions », its history showing the kick", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
  readToast,
}) => {
  const main = page.getByRole("main")
  const sanctions = sanctionsOf(page)
  const kick = sanctions.getByRole("tabpanel", { name: "Expulsion" })
  const entries = main
    .getByRole("region", { name: "Historique des sanctions" })
    .getByRole("listitem")

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto(`/records/${LYRA.id}`)
  await page.waitForLoadState()
  await sanctions.getByRole("tab", { name: "Expulsion" }).click()
  await expect(
    sanctions.getByRole("tab", { name: "Expulsion" })
  ).toHaveAttribute("aria-selected", "true")
  await expect(
    sanctions.getByRole("tabpanel", { name: "Exclusion temporaire" })
  ).toHaveCount(0)
  await expect(kick).toContainText(
    "Le compte quitte le serveur Discord et peut le rejoindre à nouveau par une invitation."
  )
  await expectRed(page, kick.getByRole("button", { name: "Expulser" }))
  await checkAccessibility()

  await kick.getByLabel("Motif de l’expulsion").fill("Spam répété")
  await expect(
    kick.getByRole("checkbox", { name: "Prévenir en message privé" })
  ).toBeChecked()
  await kick.getByRole("button", { name: "Expulser" }).click()

  await readToast(
    "L’expulsion de Lyra des Brumes a eu lieu. Le message privé est parti."
  )
  await expect(main).toContainText("Absent du serveur")
  await expect(
    main.getByRole("heading", { name: "Sanctions", exact: true })
  ).toHaveCount(0)
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

test("a staff member who bans bans a member from the ban's tab with the direct message, through a red button, then lifts the ban from the notice that says the account is banned, each saying so in a toast, the record and its history following each", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
  readToast,
}) => {
  const main = page.getByRole("main")
  const sanctions = sanctionsOf(page)
  const ban = sanctions.getByRole("tabpanel", { name: "Bannissement" })
  const entries = main
    .getByRole("region", { name: "Historique des sanctions" })
    .getByRole("listitem")

  await logIn(SIGRID)
  await expect(page).toHaveURL("/blocked-words")
  await page.goto(`/records/${LYRA.id}`)
  await page.waitForLoadState()
  await expect(sanctions.getByRole("tab")).toHaveText([
    "Exclusion temporaire",
    "Expulsion",
    "Bannissement",
  ])
  await sanctions.getByRole("tab", { name: "Bannissement" }).click()
  await expect(ban).toContainText(
    "Le compte quitte le serveur Discord et ne peut plus le rejoindre tant que le bannissement n’est pas levé."
  )
  await expect(
    ban.getByRole("radio", { name: "Aucun", exact: true })
  ).toBeChecked()
  await expectRed(page, ban.getByRole("button", { name: "Bannir" }))
  await checkAccessibility()

  await ban.getByRole("radio", { name: "Dernière heure" }).check()
  await ban.getByLabel("Motif du bannissement").fill("Menaces répétées")
  await expect(
    ban.getByRole("checkbox", { name: "Prévenir en message privé" })
  ).toBeChecked()
  await ban.getByRole("button", { name: "Bannir" }).click()

  await readToast(
    "Le bannissement de Lyra des Brumes a eu lieu. Le message privé est parti."
  )
  await expect(main).toContainText("Compte banni")
  await expect(sanctions.getByRole("tablist")).toHaveCount(0)
  await expect(sanctions).toContainText(
    "Compte banniUn bannissement n’a pas de fin : seul le staff peut le lever."
  )
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

  await sanctions.getByLabel("Motif de la levée").fill("Erreur de cible")
  await sanctions.getByRole("button", { name: "Lever le bannissement" }).click()

  await readToast("Le bannissement de Lyra est levé.")
  await expect(main).toContainText("Absent du serveur")
  await expect(entries).toHaveCount(2)
  await expect(entries.first()).toContainText("Levée du bannissement")
  await expect(entries.first()).toContainText("Motif : Erreur de cible")
  await expect(sanctions.getByRole("tablist")).toHaveCount(0)
  await expect(sanctions).toContainText(
    "Ce compte n’est pas membre du serveur Discord : seul un bannissement reste possible, pour l’empêcher d’y revenir."
  )
  await expectRed(page, sanctions.getByRole("button", { name: "Bannir" }))
  await expect(sanctions.getByRole("checkbox")).toHaveCount(0)
  expect(await discord.getBan(LYRA.id)).toBeNull()
  await checkAccessibility()
})
