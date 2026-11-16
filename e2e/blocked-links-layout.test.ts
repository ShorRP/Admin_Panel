import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"

import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test, type Locator } from "./fixtures"
import { settle } from "./settle"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const GALLERY_ID = "1500000000000000001"

const SCREENS = [
  { width: 360, height: 780, touchScreen: false, columns: 1 },
  { width: 768, height: 1024, touchScreen: false, columns: 1 },
  { width: 1024, height: 768, touchScreen: true, columns: 2 },
] as const

const DESKTOP = {
  width: 1280,
  height: 800,
  touchScreen: false,
  columns: 2,
} as const

const MIN_TARGET_PX = 44

const DESKTOP_CONTROL_PX = 38

const RAIL_PX = 64

const SIDEBAR_PX = 252

const MAIN_REGIONS = ["Règle des liens", "Domaines permis"]

const SIDE_REGIONS = [
  "Rôles exemptés",
  "Salons exemptés",
  "Action",
  "Autres exceptions",
]

test.use({
  discordState: {
    members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
    roles: [{ id: STAFF_ROLE_ID, name: "Staff" }],
    channels: [{ id: GALLERY_ID, name: "galerie" }],
  },
})

test.beforeEach(({ discord }) => {
  discord.createAutoModerationRuleAs(ALDIS.id, {
    name: "Liens bloqués du panel",
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: {
      regex_patterns: ["https?://[^\\s/?#]+"],
      allow_list: [
        "https://youtube.com",
        "https://youtube.com/*",
        "https://www.youtube.com",
        "https://www.youtube.com/*",
        "*arnaque.example/a-very-long-entry-that-does-not-follow-the-model-of-the-panel",
      ],
    },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
    exempt_roles: [STAFF_ROLE_ID],
    exempt_channels: [GALLERY_ID],
    enabled: true,
  })
})

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("The element is not visible.")
  }
  return box
}

for (const screen of [...SCREENS, DESKTOP]) {
  test.describe(`at ${screen.width} px`, () => {
    test.use({
      viewport: { width: screen.width, height: screen.height },
      hasTouch: screen.touchScreen,
      isMobile: screen.touchScreen,
    })

    test(
      screen.columns === 1
        ? "the sections stack in one column, the switch and its state first, beside the rail from 768 px, and the button of the switch is 44 px high"
        : "the switch and the domains take the main column and the roles, the channels, the action and the other exceptions the side column, beside the sidebar, and the button of the switch is 44 px high at the finger and 38 px with a mouse",
      async ({ page, logIn, checkAccessibility }) => {
        await logIn(ALDIS)
        await page.goto("/blocked-links")
        await settle(page)

        const [switchCard, domains, ...side] = await Promise.all(
          [...MAIN_REGIONS, ...SIDE_REGIONS].map((name) =>
            boxOf(page.getByRole("region", { name }))
          )
        )
        if (switchCard === undefined || domains === undefined) {
          throw new Error("The main column holds no section.")
        }
        expect([domains.x, domains.width]).toEqual([
          switchCard.x,
          switchCard.width,
        ])
        expect(domains.y).toBeGreaterThanOrEqual(
          switchCard.y + switchCard.height
        )
        for (const [index, section] of side.entries()) {
          expect([section.x, section.width]).toEqual([
            side[0]?.x,
            side[0]?.width,
          ])
          const before = index === 0 ? undefined : side[index - 1]
          if (before !== undefined) {
            expect(section.y).toBeGreaterThanOrEqual(before.y + before.height)
          }
        }
        const [firstSide] = side
        if (firstSide === undefined) {
          throw new Error("The side column holds no section.")
        }
        if (screen.columns === 1) {
          expect([firstSide.x, firstSide.width]).toEqual([
            switchCard.x,
            switchCard.width,
          ])
          expect(firstSide.y).toBeGreaterThanOrEqual(domains.y + domains.height)
        } else {
          expect(firstSide.x).toBeGreaterThanOrEqual(domains.x + domains.width)
          expect(Math.round(firstSide.y)).toBe(Math.round(switchCard.y))
        }
        const navigationWidth = screen.width >= 1024 ? SIDEBAR_PX : RAIL_PX
        if (screen.width >= 768) {
          expect(switchCard.x).toBeGreaterThanOrEqual(navigationWidth)
        }

        const button = page.getByRole("button", { name: "Couper" })
        const { height, width } = await boxOf(button)
        expect(Math.round(height)).toBe(
          screen === DESKTOP ? DESKTOP_CONTROL_PX : MIN_TARGET_PX
        )
        if (screen.width < 640) {
          expect(width).toBe(switchCard.width - 2 * 21)
        } else {
          expect(width).toBeLessThan(switchCard.width / 2)
        }
        await checkAccessibility()
      }
    )
  })
}
