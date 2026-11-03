import { blockedWordAction } from "@/blocked-words/blocked-word-action"
import { newPanelRule } from "@/blocked-words/panel-rule"
import {
  BAN_ROLE_ID,
  MODERATION_ROLE_ID,
  STAFF_ROLE_ID,
} from "../playwright.config"
import { expect, test, type Locator, type Page } from "./fixtures"
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
  { path: `/records/${BRYNJA.id}`, fixme: true },
] as const

const PUBLIC_PAGES = [
  { path: "/privacy", fixme: true },
  { path: "/login/logged-out", fixme: true },
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

test("the navigation is a bar below md, a 64 px rail from md and a 252 px sidebar from lg, each naming its links alike", async ({
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
  const blockedWords = await boxOf(
    aside.getByRole("link", { name: ACCESSIBLE_NAMES[0], exact: true })
  )
  const count = await boxOf(
    aside
      .getByRole("link", { name: ACCESSIBLE_NAMES[0], exact: true })
      .getByText("2", { exact: true })
  )
  expect(count.x).toBeGreaterThan(blockedWords.x + blockedWords.width / 2)
  expect(count.y + count.height).toBeLessThan(
    blockedWords.y + blockedWords.height / 2
  )
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
      }
    })
  })
}
