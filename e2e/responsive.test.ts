import { blockedWordAction } from "@/blocked-words/blocked-word-action"
import { newPanelRule } from "@/blocked-words/panel-rule"
import {
  BAN_ROLE_ID,
  MODERATION_ROLE_ID,
  STAFF_ROLE_ID,
} from "../playwright.config"
import { expect, test, type Page } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const BRYNJA = { id: "1400000000000000002", username: "brynja" }

const CORVUS = { id: "1400000000000000004", username: "corvus" }

const STAFF = { id: STAFF_ROLE_ID, name: "Staff", position: 5 }

const MODERATION = { id: MODERATION_ROLE_ID, name: "Modération", position: 4 }

const BANS = { id: BAN_ROLE_ID, name: "Bannissements", position: 3 }

const PANEL = { id: "1300000000000000020", name: "Shor Panel", position: 2 }

const GUARD = { id: "1300000000000000010", name: "Garde", position: 1 }

const SCREENS = [
  { width: 360, height: 780, touchScreen: false },
  { width: 390, height: 844, touchScreen: false },
  { width: 768, height: 1024, touchScreen: false },
  { width: 1024, height: 768, touchScreen: true },
] as const

const STAFF_PAGES = [
  { path: "/blocked-words", fixme: true },
  { path: "/audit-log", fixme: true },
  { path: "/records", fixme: true },
  { path: `/records/${BRYNJA.id}`, fixme: true },
] as const

const PUBLIC_PAGES = [
  { path: "/privacy", fixme: true },
  { path: "/login/logged-out", fixme: true },
] as const

const MIN_TARGET_PX = 44

const TARGETS =
  "a[href], button, input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select, textarea, summary, [role=tab], label:has(> input[type=radio]), label:has(> input[type=checkbox])"

test.use({
  discordState: {
    roles: [STAFF, MODERATION, BANS, PANEL, GUARD],
    applicationRoles: [PANEL.id],
    members: [
      { user: ALDIS, roles: [STAFF.id, MODERATION.id, BANS.id] },
      { user: BRYNJA, roles: [GUARD.id] },
    ],
    bans: [{ user: CORVUS }],
  },
})

test.beforeEach(({ discord }) => {
  discord.createAutoModerationRuleAs(
    ALDIS.id,
    newPanelRule(blockedWordAction("block"), STAFF_ROLE_ID, ["mot0", "mot1"])
  )
})

const PENDING_SUSPENSE = '[id^="S:"], template[id^="B:"]'

async function settle(page: Page) {
  await page.waitForLoadState()
  await page.waitForFunction(
    (pending) =>
      document.querySelector(pending) === null &&
      document.activeViewTransition === null,
    PENDING_SUSPENSE
  )
}

async function resize(page: Page, size: { width: number; height: number }) {
  await settle(page)
  await page.setViewportSize(size)
}

function holdsTouch(page: Page) {
  return page.evaluate(
    () => window.innerWidth < 1024 || matchMedia("(pointer: coarse)").matches
  )
}

function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const wider = [...document.body.querySelectorAll("*")]
      .filter(
        (element) =>
          element.getBoundingClientRect().right > root.clientWidth + 0.5
      )
      .filter(
        (element) =>
          !element.closest(
            "[data-slot=sheet-content], [data-slot=dialog-content], [hidden], .sr-only"
          )
      )
      .slice(0, 5)
      .map(
        (element) =>
          `${element.localName}.${[...element.classList].slice(0, 4).join(".")}`
      )
    return { scroll: root.scrollWidth - root.clientWidth, wider }
  })
}

function smallTargets(page: Page) {
  return page.evaluate(
    ({ selector, min }) => {
      function inSentence(element: Element) {
        return (
          element.localName === "a" &&
          getComputedStyle(element).display === "inline" &&
          element.parentElement !== null &&
          ["p", "li", "dd", "span"].includes(element.parentElement.localName) &&
          (element.parentElement.textContent ?? "").trim().length >
            (element.textContent ?? "").trim().length
        )
      }
      return [...document.querySelectorAll(selector)]
        .filter((element) => {
          const box = element.getBoundingClientRect()
          return (
            box.width > 0 &&
            box.height > 0 &&
            getComputedStyle(element).visibility !== "hidden" &&
            element.closest(".sr-only, [aria-hidden=true], [inert]") === null &&
            !inSentence(element)
          )
        })
        .map((element) => ({ element, box: element.getBoundingClientRect() }))
        .filter(({ box }) => box.width < min - 0.5 || box.height < min - 0.5)
        .map(
          ({ element, box }) =>
            `${element.localName} « ${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40)} » ${Math.round(box.width)}×${Math.round(box.height)}`
        )
    },
    { selector: TARGETS, min: MIN_TARGET_PX }
  )
}

for (const screen of SCREENS) {
  test.describe(`at ${screen.width} px`, () => {
    test.use({
      viewport: { width: screen.width, height: screen.height },
      hasTouch: screen.touchScreen,
      isMobile: screen.touchScreen,
    })

    for (const { path, fixme } of STAFF_PAGES) {
      test(`${path} holds in ${screen.width} px, scrolling no wider and passing axe`, async ({
        page,
        logIn,
        checkAccessibility,
      }) => {
        await logIn(ALDIS)
        await page.goto(path)
        await settle(page)
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
        expect(await holdsTouch(page)).toBe(true)
        expect(await horizontalOverflow(page)).toEqual({ scroll: 0, wider: [] })
        await checkAccessibility()
      })

      const targets = fixme ? test.fixme : test
      targets(
        `${path} gives every control a ${MIN_TARGET_PX} px target in ${screen.width} px`,
        async ({ page, logIn }) => {
          await logIn(ALDIS)
          await page.goto(path)
          await settle(page)
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
          expect(await smallTargets(page)).toEqual([])
        }
      )
    }

    for (const { path, fixme } of PUBLIC_PAGES) {
      test(`${path} holds in ${screen.width} px, scrolling no wider and passing axe`, async ({
        page,
        checkAccessibility,
      }) => {
        await page.goto(path)
        await settle(page)
        expect(await holdsTouch(page)).toBe(true)
        expect(await horizontalOverflow(page)).toEqual({ scroll: 0, wider: [] })
        await checkAccessibility()
      })

      const targets = fixme ? test.fixme : test
      targets(
        `${path} gives every control a ${MIN_TARGET_PX} px target in ${screen.width} px`,
        async ({ page }) => {
          await page.goto(path)
          await settle(page)
          expect(await smallTargets(page)).toEqual([])
        }
      )
    }
  })
}

test("the viewport covers the whole screen, notch and home indicator included", async ({
  page,
}) => {
  await page.goto("/login/logged-out")
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /(^|, )viewport-fit=cover(,|$)/
  )
})

test.fixme("the navigation is a bar below md, a 64 px rail from md and a 252 px sidebar from lg", async ({
  page,
  logIn,
}) => {
  const aside = page.getByRole("complementary", { includeHidden: true })
  const bar = page.getByRole("banner", { includeHidden: true })
  function scrolledBar() {
    return page.evaluate(() => {
      window.scrollTo(0, 120)
      return {
        scrolled: window.scrollY,
        y: document.querySelector("header")?.getBoundingClientRect().y,
      }
    })
  }

  await page.setViewportSize({ width: 767, height: 300 })
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await settle(page)
  await expect(aside).toBeHidden()
  await expect(bar).toBeVisible()
  expect(await scrolledBar()).toEqual({ scrolled: 120, y: 0 })

  await resize(page, { width: 768, height: 300 })
  await expect(bar).toBeHidden()
  expect((await aside.boundingBox())?.width).toBe(64)
  await expect(
    aside.getByRole("link", { name: /^Mots interdits/ })
  ).toBeVisible()

  await resize(page, { width: 1023, height: 300 })
  expect((await aside.boundingBox())?.width).toBe(64)

  await resize(page, { width: 1024, height: 300 })
  expect((await aside.boundingBox())?.width).toBe(252)
})

test.fixme("a dialog docks to the bottom of a 360 px screen, its two buttons sharing one row", async ({
  page,
  logIn,
}) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await logIn(ALDIS)
  await page.goto(`/records/${BRYNJA.id}`)
  await settle(page)
  await page.getByRole("tab", { name: "Expulsion" }).click()
  await page.getByRole("button", { name: "Expulser" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  const box = await dialog.boundingBox()
  expect(box?.x).toBe(0)
  expect(box?.width).toBe(360)
  expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(780)
  const [cancel, confirm] = await Promise.all([
    dialog.getByRole("button", { name: "Annuler" }).boundingBox(),
    dialog.getByRole("button", { name: "Expulser" }).boundingBox(),
  ])
  expect(cancel?.y).toBe(confirm?.y)
  await dialog.getByRole("button", { name: "Annuler" }).click()
  await expect(dialog).toBeHidden()
})
