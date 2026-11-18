import {
  AuditLogEvent,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  ChannelType,
} from "discord-api-types/v10"

import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const GALLERY_ID = "1500000000000000001"

const NEWS_ID = "1500000000000000002"

const GAMES_ID = "1500000000000000003"

const TOURNAMENTS_ID = "1500000000000000004"

const VOICE_ID = "1500000000000000005"

const GUARD_ROLE_ID = "1300000000000000010"

const MODERATOR_ROLE_ID = "1300000000000000011"

const INTEGRATION_ROLE_ID = "1300000000000000012"

test.use({
  discordState: {
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
    roles: [
      { id: STAFF_ROLE_ID, name: "Staff", position: 5 },
      { id: GUARD_ROLE_ID, name: "Garde", position: 3 },
      { id: MODERATOR_ROLE_ID, name: "Modérateur", position: 4 },
      {
        id: INTEGRATION_ROLE_ID,
        name: "Intégration",
        position: 9,
        managed: true,
      },
    ],
    channels: [
      { id: GALLERY_ID, name: "galerie" },
      { id: NEWS_ID, name: "nouvelles", type: ChannelType.GuildAnnouncement },
      { id: GAMES_ID, name: "Jeux", type: ChannelType.GuildCategory },
      { id: TOURNAMENTS_ID, name: "tournois", parent_id: GAMES_ID },
      { id: VOICE_ID, name: "salon vocal", type: ChannelType.GuildVoice },
    ],
  },
})

function keywordRule(name: string) {
  return {
    name,
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { keyword_filter: ["mot"] },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
  }
}

test("a staff member opens « Liens » from the navigation, finds the rule that does not exist yet with its default settings, creates it with « Activer », cuts it with « Couper » and turns it on again, each write saying so in a toast and the audit log naming each", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
  readToast,
}) => {
  await logIn(ALDIS)
  await page.getByRole("link", { name: "Liens" }).click()
  await expect(page).toHaveURL("/blocked-links")
  await expect(page).toHaveTitle("Liens – Panel de Shor")
  await expect(page.getByRole("link", { name: "Liens" })).toHaveAttribute(
    "aria-current",
    "page"
  )
  await expect(
    page.getByRole("heading", { level: 1, name: "Liens" })
  ).toBeVisible()
  const switchCard = page.getByRole("region", { name: "Règle des liens" })
  await expect(switchCard).toContainText("Pas encore créée")
  await expect(switchCard).toContainText(
    "La règle des liens n’existe pas encore : aucun lien n’est bloqué. « Activer » la crée avec les réglages ci-dessous."
  )
  const domains = page.getByRole("region", { name: "Domaines permis" })
  await expect(domains).toContainText("8 domaines")
  await expect(domains.locator("li > span")).toHaveText([
    "cdn.discordapp.com",
    "giphy.com",
    "klipy.com",
    "media.discordapp.net",
    "tenor.com",
    "twitch.tv",
    "youtu.be",
    "youtube.com",
  ])
  await expect(
    page.getByRole("region", { name: "Rôles exemptés" }).locator("li > span")
  ).toHaveText(["Staff"])
  await expect(
    page.getByRole("region", { name: "Salons exemptés" })
  ).toContainText("Aucun salon exempté")
  await expect(page.getByRole("region", { name: "Action" })).toContainText(
    "Bloquer seulement"
  )
  expect(await discord.listAutoModerationRules()).toEqual([])
  await page.waitForLoadState()
  await checkAccessibility()

  await page.getByRole("button", { name: "Activer" }).click()

  await readToast("La règle des liens est créée et active.")
  await expect(switchCard).toContainText("Active")
  await expect(page.getByRole("button", { name: "Couper" })).toBeVisible()
  expect(await discord.listAutoModerationRules()).toMatchObject([
    {
      name: "Liens bloqués du panel",
      enabled: true,
      exempt_roles: [STAFF_ROLE_ID],
    },
  ])
  await checkAccessibility()

  await page.getByRole("button", { name: "Couper" }).click()

  await readToast("La règle des liens est coupée. Ses réglages sont gardés.")
  await expect(switchCard).toContainText("Coupée")
  await expect(domains.getByRole("listitem")).toHaveCount(8)
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { enabled: false },
  ])
  await checkAccessibility()

  await page.getByRole("button", { name: "Activer" }).click()

  await expect(switchCard).toContainText("Active")
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { enabled: true },
  ])
  const { audit_log_entries } = await discord.getAuditLog({})
  expect(
    audit_log_entries.map(({ action_type, reason }) => ({
      action_type,
      reason,
    }))
  ).toEqual([
    {
      action_type: AuditLogEvent.AutoModerationRuleUpdate,
      reason: "aldis (1400000000000000001) : activation de la règle des liens",
    },
    {
      action_type: AuditLogEvent.AutoModerationRuleUpdate,
      reason: "aldis (1400000000000000001) : coupure de la règle des liens",
    },
    {
      action_type: AuditLogEvent.AutoModerationRuleCreate,
      reason:
        "aldis (1400000000000000001) : création et activation de la règle des liens",
    },
  ])
})

test("the page shows the rule as it stands on the Discord server, its domains, exempt roles and channels, action and the other exceptions that it keeps", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
}) => {
  discord.createAutoModerationRuleAs(ALDIS.id, {
    name: "Liens bloqués du panel",
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: {
      regex_patterns: ["https?://[^\\s/?#]+"],
      allow_list: [
        "https://arte.tv",
        "https://arte.tv/*",
        "https://www.arte.tv",
        "https://www.arte.tv/*",
        "*youtube.com",
      ],
    },
    actions: [
      { type: AutoModerationActionType.BlockMessage },
      {
        type: AutoModerationActionType.Timeout,
        metadata: { duration_seconds: 86400 },
      },
    ],
    exempt_roles: [STAFF_ROLE_ID, "1300000000000000999"],
    exempt_channels: [GALLERY_ID],
    enabled: false,
  })

  await logIn(ALDIS)
  await page.goto("/blocked-links")
  await page.waitForLoadState()

  await expect(
    page.getByRole("region", { name: "Règle des liens" })
  ).toContainText("Coupée")
  await expect(
    page.getByRole("region", { name: "Domaines permis" }).locator("li > span")
  ).toHaveText(["arte.tv"])
  await expect(
    page.getByRole("region", { name: "Rôles exemptés" }).locator("li > span")
  ).toHaveText(["Staff", "Rôle supprimé"])
  await expect(
    page.getByRole("region", { name: "Salons exemptés" }).locator("li > span")
  ).toHaveText(["#galerie"])
  await expect(page.getByRole("region", { name: "Action" })).toContainText(
    "Exclusion 1 jour"
  )
  await expect(
    page
      .getByRole("region", { name: "Autres exceptions" })
      .getByRole("listitem")
  ).toHaveText(["*youtube.com"])
  await checkAccessibility()
})

test("with 6 keyword rules on the Discord server already, « Activer » says that the rule cannot be created, in the panel's own message, and creates nothing", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
}) => {
  for (let index = 1; index <= 6; index++) {
    discord.createAutoModerationRuleAs(ALDIS.id, keywordRule(`Règle ${index}`))
  }
  await logIn(ALDIS)
  await page.goto("/blocked-links")
  await page.waitForLoadState()

  await page.getByRole("button", { name: "Activer" }).click()

  await expect(
    page.getByRole("region", { name: "Règle des liens" }).getByRole("alert")
  ).toHaveText(
    "Le serveur Discord a déjà 6 règles AutoMod de mots-clés : le panel ne peut pas y créer la règle « Liens bloqués du panel ». Supprimes-en une dans Discord, puis réessaie."
  )
  await expect(page.getByRole("button", { name: "Activer" })).toBeEnabled()
  expect(await discord.listAutoModerationRules()).toHaveLength(6)
  await checkAccessibility()
})

test("once the rule exists, « Mots interdits » lists it with the other AutoMod rules and counts none of its words", async ({
  page,
  logIn,
  discord,
}) => {
  await logIn(ALDIS)
  await page.goto("/blocked-links")
  await page.waitForLoadState()
  await page.getByRole("button", { name: "Activer" }).click()
  await expect(page.getByRole("button", { name: "Couper" })).toBeVisible()
  expect(await discord.listAutoModerationRules()).toHaveLength(1)

  await page.goto("/blocked-words")

  await expect(
    page.getByRole("region", { name: "Autres règles AutoMod" })
  ).toContainText("Liens bloqués du panel")
  await expect(
    page.getByText("Aucun mot interdit pour l’instant.")
  ).toBeVisible()
})

test("a staff member adds an allowed domain typed in capitals, which the list shows in lower case, is refused a link, a duplicate and a missing rule in French with the domain as typed, then removes the domain, each write saying so in a toast and the audit log naming each", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
  readToast,
}) => {
  await logIn(ALDIS)
  await page.goto("/blocked-links")
  await page.waitForLoadState()
  const domains = page.getByRole("region", { name: "Domaines permis" })
  const field = domains.getByLabel("Ajouter un domaine")
  const add = domains.getByRole("button", { name: "Ajouter" })

  await field.fill("Arte.TV")
  await add.click()

  await expect(domains.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
    "La règle des liens n’existe pas encore : active-la d’abord, puis ajoute le domaine."
  )
  await expect(field).toHaveValue("Arte.TV")
  expect(await discord.listAutoModerationRules()).toEqual([])
  await checkAccessibility()

  await page.getByRole("button", { name: "Activer" }).click()
  await expect(page.getByRole("button", { name: "Couper" })).toBeVisible()
  await field.fill("Arte.TV")
  await add.click()

  await readToast("« arte.tv » est maintenant un domaine permis.")
  await expect(field).toHaveValue("")
  await expect(domains).toContainText("9 domaines")
  await expect(domains.locator("li > span")).toHaveText([
    "arte.tv",
    "cdn.discordapp.com",
    "giphy.com",
    "klipy.com",
    "media.discordapp.net",
    "tenor.com",
    "twitch.tv",
    "youtu.be",
    "youtube.com",
  ])
  expect(
    (await discord.listAutoModerationRules())[0]?.trigger_metadata.allow_list
  ).toEqual(
    expect.arrayContaining([
      "https://arte.tv",
      "https://arte.tv/*",
      "https://www.arte.tv",
      "https://www.arte.tv/*",
    ])
  )
  await checkAccessibility()

  await field.fill("https://arte.tv/direct")
  await add.click()

  await expect(domains.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
    "Saisis le domaine seul, sans schéma : « twitch.tv », pas « https://twitch.tv »."
  )
  await expect(field).toHaveValue("https://arte.tv/direct")
  await checkAccessibility()

  await field.fill("ARTE.tv")
  await add.click()

  await expect(domains.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
    "« arte.tv » est déjà un domaine permis."
  )
  await expect(field).toHaveValue("ARTE.tv")
  await expect(domains).toContainText("9 domaines")
  await checkAccessibility()

  await domains.getByRole("button", { name: "Retirer « arte.tv »" }).click()

  await readToast("« arte.tv » n’est plus un domaine permis.")
  await expect(domains).toContainText("8 domaines")
  await expect(domains.getByRole("button", { name: /arte\.tv/ })).toHaveCount(0)
  expect(
    (await discord.listAutoModerationRules())[0]?.trigger_metadata.allow_list
  ).toHaveLength(32)
  await checkAccessibility()
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "aldis (1400000000000000001) : retrait du domaine permis « arte.tv »",
    "aldis (1400000000000000001) : ajout du domaine permis « arte.tv »",
  ])
})

test("before the rule exists, the domains that « Activer » would start with show with no cross, and the rule created gives each its cross", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  await logIn(ALDIS)
  await page.goto("/blocked-links")
  await page.waitForLoadState()
  const domains = page.getByRole("region", { name: "Domaines permis" })
  const crosses = domains.getByRole("button", { name: /^Retirer/ })

  await expect(domains).toContainText("8 domaines")
  await expect(crosses).toHaveCount(0)
  await checkAccessibility()

  await page.getByRole("button", { name: "Activer" }).click()

  await expect(page.getByRole("button", { name: "Couper" })).toBeVisible()
  await expect(crosses).toHaveCount(8)
})

test("a staff member chooses a role among the Discord server's, is refused with the rule missing and with no role chosen, adds the role, which gets a cross where the staff role has none, then removes it, each write saying so in a toast and the audit log naming each", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
  readToast,
}) => {
  await logIn(ALDIS)
  await page.goto("/blocked-links")
  await page.waitForLoadState()
  const roles = page.getByRole("region", { name: "Rôles exemptés" })
  const choice = roles.getByLabel("Ajouter un rôle")
  const add = roles.getByRole("button", { name: "Ajouter" })
  const crosses = roles.getByRole("button", { name: /^Retirer/ })

  await expect(choice.locator("option")).toHaveText([
    "Choisir un rôle",
    "Modérateur",
    "Garde",
  ])
  await expect(roles.locator("li > span")).toHaveText(["Staff"])
  await expect(crosses).toHaveCount(0)
  await choice.selectOption({ label: "Modérateur" })
  await add.click()

  await expect(roles.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
    "La règle des liens n’existe pas encore : active-la d’abord, puis ajoute le rôle."
  )
  await expect(choice).toHaveValue(MODERATOR_ROLE_ID)
  expect(await discord.listAutoModerationRules()).toEqual([])
  await checkAccessibility()

  await page.getByRole("button", { name: "Activer" }).click()
  await expect(page.getByRole("button", { name: "Couper" })).toBeVisible()
  await choice.selectOption({ label: "Choisir un rôle" })
  await add.click()

  await expect(roles.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
    "Choisis le rôle à exempter."
  )
  await checkAccessibility()

  await choice.selectOption({ label: "Modérateur" })
  await add.click()

  await readToast("« Modérateur » est maintenant un rôle exempté.")
  await expect(roles.locator("li > span")).toHaveText(["Staff", "Modérateur"])
  await expect(choice.locator("option")).toHaveText([
    "Choisir un rôle",
    "Garde",
  ])
  await expect(choice).toHaveValue("")
  await expect(crosses).toHaveText(["Retirer « Modérateur »"])
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { exempt_roles: [STAFF_ROLE_ID, MODERATOR_ROLE_ID] },
  ])
  await checkAccessibility()

  await crosses.click()

  await readToast("« Modérateur » n’est plus un rôle exempté.")
  await expect(roles.locator("li > span")).toHaveText(["Staff"])
  await expect(crosses).toHaveCount(0)
  await expect(choice.locator("option")).toHaveText([
    "Choisir un rôle",
    "Modérateur",
    "Garde",
  ])
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { exempt_roles: [STAFF_ROLE_ID] },
  ])
  await checkAccessibility()
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "aldis (1400000000000000001) : retrait du rôle exempté « Modérateur »",
    "aldis (1400000000000000001) : ajout du rôle exempté « Modérateur »",
  ])
})

test("a staff member chooses a channel or a category among the Discord server's, is refused with the rule missing and with nothing chosen, adds a channel and a category, which get their cross, then removes them, each write saying so in a toast and the audit log naming each", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
  readToast,
  toast,
}) => {
  await logIn(ALDIS)
  await page.goto("/blocked-links")
  await page.waitForLoadState()
  const channels = page.getByRole("region", { name: "Salons exemptés" })
  const choice = channels.getByLabel("Ajouter un salon")
  const add = channels.getByRole("button", { name: "Ajouter" })
  const crosses = channels.getByRole("button", { name: /^Retirer/ })
  async function readThenClose(message: string) {
    await readToast(message)
    await checkAccessibility()
    await toast(message).getByRole("button", { name: "Fermer" }).click()
    await expect(toast(message)).toHaveCount(0)
  }

  await expect(choice.locator("option")).toHaveText([
    "Choisir un salon",
    "#channel",
    "#galerie",
    "#nouvelles",
    "Jeux (catégorie)",
    "#tournois",
  ])
  await expect(choice.locator("optgroup")).toHaveAttribute("label", "Jeux")
  await expect(channels.getByRole("listitem")).toHaveCount(0)
  await choice.selectOption({ label: "#galerie" })
  await add.click()

  await expect(
    channels.getByRole("alert").filter({ hasText: /\S/ })
  ).toHaveText(
    "La règle des liens n’existe pas encore : active-la d’abord, puis ajoute le salon."
  )
  await expect(choice).toHaveValue(GALLERY_ID)
  expect(await discord.listAutoModerationRules()).toEqual([])
  await checkAccessibility()

  await page.getByRole("button", { name: "Activer" }).click()
  await expect(page.getByRole("button", { name: "Couper" })).toBeVisible()
  await choice.selectOption({ label: "Choisir un salon" })
  await add.click()

  await expect(
    channels.getByRole("alert").filter({ hasText: /\S/ })
  ).toHaveText("Choisis le salon à exempter.")
  await checkAccessibility()

  await choice.selectOption({ label: "#galerie" })
  await add.click()

  await readThenClose("« #galerie » est maintenant un salon exempté.")
  await expect(channels.locator("li > span")).toHaveText(["#galerie"])
  await expect(choice.locator("option")).toHaveText([
    "Choisir un salon",
    "#channel",
    "#nouvelles",
    "Jeux (catégorie)",
    "#tournois",
  ])
  await expect(crosses).toHaveText(["Retirer « #galerie »"])

  await choice.selectOption({ label: "Jeux (catégorie)" })
  await add.click()

  await readThenClose("« Jeux (catégorie) » est maintenant un salon exempté.")
  await expect(channels.locator("li > span")).toHaveText([
    "#galerie",
    "Jeux (catégorie)",
  ])
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { exempt_channels: [GALLERY_ID, GAMES_ID] },
  ])

  await crosses.first().click()

  await readThenClose("« #galerie » n’est plus un salon exempté.")
  await expect(channels.locator("li > span")).toHaveText(["Jeux (catégorie)"])
  await crosses.click()

  await readThenClose("« Jeux (catégorie) » n’est plus un salon exempté.")
  await expect(crosses).toHaveCount(0)
  await expect(choice.locator("option")).toHaveText([
    "Choisir un salon",
    "#channel",
    "#galerie",
    "#nouvelles",
    "Jeux (catégorie)",
    "#tournois",
  ])
  expect(await discord.listAutoModerationRules()).toMatchObject([
    { exempt_channels: [] },
  ])
  await checkAccessibility()
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "aldis (1400000000000000001) : retrait du salon exempté « Jeux (catégorie) »",
    "aldis (1400000000000000001) : retrait du salon exempté « #galerie »",
    "aldis (1400000000000000001) : ajout du salon exempté « Jeux (catégorie) »",
    "aldis (1400000000000000001) : ajout du salon exempté « #galerie »",
  ])
})
