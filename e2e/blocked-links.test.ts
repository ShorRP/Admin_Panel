import {
  AuditLogEvent,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"

import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const GALLERY_ID = "1500000000000000001"

test.use({
  discordState: {
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
    roles: [{ id: STAFF_ROLE_ID, name: "Staff" }],
    channels: [{ id: GALLERY_ID, name: "galerie" }],
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
  await expect(domains.getByRole("listitem")).toHaveText([
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
    page.getByRole("region", { name: "Rôles exemptés" }).getByRole("listitem")
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
    page.getByRole("region", { name: "Domaines permis" }).getByRole("listitem")
  ).toHaveText(["arte.tv"])
  await expect(
    page.getByRole("region", { name: "Rôles exemptés" }).getByRole("listitem")
  ).toHaveText(["Staff", "Rôle supprimé"])
  await expect(
    page.getByRole("region", { name: "Salons exemptés" }).getByRole("listitem")
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
