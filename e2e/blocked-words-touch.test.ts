import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  type RESTPostAPIAutoModerationRuleJSONBody,
} from "discord-api-types/v10"

import { blockedWordAction } from "@/blocked-words/blocked-word-action"
import { newPanelRule } from "@/blocked-words/panel-rule"
import { MODERATION_ROLE_ID, STAFF_ROLE_ID } from "../playwright.config"
import { expect, test, type Locator, type Page } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const SCREENS = [
  { width: 360, height: 780, touchScreen: false },
  { width: 639, height: 780, touchScreen: false },
  { width: 640, height: 780, touchScreen: false },
  { width: 768, height: 1024, touchScreen: false },
  { width: 1024, height: 768, touchScreen: true },
] as const

const DESKTOP = { width: 1280, height: 800, touchScreen: false } as const

const MIN_TARGET_PX = 44

const TILE_PX = 48

const TILE_BORDER_PX = 1

const DESKTOP_ICON_BUTTON_PX = 28

const DESKTOP_CONTROL_PX = 38

const SHORT_RULE = "Liens"

const LONG_RULE =
  "Liens suspects avec un nom assez long pour passer à la ligne sur un écran étroit"

const NO_KEYWORD_RULE = "Spam de mentions"

function otherRule(
  name: string,
  triggerType: AutoModerationRuleTriggerType,
  triggerMetadata: RESTPostAPIAutoModerationRuleJSONBody["trigger_metadata"]
): RESTPostAPIAutoModerationRuleJSONBody {
  return {
    name,
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: triggerType,
    trigger_metadata: triggerMetadata,
    actions: [{ type: AutoModerationActionType.BlockMessage }],
    enabled: true,
  }
}

test.use({
  discordState: {
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] }],
  },
})

test.beforeEach(({ discord }) => {
  for (const rule of [
    newPanelRule(blockedWordAction("block"), STAFF_ROLE_ID, [
      "foo",
      "free nitro",
      "a".repeat(60),
    ]),
    otherRule(SHORT_RULE, AutoModerationRuleTriggerType.Keyword, {
      keyword_filter: ["bit.ly/"],
    }),
    otherRule(LONG_RULE, AutoModerationRuleTriggerType.Keyword, {
      keyword_filter: ["discord.gg/", "gift.steam"],
    }),
    otherRule(NO_KEYWORD_RULE, AutoModerationRuleTriggerType.MentionSpam, {
      mention_total_limit: 5,
    }),
  ]) {
    discord.createAutoModerationRuleAs(ALDIS.id, rule)
  }
})

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("The element is not visible.")
  }
  return box
}

async function sizeOf(locator: Locator) {
  const { width, height } = await boxOf(locator)
  return { width: Math.round(width), height: Math.round(height) }
}

function list(page: Page) {
  return page.getByRole("region", { name: "La liste" })
}

for (const screen of [...SCREENS, DESKTOP]) {
  test.describe(`at ${screen.width} px`, () => {
    test.use({
      viewport: { width: screen.width, height: screen.height },
      hasTouch: screen.touchScreen,
      isMobile: screen.touchScreen,
    })

    const touch = screen !== DESKTOP

    test("« Action » and « Ajouter » stack at the form's full width under 640 px and share a row from there, the capacity gauge going under the sentence and filling the column under 640 px", async ({
      page,
      logIn,
      checkAccessibility,
    }) => {
      const field = page.getByLabel("Ajouter un mot ou une expression")
      const action = page.getByLabel("Action", { exact: true })
      const add = page.getByRole("button", { name: "Ajouter" })

      await logIn(ALDIS)
      await page.goto("/blocked-words")
      await expect(add).toBeVisible()
      await expect(list(page)).toBeVisible()

      const [fieldBox, actionBox, addBox, sentenceBox, gaugeBox, listBox] =
        await Promise.all(
          [
            field,
            action,
            add,
            page.getByText(/^Les messages qui contiennent/),
            page.getByRole("group", { name: "Capacité" }),
            list(page),
          ].map(boxOf)
        )
      expect(Math.round(fieldBox.height)).toBe(
        touch ? MIN_TARGET_PX : DESKTOP_CONTROL_PX
      )
      expect(Math.round(actionBox.height)).toBe(
        touch ? MIN_TARGET_PX : DESKTOP_CONTROL_PX
      )
      expect(Math.round(addBox.height)).toBe(
        touch ? MIN_TARGET_PX : DESKTOP_CONTROL_PX
      )
      if (screen.width < 640) {
        expect([actionBox.x, actionBox.width]).toEqual([
          fieldBox.x,
          fieldBox.width,
        ])
        expect([addBox.x, addBox.width]).toEqual([fieldBox.x, fieldBox.width])
        expect(addBox.y).toBeGreaterThanOrEqual(actionBox.y + actionBox.height)
        expect([gaugeBox.x, gaugeBox.width]).toEqual([listBox.x, listBox.width])
      } else {
        expect(actionBox.width).toBeLessThan(fieldBox.width)
        expect(addBox.x).toBeGreaterThanOrEqual(actionBox.x + actionBox.width)
        expect(
          Math.round(addBox.y + addBox.height - actionBox.y - actionBox.height)
        ).toBe(0)
      }
      if (touch) {
        expect(gaugeBox.y).toBeGreaterThanOrEqual(
          sentenceBox.y + sentenceBox.height
        )
      } else {
        expect(gaugeBox.x).toBeGreaterThanOrEqual(
          sentenceBox.x + sentenceBox.width
        )
      }
      await checkAccessibility()
    })

    test("a tile keeps its 48 px, its pencil and its cross measuring 44 px at the finger and 28 px with a mouse, and the rows of the other AutoMod rules and their summaries reach 44 px at the finger and keep their density with a mouse", async ({
      page,
      logIn,
    }) => {
      const others = page.getByRole("region", { name: "Autres règles AutoMod" })
      const rows = others.getByRole("listitem")

      await logIn(ALDIS)
      await page.goto("/blocked-words")
      await expect(list(page).getByRole("listitem")).toHaveCount(3)
      await expect(rows.first()).toBeVisible()

      const side = touch ? MIN_TARGET_PX : DESKTOP_ICON_BUTTON_PX
      for (const tile of await list(page).getByRole("listitem").all()) {
        const pencil = tile.getByRole("button", { name: /^Changer l’action/ })
        const cross = tile.getByRole("button", { name: /^Retirer/ })
        expect(await sizeOf(pencil)).toEqual({ width: side, height: side })
        expect(await sizeOf(cross)).toEqual({ width: side, height: side })
        expect((await sizeOf(tile)).height).toBe(TILE_PX)
        const [tileBox, crossBox] = await Promise.all([
          boxOf(tile),
          boxOf(cross),
        ])
        expect(
          Math.round(tileBox.x + tileBox.width - crossBox.x - crossBox.width)
        ).toBe(touch ? TILE_BORDER_PX + 2 : TILE_BORDER_PX + 4)
        expect(crossBox.y).toBeGreaterThanOrEqual(tileBox.y)
        expect(crossBox.y + crossBox.height).toBeLessThanOrEqual(
          tileBox.y + tileBox.height
        )
      }

      const short = rows.filter({
        has: page.getByText(SHORT_RULE, { exact: true }),
      })
      const long = rows.filter({
        has: page.getByText(LONG_RULE, { exact: true }),
      })
      const none = rows.filter({
        has: page.getByText(NO_KEYWORD_RULE, { exact: true }),
      })
      const measured = touch ? [short, long, none] : [short, none]
      for (const row of measured) {
        expect((await sizeOf(row)).height >= MIN_TARGET_PX).toBe(touch)
      }
      for (const summary of (touch ? [short, long] : [short]).map((row) =>
        row.locator("summary")
      )) {
        expect((await sizeOf(summary)).height >= MIN_TARGET_PX).toBe(touch)
      }
    })

    test("while Discord answers late, the skeletons of the form, of the capacity gauge and of the filter take the room of what replaces them", async ({
      page,
      logIn,
      holdDiscord,
    }) => {
      await logIn(ALDIS)
      await page.waitForLoadState()

      const release = holdDiscord()
      await page.goto("/blocked-words", { waitUntil: "commit" })
      const formSkeleton = page
        .getByRole("status")
        .filter({ hasText: "Chargement du formulaire…" })
      const listSkeleton = page
        .getByRole("status")
        .filter({ hasText: "Chargement des mots interdits…" })
      const gaugeSkeleton = page.locator(
        'main div[aria-hidden="true"]:has(> [data-slot="skeleton"])'
      )
      await expect(formSkeleton).toBeVisible()
      await expect(listSkeleton).toBeVisible()
      await expect(gaugeSkeleton).toBeVisible()
      const skeletons = {
        form: await sizeOf(formSkeleton),
        gauge: await sizeOf(gaugeSkeleton),
        filter: await sizeOf(
          listSkeleton.locator("[data-slot=skeleton]").nth(2)
        ),
      }

      release()
      await expect(list(page)).toBeVisible()
      await expect(page.getByRole("group", { name: "Capacité" })).toBeVisible()
      await expect(
        page.getByLabel("Ajouter un mot ou une expression")
      ).toBeVisible()
      const form = page
        .locator("form")
        .filter({ has: page.getByLabel("Ajouter un mot ou une expression") })
      expect({
        form: await sizeOf(form),
        gauge: await sizeOf(page.getByRole("group", { name: "Capacité" })),
        filter: await sizeOf(
          page
            .locator("form")
            .filter({ has: page.getByLabel("Filtrer la liste") })
        ),
      }).toEqual(skeletons)
    })
  })
}
