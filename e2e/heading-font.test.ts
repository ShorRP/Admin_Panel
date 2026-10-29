import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"

import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

test.use({
  discordState: {
    members: [
      { user: ALDIS, roles: [STAFF_ROLE_ID] },
      { user: BRYNJA, roles: [] },
    ],
    autoModerationRules: [
      {
        id: "1500000000000000001",
        guild_id: "1100000000000000000",
        name: "Liens d’invitation",
        creator_id: ALDIS.id,
        event_type: AutoModerationRuleEventType.MessageSend,
        trigger_type: AutoModerationRuleTriggerType.Keyword,
        trigger_metadata: { keyword_filter: ["discord.gg"] },
        actions: [{ type: AutoModerationActionType.BlockMessage }],
        enabled: true,
        exempt_roles: [],
        exempt_channels: [],
      },
    ],
  },
})

test("every page's h1 and h2, and the sidebar's « Shor », take EB Garamond, whose one face the panel serves: weight 500, latin subset", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  function headingFonts() {
    return page
      .locator("h1, h2")
      .or(
        page
          .getByRole("complementary")
          .getByRole("link", { name: "Shor Panel du staff" })
          .getByText("Shor", { exact: true })
      )
      .filter({ visible: true })
      .evaluateAll((elements) =>
        elements.map((element) => ({
          text: element.textContent.trim(),
          font: getComputedStyle(element)
            .fontFamily.split(",")[0]
            ?.replaceAll('"', ""),
        }))
      )
  }
  function loadedFonts() {
    return page.evaluate(async () => {
      await document.fonts.ready
      return {
        faces: [...document.fonts].map(({ family, weight, style, status }) => ({
          family: family.replaceAll('"', ""),
          weight,
          style,
          status,
        })),
        files: performance
          .getEntriesByType("resource")
          .map(({ name }) => new URL(name))
          .filter(({ pathname }) => /\.woff2?$/.test(pathname))
          .map(({ origin, pathname }) => ({
            fromPanel: origin === location.origin,
            name: pathname.split("/").at(-1)?.split(".")[0],
          })),
      }
    })
  }
  async function expectHeadingsInEbGaramond(texts: string[]) {
    await expect
      .poll(headingFonts)
      .toEqual(texts.map((text) => ({ text, font: "EB Garamond" })))
    await expect.poll(loadedFonts).toEqual({
      faces: [
        {
          family: "EB Garamond",
          weight: "500",
          style: "normal",
          status: "loaded",
        },
      ],
      files: [{ fromPanel: true, name: "eb-garamond-latin-500-normal" }],
    })
  }

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await expectHeadingsInEbGaramond(["Shor", "Mots interdits", "La liste"])
  await checkAccessibility()

  await page
    .getByRole("complementary")
    .getByRole("link", { name: "Journal d’audit" })
    .click()
  await expect(page).toHaveURL("/audit-log")
  await expectHeadingsInEbGaramond(["Shor", "Journal d’audit"])
  await checkAccessibility()

  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Se déconnecter" })
    .click()
  await expect(page).toHaveURL("/login/logged-out")
  await expectHeadingsInEbGaramond(["Déconnexion"])
  await checkAccessibility()

  await logIn(BRYNJA)
  await expect(page).toHaveURL("/login/refused")
  await expectHeadingsInEbGaramond(["Accès refusé"])
  await checkAccessibility()

  await page.goto("/login/failed")
  await expectHeadingsInEbGaramond(["Connexion échouée"])
  await checkAccessibility()
})
