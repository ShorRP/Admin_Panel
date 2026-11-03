import { blockedWordAction } from "@/blocked-words/blocked-word-action"
import { newPanelRule } from "@/blocked-words/panel-rule"
import { DiscordError } from "@/discord/discord-error"
import { ROUTES } from "@/discord/routes"
import { BAN_MESSAGE_DELETIONS } from "@/sanctions/ban-message-deletions"
import {
  BAN_ROLE_ID,
  MODERATION_ROLE_ID,
  STAFF_ROLE_ID,
} from "../playwright.config"
import { expect, test, type Locator, type Page } from "./fixtures"
import { minifiedReactError } from "./minified-react-error"
import { resize, settle } from "./settle"

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

const DESKTOP = { width: 1280, height: 800, touchScreen: false } as const

const STAFF_PAGES = [
  { path: "/blocked-words", fixme: true },
  { path: "/audit-log", fixme: true },
  { path: "/records", fixme: true },
  { path: `/records/${BRYNJA.id}`, fixme: false },
] as const

const PUBLIC_PAGES = [
  { path: "/privacy", fixme: false },
  { path: "/login/logged-out", fixme: false },
  { path: "/login/refused", fixme: false },
  { path: "/login/failed", fixme: false },
] as const

const MIN_TARGET_PX = 44

const TARGET_SELECTOR =
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

function fontSizeOf(locator: Locator) {
  return locator.evaluate((element) => getComputedStyle(element).fontSize)
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

function smallTargets(page: Page, within = "body") {
  return page.evaluate(
    ({ selector, min, root }) => {
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
      return [
        ...(document.querySelector(root)?.querySelectorAll(selector) ?? []),
      ]
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
    { selector: TARGET_SELECTOR, min: MIN_TARGET_PX, root: within }
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

      const sizeTest = fixme ? test.fixme : test
      sizeTest(
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

      const sizeTest = fixme ? test.fixme : test
      sizeTest(
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

test("the navigation is a bar below md, a 64 px rail from md and a 252 px sidebar from lg", async ({
  page,
  logIn,
}) => {
  const aside = page.getByRole("complementary", { includeHidden: true })
  const bar = page.getByRole("banner", { includeHidden: true })
  const menu = page.getByRole("dialog", { name: "Menu" })
  const administration = aside.getByText("Administration", { exact: true })
  const ACCESSIBLE_NAMES = [
    "Mots interdits 2 mots",
    "Journal d’audit",
    "Modération",
  ]
  function scrolledBar() {
    return page.evaluate(() => {
      window.scrollTo(0, 400)
      return {
        scrolled: window.scrollY,
        y: document.querySelector("header")?.getBoundingClientRect().y,
      }
    })
  }
  async function expectNamed(root: Locator) {
    const sections = root.getByRole("navigation", { name: "Sections du panel" })
    for (const name of ACCESSIBLE_NAMES) {
      await expect(
        sections.getByRole("link", { name, exact: true })
      ).toBeVisible()
    }
    await expect(
      root.getByRole("link", { name: "aldis", exact: true })
    ).toBeVisible()
  }

  await page.setViewportSize({ width: 767, height: 300 })
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await settle(page)
  await expect(aside).toBeHidden()
  await expect(bar).toBeVisible()
  expect(await scrolledBar()).toEqual({ scrolled: 400, y: 0 })
  await expect(
    bar.getByRole("link", { name: "aldis", exact: true })
  ).toBeVisible()
  const field = page.getByPlaceholder(/^Ex\./)
  await field.focus()
  expect(
    await field.evaluate((element) => {
      const { x, y, width, height } = element.getBoundingClientRect()
      return (
        document.elementFromPoint(x + width / 2, y + height / 2) === element
      )
    }),
    "a field focused above the viewport scrolls in under the bar, not behind it"
  ).toBe(true)
  expect(await smallTargets(page, "header")).toEqual([])
  await bar.getByRole("button", { name: "Ouvrir le menu" }).click()
  await expect(menu).toBeVisible()
  await expectNamed(menu)
  expect(await smallTargets(page, "[role=dialog]")).toEqual([])
  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()

  await resize(page, { width: 768, height: 1024 })
  await expect(bar).toBeHidden()
  expect((await aside.boundingBox())?.width).toBe(64)
  await expectNamed(aside)
  await expect(
    aside.getByTitle("Mots interdits", { exact: true })
  ).toBeVisible()
  await expect(aside.getByTitle("aldis · Staff · Modération")).toBeVisible()
  expect(await smallTargets(page, "aside")).toEqual([])
  expect((await boxOf(administration)).width).toBe(1)
  const count = await aside
    .getByRole("link", { name: ACCESSIBLE_NAMES[0], exact: true })
    .getByText("2", { exact: true })
    .evaluate((digits) => {
      digits.textContent = "3 000"
      const pill = digits.parentElement
      const link = digits.closest("a")
      const icon = link?.querySelector("svg")
      const aside = digits.closest("aside")
      if (pill === null || link === null || !icon || aside === null) {
        throw new Error("The badge is not in its link.")
      }
      const pillBox = pill.getBoundingClientRect()
      const linkBox = link.getBoundingClientRect()
      const iconBox = icon.getBoundingClientRect()
      return {
        belowTheIcon: pillBox.top >= iconBox.bottom - 0.5,
        withinTheLink:
          pillBox.left >= linkBox.left && pillBox.right <= linkBox.right,
        overflowsTheRail: aside.scrollWidth > aside.clientWidth,
      }
    })
  expect(count).toEqual({
    belowTheIcon: true,
    withinTheLink: true,
    overflowsTheRail: false,
  })
  const themes = await Promise.all(
    (
      await aside
        .getByRole("group", { name: "Thème" })
        .getByRole("button")
        .all()
    ).map(boxOf)
  )
  expect(themes).toHaveLength(3)
  expect(new Set(themes.map(({ x }) => x)).size).toBe(1)
  expect(
    themes.every(
      ({ y }, index) =>
        index === 0 ||
        y >= (themes[index - 1]?.y ?? 0) + (themes[index - 1]?.height ?? 0)
    )
  ).toBe(true)

  await resize(page, { width: 1023, height: 300 })
  expect((await aside.boundingBox())?.width).toBe(64)
  const logOut = aside.getByRole("button", { name: "Se déconnecter" })
  await logOut.scrollIntoViewIfNeeded()
  await expect(logOut).toBeInViewport()

  await resize(page, { width: 1024, height: 800 })
  expect((await aside.boundingBox())?.width).toBe(252)
  await expectNamed(aside)
  expect((await boxOf(administration)).width).toBeGreaterThan(20)
})

test("the bar, the rail, the sidebar and the page keep clear of the notch and the home indicator of the screen", async ({
  page,
  logIn,
}) => {
  const INSETS = { top: 47, left: 44, right: 40, bottom: 34 }
  const aside = page.getByRole("complementary", { includeHidden: true })
  const bar = page.getByRole("banner")
  const main = page.getByRole("main")

  await page.setViewportSize({ width: 767, height: 700 })
  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await settle(page)
  const insets = await page.context().newCDPSession(page)
  await insets.send("Emulation.setSafeAreaInsetsOverride", { insets: INSETS })

  const barBox = await boxOf(bar)
  expect(barBox.height).toBe(56 + INSETS.top)
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollPaddingTop
    )
  ).toBe(`${barBox.height}px`)
  expect(
    (
      await boxOf(
        bar.getByRole("link", { name: "Shor Panel du staff" }).locator("svg")
      )
    ).x
  ).toBeGreaterThanOrEqual(INSETS.left)
  const menu = await boxOf(bar.getByRole("button", { name: "Ouvrir le menu" }))
  expect(menu.x + menu.width).toBeLessThanOrEqual(767 - INSETS.right)
  expect(menu.y).toBeGreaterThanOrEqual(INSETS.top)
  const content = await boxOf(main)
  expect(content.x).toBeGreaterThanOrEqual(INSETS.left)
  expect(content.x + content.width).toBeLessThanOrEqual(767 - INSETS.right)

  await resize(page, { width: 768, height: 1024 })
  expect((await boxOf(aside)).width).toBe(64 + INSETS.left)
  expect(
    (
      await boxOf(
        aside.getByRole("link", { name: "Mots interdits 2 mots", exact: true })
      )
    ).x
  ).toBeGreaterThanOrEqual(INSETS.left)
  const lock = await boxOf(aside.getByRole("link", { name: "Confidentialité" }))
  expect(lock.y + lock.height).toBeLessThanOrEqual(1024 - INSETS.bottom)
  expect((await boxOf(main)).x).toBeGreaterThanOrEqual(64 + INSETS.left)

  await resize(page, { width: 1024, height: 800 })
  expect((await boxOf(aside)).width).toBe(252 + INSETS.left)
  expect(
    (await boxOf(aside.getByRole("link", { name: "Shor Panel du staff" }))).x
  ).toBeGreaterThanOrEqual(INSETS.left)
  const privacy = await boxOf(
    aside.getByRole("link", { name: "Confidentialité" })
  )
  expect(privacy.y + privacy.height).toBeLessThanOrEqual(800 - INSETS.bottom)
})

test("a dialog docks to the bottom of a 360 px screen, its two buttons sharing one row", async ({
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

const LONG_WORD = "x".repeat(300)

const ACTION_MAX_WIDTH_PX = 250

for (const screen of SCREENS) {
  test.describe(`the login, error and privacy pages at ${screen.width} px`, () => {
    test.use({
      viewport: { width: screen.width, height: screen.height },
      hasTouch: screen.touchScreen,
      isMobile: screen.touchScreen,
    })

    test("stack their actions at full width under 640 px, take a 38 px title there and wrap a long word", async ({
      page,
      discord,
      logIn,
      browserConsole,
    }) => {
      browserConsole.expectProblems([
        "console.error: Failed to load resource: the server responded with a status of 404 (Not Found)",
        `console.error: Error: ${minifiedReactError(441)}`,
        `pageerror: ${minifiedReactError(419)}`,
      ])
      const phone = screen.width < 640
      const room = screen.width - 32
      function expectActionWidth(box: { x: number; width: number }) {
        if (phone) {
          expect([box.x, box.width]).toEqual([16, room])
        } else {
          expect(box.width).toBeLessThan(ACTION_MAX_WIDTH_PX)
        }
      }

      await logIn(ALDIS)
      await page.goto("/login/refused")
      await settle(page)
      expect(await fontSizeOf(page.getByRole("heading", { level: 1 }))).toBe(
        phone ? "38px" : "46px"
      )
      const themeChoices = page
        .getByRole("group", { name: "Thème" })
        .getByRole("button")
      expect(await themeChoices.count()).toBe(3)
      for (const choice of await themeChoices.all()) {
        expect(await sizeOf(choice)).toEqual({
          width: MIN_TARGET_PX,
          height: MIN_TARGET_PX,
        })
      }
      const logInAgain = await boxOf(
        page.getByRole("link", { name: "Se reconnecter" })
      )
      const logOut = await boxOf(
        page.getByRole("button", { name: "Se déconnecter" })
      )
      expectActionWidth(logInAgain)
      expectActionWidth(logOut)
      if (phone) {
        expect(logOut.y - (logInAgain.y + logInAgain.height)).toBe(8)
      } else {
        expect(Math.abs(logOut.y - logInAgain.y)).toBeLessThan(1)
        expect(logOut.height).toBe(logInAgain.height)
      }

      await page.goto("/no-such-page")
      await settle(page)
      expectActionWidth(
        await boxOf(page.getByRole("link", { name: "Revenir à l’accueil" }))
      )
      expect(await smallTargets(page)).toEqual([])

      discord.failNext(
        "getAuditLog",
        new DiscordError({
          method: "GET",
          route: ROUTES.guildAuditLog,
          status: 503,
        })
      )
      await page.goto("/audit-log")
      const retry = page.getByRole("button", { name: "Réessayer" })
      await expect(retry).toBeVisible()
      await page.waitForLoadState()
      expectActionWidth(await boxOf(retry))
      expect(await smallTargets(page)).toEqual([])
      await page
        .getByRole("main")
        .getByText(/^\d+$/)
        .evaluate((reference, word) => {
          reference.textContent = word
        }, LONG_WORD)
      expect(await horizontalOverflow(page)).toEqual({ scroll: 0, wider: [] })
      await retry.click()
      await expect(
        page.getByRole("heading", { level: 1, name: "Journal d’audit" })
      ).toBeVisible()

      await page.goto("/privacy")
      await settle(page)
      await page
        .getByRole("code")
        .first()
        .evaluate((code, word) => {
          code.textContent = word
        }, LONG_WORD)
      expect(await horizontalOverflow(page)).toEqual({ scroll: 0, wider: [] })
    })
  })
}

const TOAST_FRAME_PX = 34

const DESKTOP_CLOSE_BUTTON_PX = 28

for (const screen of [...SCREENS, DESKTOP]) {
  test.describe(`the shared controls at ${screen.width} px`, () => {
    test.use({
      viewport: { width: screen.width, height: screen.height },
      hasTouch: screen.touchScreen,
      isMobile: screen.touchScreen,
    })

    test("take their touch size on a touch screen and keep their desktop size with a mouse", async ({
      page,
      logIn,
      discord,
      readToast,
      toast,
    }) => {
      discord.modifyMemberAs(
        ALDIS.id,
        BRYNJA.id,
        {
          communication_disabled_until: new Date(
            Date.now() + 3_600_000
          ).toISOString(),
        },
        "Insultes"
      )

      await logIn(ALDIS)
      await page.goto("/blocked-words?query=mot")
      await settle(page)
      const touch = await holdsTouch(page)
      expect(touch).toBe(screen !== DESKTOP)
      const field = touch ? MIN_TARGET_PX : 32
      const fieldText = screen.width < 768 ? "16px" : "14px"

      expect(await fontSizeOf(page.getByRole("heading", { level: 1 }))).toBe(
        screen.width < 640 ? "32px" : "38px"
      )
      expect(
        await fontSizeOf(page.getByText("Capacité", { exact: true }))
      ).toBe("11px")
      expect(
        (await sizeOf(page.getByRole("textbox", { name: "Filtrer la liste" })))
          .height
      ).toBe(field)
      expect(
        (await sizeOf(page.getByRole("button", { name: "Filtrer" }))).height
      ).toBe(field)
      const showAll = await sizeOf(
        page.getByRole("link", { name: "Tout afficher" })
      )
      expect(showAll.height >= MIN_TARGET_PX).toBe(touch)

      await page.getByPlaceholder(/^Ex./).fill("ab")
      await page.getByRole("button", { name: "Ajouter" }).click()
      await readToast(/est maintenant un mot interdit/)
      const close = await sizeOf(
        toast().getByRole("button", { name: "Fermer" })
      )
      expect(close).toEqual(
        touch
          ? { width: MIN_TARGET_PX, height: MIN_TARGET_PX }
          : { width: DESKTOP_CLOSE_BUTTON_PX, height: DESKTOP_CLOSE_BUTTON_PX }
      )
      const text = await sizeOf(toast().locator("[data-slot=toast-title]"))
      expect((await sizeOf(toast())).height).toBeLessThanOrEqual(
        TOAST_FRAME_PX + Math.max(text.height, DESKTOP_CLOSE_BUTTON_PX)
      )

      await page.goto("/audit-log?author=aldis")
      await settle(page)
      const reset = await sizeOf(
        page.getByRole("link", { name: "Réinitialiser" })
      )
      expect(reset.height >= MIN_TARGET_PX).toBe(touch)
      const author = await sizeOf(
        page.locator(`main a[href="/records/${ALDIS.id}"]`).first()
      )
      expect(author.height >= MIN_TARGET_PX).toBe(touch)
      const account = page
        .getByRole("main")
        .getByRole("link", { name: "brynja" })
      expect(
        await account.evaluate((link) => getComputedStyle(link).display)
      ).toBe("inline")
      expect((await sizeOf(account)).height).toBeLessThan(MIN_TARGET_PX)

      await page.goto("/records")
      await settle(page)
      expect(
        await fontSizeOf(page.getByRole("combobox", { name: "Rôle" }))
      ).toBe(fieldText)
      expect(
        await fontSizeOf(page.getByRole("textbox", { name: "Compte" }))
      ).toBe(fieldText)

      await page.goto(`/records/${BRYNJA.id}`)
      await settle(page)
      expect(
        await fontSizeOf(page.getByText("Heures de Paris", { exact: true }))
      ).toBe("11px")
      const tab = page.getByRole("tab", { name: "Expulsion" })
      expect((await sizeOf(tab)).height).toBe(touch ? MIN_TARGET_PX : 30)
      await tab.click()
      await page.getByRole("button", { name: "Expulser" }).click()
      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible()
      expect(
        (await sizeOf(dialog.getByRole("button", { name: "Annuler" }))).height
      ).toBe(touch ? MIN_TARGET_PX : 36)
      const box = await boxOf(dialog)
      if (screen.width < 640) {
        expect([box.x, box.width, Math.round(box.y + box.height)]).toEqual([
          0,
          screen.width,
          screen.height,
        ])
      } else {
        expect(Math.abs(box.x + box.width / 2 - screen.width / 2)).toBeLessThan(
          1
        )
        expect(
          Math.abs(box.y + box.height / 2 - screen.height / 2)
        ).toBeLessThan(1)
      }
      await dialog.getByRole("button", { name: "Annuler" }).click()
      await expect(dialog).toBeHidden()

      await page.goto("/blocked-words")
      await settle(page)
      if (screen.width < 768) {
        const menu = page.getByRole("button", { name: "Ouvrir le menu" })
        expect(await sizeOf(menu)).toEqual({
          width: MIN_TARGET_PX,
          height: MIN_TARGET_PX,
        })
        await menu.click()
        const sheet = page.getByRole("dialog")
        await expect(sheet).toBeVisible()
        expect(
          await sizeOf(sheet.getByRole("button", { name: "Fermer" }))
        ).toEqual({ width: MIN_TARGET_PX, height: MIN_TARGET_PX })
        expect(
          await fontSizeOf(sheet.getByText("Administration", { exact: true }))
        ).toBe("11px")
        expect(
          (
            await sizeOf(
              sheet
                .getByRole("group", { name: "Thème" })
                .getByRole("button")
                .first()
            )
          ).height
        ).toBe(MIN_TARGET_PX)
      } else {
        expect(
          await fontSizeOf(page.getByText("Administration", { exact: true }))
        ).toBe("11px")
        expect(
          (
            await sizeOf(
              page
                .getByRole("group", { name: "Thème" })
                .getByRole("button")
                .first()
            )
          ).height
        ).toBe(touch ? MIN_TARGET_PX : 28)
        expect(
          (
            await sizeOf(
              page
                .getByRole("complementary")
                .getByRole("link", { name: "Journal d’audit" })
            )
          ).height
        ).toBe(touch ? MIN_TARGET_PX : 36)
        if (touch) {
          expect(await smallTargets(page, "aside")).toEqual([])
        }
      }
    })
  })
}

const DESKTOP_DURATION_PX = 30

const DESKTOP_CHOICE_PX = 19

const CHOICE_COLUMN_MIN_PX = 170

const CHOICE_GAP_PX = 8

for (const screen of [...SCREENS, DESKTOP]) {
  test.describe(`the record at ${screen.width} px`, () => {
    test.use({
      viewport: { width: screen.width, height: screen.height },
      hasTouch: screen.touchScreen,
      isMobile: screen.touchScreen,
    })

    test("sizes its header, stacks its terms and values and gives its controls their touch size on a touch screen", async ({
      page,
      logIn,
    }) => {
      await logIn(ALDIS)
      await page.goto(`/records/${BRYNJA.id}`)
      await settle(page)
      const touch = await holdsTouch(page)
      expect(touch).toBe(screen !== DESKTOP)
      const stacked = screen.width < 640
      const main = page.getByRole("main")

      const avatar = stacked ? 56 : 68
      expect(await sizeOf(main.locator("[data-slot=avatar]").first())).toEqual({
        width: avatar,
        height: avatar,
      })
      expect(await fontSizeOf(main.getByRole("heading", { level: 1 }))).toBe(
        stacked ? "32px" : "38px"
      )

      const details = main.getByRole("region", { name: "Détails" })
      const term = details.getByText("Nom d’utilisateur", { exact: true })
      const value = details.getByText(BRYNJA.username, { exact: true })
      expect(await fontSizeOf(term)).toBe(stacked ? "12.5px" : "14px")
      const [termBox, valueBox] = [await boxOf(term), await boxOf(value)]
      if (stacked) {
        expect(valueBox.x).toBe(termBox.x)
        expect(valueBox.y).toBeGreaterThanOrEqual(termBox.y + termBox.height)
      } else {
        expect(valueBox.x).toBeGreaterThan(termBox.x + termBox.width)
        expect(valueBox.y).toBeLessThan(termBox.y + termBox.height)
      }

      const breadcrumb = main
        .getByRole("navigation", { name: "Fil d’Ariane" })
        .getByRole("link", { name: "Modération" })
      expect((await sizeOf(breadcrumb)).height >= MIN_TARGET_PX).toBe(touch)

      const sanctions = main.getByRole("region", {
        name: "Sanctions",
        exact: true,
      })
      const durations = sanctions.locator("label:has(input[name=duration])")
      await expect(durations).toHaveCount(7)
      for (const duration of await durations.all()) {
        expect((await sizeOf(duration)).height).toBe(
          touch ? MIN_TARGET_PX : DESKTOP_DURATION_PX
        )
      }
      const notify = sanctions
        .locator("label:has(input[name=notify])")
        .filter({ visible: true })
      expect((await sizeOf(notify)).height).toBe(
        touch ? MIN_TARGET_PX : DESKTOP_CHOICE_PX
      )
      if (touch) {
        expect(await smallTargets(page, "main")).toEqual([])
      }

      await sanctions.getByRole("tab", { name: "Expulsion" }).click()
      if (touch) {
        expect(await smallTargets(page, "main")).toEqual([])
      }

      await sanctions.getByRole("tab", { name: "Bannissement" }).click()
      const deletions = sanctions.locator(
        "label:has(input[name=deleteMessages])"
      )
      await expect(deletions).toHaveCount(BAN_MESSAGE_DELETIONS.length)
      const columns = new Set<number>()
      for (const deletion of await deletions.all()) {
        const box = await boxOf(deletion)
        columns.add(Math.round(box.x))
        if (touch) {
          expect(Math.round(box.height)).toBeGreaterThanOrEqual(MIN_TARGET_PX)
        } else {
          expect(Math.round(box.height)).toBe(DESKTOP_CHOICE_PX)
        }
      }
      if (stacked) {
        expect(columns.size).toBe(2)
      } else if (touch) {
        const group = await boxOf(deletions.first().locator(".."))
        expect(columns.size).toBe(
          Math.min(
            Math.floor(
              (group.width + CHOICE_GAP_PX) /
                (CHOICE_COLUMN_MIN_PX + CHOICE_GAP_PX)
            ),
            BAN_MESSAGE_DELETIONS.length
          )
        )
        if (screen.width === 1024) {
          expect(columns.size).toBeGreaterThan(2)
        }
      }
      if (touch) {
        expect(await smallTargets(page, "main")).toEqual([])
      }
      expect(await horizontalOverflow(page)).toEqual({ scroll: 0, wider: [] })
    })
  })
}
