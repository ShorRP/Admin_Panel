import { STAFF_ROLE_ID } from "../playwright.config"
import { expect, test } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

test.use({
  discordState: { members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }] },
})

type ThemeWatch = {
  setBeforeBody: boolean
  atDomContentLoaded: string | undefined
}

type ThemedPage = {
  emulateMedia: (media: { colorScheme: "light" | "dark" }) => Promise<void>
  evaluate: (pageFunction: () => string) => Promise<string>
}

function watchTheme() {
  const watch: ThemeWatch = {
    setBeforeBody: false,
    atDomContentLoaded: undefined,
  }
  Object.assign(window, { themeWatch: watch })
  const observer = new MutationObserver(() => {
    watch.setBeforeBody = document.body === null
    observer.disconnect()
  })
  observer.observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: ["data-theme"],
  })
  document.addEventListener("DOMContentLoaded", () => {
    watch.atDomContentLoaded = document.documentElement.dataset.theme
  })
}

function themeWatch() {
  return (window as unknown as { themeWatch: ThemeWatch }).themeWatch
}

function bodyBackground() {
  return getComputedStyle(document.body).backgroundColor
}

function theme() {
  return {
    chosen: document.documentElement.dataset.theme,
    stored: localStorage.getItem("shor-panel-theme"),
  }
}

async function systemBackgrounds(page: ThemedPage) {
  const backgrounds = { light: "", dark: "" }
  for (const scheme of ["dark", "light"] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    backgrounds[scheme] = await page.evaluate(bodyBackground)
  }
  return backgrounds
}

test("under a light system, a staff member chooses « Sombre » in the sidebar, which darkens the page and is set again on reload before the body is read, then « Auto », which hands the page back to the system", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  const toggle = page
    .getByRole("complementary")
    .getByRole("group", { name: "Thème" })
  const auto = toggle.getByRole("button", { name: "Auto" })
  const dark = toggle.getByRole("button", { name: "Sombre" })

  await logIn(ALDIS)
  await expect(page).toHaveURL("/blocked-words")
  await page.waitForLoadState()
  await expect(auto).toHaveAttribute("aria-pressed", "true")
  const system = await systemBackgrounds(page)
  expect(system.dark).not.toBe(system.light)

  await dark.click()
  await expect(dark).toHaveAttribute("aria-pressed", "true")
  await expect(auto).toHaveAttribute("aria-pressed", "false")
  expect(await page.evaluate(theme)).toEqual({ chosen: "dark", stored: "dark" })
  expect(await page.evaluate(bodyBackground)).toBe(system.dark)
  await checkAccessibility()

  await page.addInitScript(watchTheme)
  await page.reload()
  await page.waitForLoadState()
  expect(await page.evaluate(themeWatch)).toEqual({
    setBeforeBody: true,
    atDomContentLoaded: "dark",
  })
  await expect(dark).toHaveAttribute("aria-pressed", "true")
  expect(await page.evaluate(bodyBackground)).toBe(system.dark)

  await auto.click()
  await expect(auto).toHaveAttribute("aria-pressed", "true")
  await expect(dark).toHaveAttribute("aria-pressed", "false")
  expect(await page.evaluate(theme)).toEqual({
    chosen: undefined,
    stored: null,
  })
  expect(await page.evaluate(bodyBackground)).toBe(system.light)
  await page.emulateMedia({ colorScheme: "dark" })
  expect(await page.evaluate(bodyBackground)).toBe(system.dark)
})

test("under a light system, the logged-out page offers the theme toggle, whose « Sombre » darkens the page and holds across a reload", async ({
  page,
  checkAccessibility,
}) => {
  const toggle = page.getByRole("group", { name: "Thème" })
  const dark = toggle.getByRole("button", { name: "Sombre" })

  await page.goto("/login/logged-out")
  await page.waitForLoadState()
  await expect(toggle.getByRole("button", { name: "Auto" })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
  const system = await systemBackgrounds(page)

  await dark.click()
  await expect(dark).toHaveAttribute("aria-pressed", "true")
  expect(await page.evaluate(bodyBackground)).toBe(system.dark)
  await checkAccessibility()

  await page.reload()
  await page.waitForLoadState()
  await expect(dark).toHaveAttribute("aria-pressed", "true")
  expect(await page.evaluate(bodyBackground)).toBe(system.dark)
})

test.describe("on a 360 px screen", () => {
  test.use({ viewport: { width: 360, height: 760 } })

  test("the menu offers the theme toggle, whose « Sombre » darkens the page", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    const menu = page.getByRole("dialog", { name: "Menu" })
    const dark = menu
      .getByRole("group", { name: "Thème" })
      .getByRole("button", { name: "Sombre" })

    await logIn(ALDIS)
    await expect(page).toHaveURL("/blocked-words")
    await page.waitForLoadState()
    const system = await systemBackgrounds(page)
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Ouvrir le menu" })
      .click()
    await expect(menu).toBeVisible()

    await dark.click()
    await expect(dark).toHaveAttribute("aria-pressed", "true")
    expect(await page.evaluate(bodyBackground)).toBe(system.dark)
    await checkAccessibility()
  })
})
