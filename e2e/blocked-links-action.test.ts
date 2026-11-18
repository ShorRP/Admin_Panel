import {
  AuditLogEvent,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"

import { MODERATION_ROLE_ID, STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYN = { id: "1400000000000000002", username: "bryn" }

const ALERT_CHANNEL_ID = "1500000000000000009"

const BLOCK_NOTICE =
  "Message bloqué : ce lien n’est pas permis sur le serveur Discord de Shor."

test.use({
  discordState: {
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID] },
      { user: BRYN, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] },
    ],
    roles: [{ id: STAFF_ROLE_ID, name: "Staff" }],
  },
})

function ruleActing(actions: { type: AutoModerationActionType }[]) {
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

test("a moderator is refused a change of action with the rule missing, then chooses « Exclusion 1 heure », « Exclusion 1 jour » and « Bloquer seulement » in turn, each write saying so in a toast, the rule holding each notice and duration, an alert to a channel kept, and the audit log naming the old and the new action", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
  readToast,
  toast,
}) => {
  await logIn(BRYN)
  await page.goto("/blocked-links")
  await page.waitForLoadState()
  const action = page.getByRole("region", { name: "Action" })
  const choice = action.getByLabel("Changer l’action")
  const change = action.getByRole("button", { name: "Changer" })
  async function readThenClose(message: string) {
    await readToast(message)
    await checkAccessibility()
    await toast(message).getByRole("button", { name: "Fermer" }).click()
    await expect(toast(message)).toHaveCount(0)
  }

  await expect(choice.locator("option")).toHaveText([
    "Bloquer seulement",
    "Exclusion 1 heure",
    "Exclusion 1 jour",
  ])
  await expect(choice).toHaveValue("block")
  await choice.selectOption({ label: "Exclusion 1 heure" })
  await change.click()

  await expect(action.getByRole("alert").filter({ hasText: /\S/ })).toHaveText(
    "La règle des liens n’existe pas encore : active-la d’abord, puis change l’action."
  )
  await expect(choice).toHaveValue("timeout-1h")
  expect(await discord.listAutoModerationRules()).toEqual([])
  await checkAccessibility()

  await page.getByRole("button", { name: "Activer" }).click()
  await expect(page.getByRole("button", { name: "Couper" })).toBeVisible()
  const [rule] = await discord.listAutoModerationRules()
  if (rule === undefined) {
    throw new Error("The link rule was not created")
  }
  discord.modifyAutoModerationRuleAs(BRYN.id, rule.id, {
    actions: [
      ...rule.actions,
      {
        type: AutoModerationActionType.SendAlertMessage,
        metadata: { channel_id: ALERT_CHANNEL_ID },
      },
    ],
  })
  await page.reload()
  await page.waitForLoadState()
  await choice.selectOption({ label: "Exclusion 1 heure" })
  await change.click()

  await readThenClose("La règle des liens passe à « Exclusion 1 heure ».")
  await expect(choice).toHaveValue("timeout-1h")
  expect((await discord.listAutoModerationRules())[0]?.actions).toEqual([
    {
      type: AutoModerationActionType.BlockMessage,
      metadata: {
        custom_message: `${BLOCK_NOTICE} Tu reçois une exclusion temporaire d’une heure.`,
      },
    },
    {
      type: AutoModerationActionType.Timeout,
      metadata: { duration_seconds: 3600 },
    },
    {
      type: AutoModerationActionType.SendAlertMessage,
      metadata: { channel_id: ALERT_CHANNEL_ID },
    },
  ])

  await choice.selectOption({ label: "Exclusion 1 jour" })
  await change.click()

  await readThenClose("La règle des liens passe à « Exclusion 1 jour ».")
  await expect(choice).toHaveValue("timeout-1d")
  expect((await discord.listAutoModerationRules())[0]?.actions).toEqual([
    {
      type: AutoModerationActionType.BlockMessage,
      metadata: {
        custom_message: `${BLOCK_NOTICE} Tu reçois une exclusion temporaire d’un jour.`,
      },
    },
    {
      type: AutoModerationActionType.Timeout,
      metadata: { duration_seconds: 86400 },
    },
    {
      type: AutoModerationActionType.SendAlertMessage,
      metadata: { channel_id: ALERT_CHANNEL_ID },
    },
  ])

  await choice.selectOption({ label: "Bloquer seulement" })
  await change.click()

  await readThenClose("La règle des liens passe à « Bloquer seulement ».")
  await expect(choice).toHaveValue("block")
  expect((await discord.listAutoModerationRules())[0]?.actions).toEqual([
    {
      type: AutoModerationActionType.BlockMessage,
      metadata: { custom_message: BLOCK_NOTICE },
    },
    {
      type: AutoModerationActionType.SendAlertMessage,
      metadata: { channel_id: ALERT_CHANNEL_ID },
    },
  ])
  const { audit_log_entries } = await discord.getAuditLog({
    action_type: AuditLogEvent.AutoModerationRuleUpdate,
  })
  expect(audit_log_entries.map(({ reason }) => reason)).toEqual([
    "bryn (1400000000000000002) : changement de l’action de la règle des liens, de « Exclusion 1 jour » à « Bloquer seulement »",
    "bryn (1400000000000000002) : changement de l’action de la règle des liens, de « Exclusion 1 heure » à « Exclusion 1 jour »",
    "bryn (1400000000000000002) : changement de l’action de la règle des liens, de « Bloquer seulement » à « Exclusion 1 heure »",
  ])
})

test("a staff member who holds no moderation role sees the action with no choice, whether the rule blocks or times out, and the sentence says that an exclusion asks for a moderation role", async ({
  page,
  logIn,
  discord,
  checkAccessibility,
}) => {
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    ruleActing([{ type: AutoModerationActionType.BlockMessage }])
  )
  await logIn(ALDIS)
  await page.goto("/blocked-links")
  await page.waitForLoadState()
  const action = page.getByRole("region", { name: "Action" })

  await expect(action).toContainText("Bloquer seulement")
  await expect(action).toContainText(
    "Choisir ou quitter une exclusion demande un rôle de modération."
  )
  await expect(action.getByRole("combobox")).toHaveCount(0)
  await expect(action.getByRole("button")).toHaveCount(0)
  await checkAccessibility()

  const [rule] = await discord.listAutoModerationRules()
  if (rule === undefined) {
    throw new Error("The link rule is missing")
  }
  discord.modifyAutoModerationRuleAs(ALDIS.id, rule.id, {
    actions: [
      { type: AutoModerationActionType.BlockMessage },
      {
        type: AutoModerationActionType.Timeout,
        metadata: { duration_seconds: 3600 },
      },
    ],
  })
  await page.reload()
  await page.waitForLoadState()

  await expect(action).toContainText("Exclusion 1 heure")
  await expect(action.getByRole("combobox")).toHaveCount(0)
  await expect(action.getByRole("button")).toHaveCount(0)
  await checkAccessibility()
})
