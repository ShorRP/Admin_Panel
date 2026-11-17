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

const GUARD_ROLE_ID = "1300000000000000010"

const MODERATOR_ROLE_ID = "1300000000000000011"

const LONG_DOMAIN = `${"a".repeat(40)}.com`

const SCREENS = [
  {
    width: 360,
    height: 780,
    touchScreen: false,
    columns: 1,
    rolesOnOneLine: false,
  },
  {
    width: 487,
    height: 780,
    touchScreen: false,
    columns: 1,
    rolesOnOneLine: false,
  },
  {
    width: 488,
    height: 780,
    touchScreen: false,
    columns: 1,
    rolesOnOneLine: true,
  },
  {
    width: 768,
    height: 1024,
    touchScreen: false,
    columns: 1,
    rolesOnOneLine: true,
  },
  {
    width: 1024,
    height: 768,
    touchScreen: true,
    columns: 2,
    rolesOnOneLine: false,
  },
] as const

const DESKTOP = {
  width: 1280,
  height: 800,
  touchScreen: false,
  columns: 2,
  rolesOnOneLine: false,
} as const

const MIN_TARGET_PX = 44

const DESKTOP_CONTROL_PX = 38

const DESKTOP_CROSS_PX = 28

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
    roles: [
      { id: STAFF_ROLE_ID, name: "Staff" },
      { id: GUARD_ROLE_ID, name: "G".repeat(90) },
      { id: MODERATOR_ROLE_ID, name: "Modérateur" },
    ],
    channels: [{ id: GALLERY_ID, name: "g".repeat(95) }],
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
        `https://${LONG_DOMAIN}`,
        `https://${LONG_DOMAIN}/*`,
        `https://www.${LONG_DOMAIN}`,
        `https://www.${LONG_DOMAIN}/*`,
        "*arnaque.example/a-long-entry-that-does-not-follow-the-model",
      ],
    },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
    exempt_roles: [STAFF_ROLE_ID, GUARD_ROLE_ID],
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
        ? "the sections stack in one column, the switch and its state first, beside the rail from 768 px, and the button of the switch is 44 px high, the field to add a domain and its button stacked under 640 px and on one line from it, a cross of 44 px at the finger and 28 px with a mouse beside each domain, the choice of a role and its button stacked in the side column and in a single column under 448 px, on one line in a single column of 448 px or more, the list of exempt roles under them, a cross of the same size beside each exempt role but the staff role, which has none, a domain, a role and a channel of a long name wrapping inside their column with no sideways scroll"
        : "the switch and the domains take the main column and the roles, the channels, the action and the other exceptions the side column, beside the sidebar, and the button of the switch is 44 px high at the finger and 38 px with a mouse, the field to add a domain and its button stacked under 640 px and on one line from it, a cross of 44 px at the finger and 28 px with a mouse beside each domain, the choice of a role and its button stacked in the side column and in a single column under 448 px, on one line in a single column of 448 px or more, the list of exempt roles under them, a cross of the same size beside each exempt role but the staff role, which has none, a domain, a role and a channel of a long name wrapping inside their column with no sideways scroll",
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

        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth
          )
        ).toBeLessThanOrEqual(0)

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
        const domainsRegion = page.getByRole("region", {
          name: "Domaines permis",
        })
        const field = await boxOf(
          domainsRegion.getByLabel("Ajouter un domaine")
        )
        const add = await boxOf(
          domainsRegion.getByRole("button", { name: "Ajouter" })
        )
        const controlPx =
          screen === DESKTOP ? DESKTOP_CONTROL_PX : MIN_TARGET_PX
        expect(Math.round(field.height)).toBe(controlPx)
        expect(Math.round(add.height)).toBe(controlPx)
        if (screen.width < 640) {
          expect([add.x, add.width]).toEqual([field.x, field.width])
          expect(add.y).toBeGreaterThanOrEqual(field.y + field.height)
        } else {
          expect(Math.round(add.y)).toBe(Math.round(field.y))
          expect(add.x).toBeGreaterThanOrEqual(field.x + field.width)
        }
        expect(add.x + add.width).toBeLessThanOrEqual(domains.x + domains.width)
        const crosses = await domainsRegion
          .getByRole("button", { name: /^Retirer/ })
          .all()
        expect(crosses).toHaveLength(2)
        for (const cross of crosses) {
          const { height, width } = await boxOf(cross)
          expect([Math.round(width), Math.round(height)]).toEqual(
            screen === DESKTOP
              ? [DESKTOP_CROSS_PX, DESKTOP_CROSS_PX]
              : [MIN_TARGET_PX, MIN_TARGET_PX]
          )
        }
        const rolesRegion = page.getByRole("region", {
          name: "Rôles exemptés",
        })
        const roleChoice = await boxOf(
          rolesRegion.getByLabel("Ajouter un rôle")
        )
        const roleAdd = await boxOf(
          rolesRegion.getByRole("button", { name: "Ajouter" })
        )
        expect(Math.round(roleChoice.height)).toBe(controlPx)
        expect(Math.round(roleAdd.height)).toBe(controlPx)
        if (screen.rolesOnOneLine) {
          expect(Math.round(roleAdd.y)).toBe(Math.round(roleChoice.y))
          expect(roleAdd.x).toBeGreaterThanOrEqual(
            roleChoice.x + roleChoice.width
          )
        } else {
          expect([roleAdd.x, roleAdd.width]).toEqual([
            roleChoice.x,
            roleChoice.width,
          ])
          expect(roleAdd.y).toBeGreaterThanOrEqual(
            roleChoice.y + roleChoice.height
          )
        }
        expect(roleChoice.x).toBeGreaterThanOrEqual(firstSide.x)
        expect(roleAdd.x + roleAdd.width).toBeLessThanOrEqual(
          firstSide.x + firstSide.width
        )
        const roleList = await boxOf(rolesRegion.locator("ul"))
        expect(roleList.y).toBeGreaterThanOrEqual(
          Math.max(roleChoice.y + roleChoice.height, roleAdd.y + roleAdd.height)
        )
        expect(roleList.x).toBeGreaterThanOrEqual(firstSide.x)
        expect(roleList.x + roleList.width).toBeLessThanOrEqual(
          firstSide.x + firstSide.width
        )
        const roleCrosses = await rolesRegion
          .getByRole("button", { name: /^Retirer/ })
          .all()
        expect(roleCrosses).toHaveLength(1)
        for (const cross of roleCrosses) {
          const { height, width } = await boxOf(cross)
          expect([Math.round(width), Math.round(height)]).toEqual(
            screen === DESKTOP
              ? [DESKTOP_CROSS_PX, DESKTOP_CROSS_PX]
              : [MIN_TARGET_PX, MIN_TARGET_PX]
          )
        }
        await checkAccessibility()
      }
    )
  })
}
