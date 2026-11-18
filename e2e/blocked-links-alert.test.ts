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

const ALERTS_ID = "1500000000000000009"

const JOURNAL_ID = "1500000000000000010"

const VOICE_ID = "1500000000000000020"

const BLOCK_NOTICE =
  "Message bloqué : ce lien n’est pas permis sur le serveur Discord de Shor."

test.use({
  discordState: {
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
    roles: [{ id: STAFF_ROLE_ID, name: "Staff" }],
    channels: [
      { id: ALERTS_ID, name: "alertes" },
      { id: JOURNAL_ID, name: "journal", type: ChannelType.GuildAnnouncement },
      { id: VOICE_ID, name: "vocal", type: ChannelType.GuildVoice },
    ],
  },
})

function ruleActing(
  actions: { type: AutoModerationActionType; metadata?: object }[]
) {
  return {
    name: "Liens bloqués du panel",
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { regex_patterns: ["https?://[^\\s/?#]+"] },
    actions,
    exempt_roles: [STAFF_ROLE_ID],
    enabled: true,
  }
}

test("a staff member is refused a choice of alert channel with the rule missing, then chooses a text channel, an announcement channel and none in turn, each write saying so in a toast, the rule's actions holding the alert only while a channel is chosen, and the audit log naming the channel", async ({
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
  const region = page.getByRole("region", { name: "Salon d’alerte" })
  const choice = region.getByLabel("Changer le salon d’alerte")
  const change = region.getByRole("button", { name: "Changer" })
  async function readThenClose(message: string) {
    await readToast(message)
    await checkAccessibility()
    await toast(message).getByRole("button", { name: "Fermer" }).click()
    await expect(toast(message)).toHaveCount(0)
  }

  await expect(region).toContainText(
    "Aucun salon d’alerte : les liens bloqués ne laissent pas de trace."
  )
  await expect(choice.locator("option")).toHaveText([
    "Aucun salon d’alerte",
    "#alertes",
    "#channel",
    "#journal",
  ])
  await choice.selectOption({ label: "#alertes" })
  await change.click()

  await expect(region.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
    "La règle des liens n’existe pas encore : active-la d’abord, puis change le salon d’alerte."
  )
  await expect(choice).toHaveValue(ALERTS_ID)
  expect(await discord.listAutoModerationRules()).toEqual([])
  await checkAccessibility()

  await page.getByRole("button", { name: "Activer" }).click()
  await expect(page.getByRole("button", { name: "Couper" })).toBeVisible()
  await choice.selectOption({ label: "#alertes" })
  await change.click()

  await readThenClose(
    "« #alertes » est maintenant le salon d’alerte de la règle des liens."
  )
  await expect(choice).toHaveValue(ALERTS_ID)
  await expect(region).toContainText(
    "AutoMod recopie chaque message bloqué dans « #alertes »."
  )
  expect((await discord.listAutoModerationRules())[0]?.actions).toEqual([
    {
      type: AutoModerationActionType.BlockMessage,
      metadata: { custom_message: BLOCK_NOTICE },
    },
    {
      type: AutoModerationActionType.SendAlertMessage,
      metadata: { channel_id: ALERTS_ID },
    },
  ])

  await choice.selectOption({ label: "#journal" })
  await change.click()

  await readThenClose(
    "« #journal » est maintenant le salon d’alerte de la règle des liens."
  )
  await expect(choice).toHaveValue(JOURNAL_ID)
  expect((await discord.listAutoModerationRules())[0]?.actions).toEqual([
    {
      type: AutoModerationActionType.BlockMessage,
      metadata: { custom_message: BLOCK_NOTICE },
    },
    {
      type: AutoModerationActionType.SendAlertMessage,
      metadata: { channel_id: JOURNAL_ID },
    },
  ])

  await choice.selectOption({ label: "Aucun salon d’alerte" })
  await change.click()

  await readThenClose("La règle des liens n’a plus de salon d’alerte.")
  await expect(choice).toHaveValue("")
  await expect(region).toContainText(
    "Aucun salon d’alerte : les liens bloqués ne laissent pas de trace."
  )
  expect((await discord.listAutoModerationRules())[0]?.actions).toEqual([
    {
      type: AutoModerationActionType.BlockMessage,
      metadata: { custom_message: BLOCK_NOTICE },
    },
  ])
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "aldis (1400000000000000001) : retrait du salon d’alerte « #journal »",
    "aldis (1400000000000000001) : choix du salon d’alerte « #journal »",
    "aldis (1400000000000000001) : choix du salon d’alerte « #alertes »",
  ])
})

test("an alert to a channel that the choice does not offer stays chosen, so that « Changer » removes nothing, and an alert that the panel cannot write back whole is shown as set in Discord, with no choice", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
}) => {
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    ruleActing([
      { type: AutoModerationActionType.BlockMessage },
      {
        type: AutoModerationActionType.SendAlertMessage,
        metadata: { channel_id: VOICE_ID },
      },
    ])
  )
  await logIn(ALDIS)
  await page.goto("/blocked-links")
  await page.waitForLoadState()
  const region = page.getByRole("region", { name: "Salon d’alerte" })
  const choice = region.getByLabel("Changer le salon d’alerte")

  await expect(choice).toHaveValue(VOICE_ID)
  await expect(region).toContainText(
    "AutoMod recopie chaque message bloqué dans « #vocal »."
  )
  await checkAccessibility()

  const [rule] = await discord.listAutoModerationRules()
  if (rule === undefined) {
    throw new Error("The link rule is missing")
  }
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule.id, {
    actions: [
      ...rule.actions,
      {
        type: AutoModerationActionType.SendAlertMessage,
        metadata: { channel_id: ALERTS_ID },
      },
    ],
  })
  await page.reload()
  await page.waitForLoadState()

  await expect(region).toContainText("Réglé dans Discord")
  await expect(region).toContainText(
    "Le salon d’alerte est réglé d’une façon que le panel ne sait pas écrire : il se change dans Discord."
  )
  await expect(region.getByRole("combobox")).toHaveCount(0)
  await expect(region.getByRole("button")).toHaveCount(0)
  await checkAccessibility()
})
