import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
} from "discord-api-types/v10"

import { MODERATION_ROLE_ID, STAFF_ROLE_ID } from "../playwright.config"
import { startOfDialogOpening } from "./dialog-opening"
import { expect, test, type Page } from "./fixtures"

const ALDIS = { id: "1400000000000000001", username: "aldis" }

const PANEL_RULE_ID = "1500000000000000001"

test.use({
  discordState: { members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }] },
})

function keywordRule(id: string, name: string, keywords: string[]) {
  return {
    id,
    guild_id: "1100000000000000000",
    name,
    creator_id: ALDIS.id,
    event_type: AutoModerationRuleEventType.MessageSend,
    trigger_type: AutoModerationRuleTriggerType.Keyword,
    trigger_metadata: { keyword_filter: keywords },
    actions: [{ type: AutoModerationActionType.BlockMessage }],
    enabled: true,
    exempt_roles: [],
    exempt_channels: [],
  }
}

function recordViewTransitionNames() {
  new MutationObserver((records) => {
    for (const { target, oldValue } of records) {
      if (target instanceof HTMLLIElement) {
        for (const style of [oldValue, target.getAttribute("style")]) {
          const [, name] =
            /view-transition-name:\s*([^;\s]+)/.exec(style ?? "") ?? []
          if (name !== undefined && name !== "none") {
            target.dataset.viewTransitionName = name
          }
        }
      }
    }
  }).observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: ["style"],
    attributeOldValue: true,
  })
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(recordViewTransitionNames)
})

function animationsByWord() {
  const wordsByName = new Map(
    Array.from(document.querySelectorAll("li"), (item) => [
      item.dataset.viewTransitionName,
      item.querySelector("span")?.textContent ?? "",
    ])
  )
  const changes = document.getAnimations().flatMap(({ effect }) => {
    const [, pseudoElement, name] =
      /^(::view-transition-[a-z-]+)\((.+)\)$/.exec(
        (effect instanceof KeyframeEffect && effect.pseudoElement) || ""
      ) ?? []
    if (
      !(effect instanceof KeyframeEffect) ||
      pseudoElement === undefined ||
      name === undefined ||
      name === "root" ||
      effect.getComputedTiming().duration === 0
    ) {
      return []
    }
    const keyframes = effect.getKeyframes()
    const [first] = keyframes
    const timing = `${String(effect.getComputedTiming().duration)} ms ${first?.easing ?? ""}`
    return Object.keys(first ?? {})
      .filter(
        (property) =>
          !["offset", "computedOffset", "easing", "composite"].includes(
            property
          ) &&
          keyframes.some((keyframe) => keyframe[property] !== first?.[property])
      )
      .map((property) => ({
        word: wordsByName.get(name) ?? "the word removed",
        change: `${pseudoElement} ${property} ${timing}`,
      }))
  })
  return (
    changes.length > 0 &&
    Object.fromEntries(
      Object.entries(Object.groupBy(changes, ({ word }) => word)).map(
        ([word, changesOfWord = []]) => [
          word,
          changesOfWord.map(({ change }) => change).sort(),
        ]
      )
    )
  )
}

function capacity(page: Page) {
  return page.getByRole("group", { name: "Capacité" })
}

function toastTransitions() {
  const properties = Array.from(
    document.querySelectorAll('[data-slot="toast"]'),
    (toast) => toast.getAnimations()
  )
    .flat()
    .flatMap((animation) =>
      animation instanceof CSSTransition && animation.playState === "running"
        ? [animation.transitionProperty]
        : []
    )
  return properties.length > 0 && properties.sort()
}

test.describe("with motion, which this flow keeps", () => {
  test.use({ reducedMotion: "no-preference" })

  test("a staff member adds a blocked word, which fades into the list lighting up, then removes it, which fades out of it, each write saying so in a toast", async ({
    page,
    logIn,
    discord,
    checkAccessibility,
    readToast,
  }) => {
    await logIn(ALDIS)
    await page.goto("/blocked-words")
    await expect(page).toHaveTitle("Mots interdits – Panel de Shor")
    await expect(
      page.getByRole("heading", { level: 1, name: "Mots interdits" })
    ).toBeVisible()
    await expect(
      page.getByText("Aucun mot interdit pour l’instant.")
    ).toBeVisible()
    await expect(capacity(page)).toHaveText("Capacité0/ 3 000 mots")
    await checkAccessibility()
    await page.waitForFunction(() => document.activeViewTransition === null)

    const field = page.getByLabel("Ajouter un mot ou une expression")
    await field.fill("foo")
    const entering = page.waitForFunction(animationsByWord, undefined, {
      polling: "raf",
    })
    await page.getByRole("button", { name: "Ajouter" }).click()

    expect(await (await entering).jsonValue()).toEqual({
      foo: [
        "::view-transition-new backgroundColor 250 ms ease-out",
        "::view-transition-new opacity 250 ms ease-out",
      ],
    })

    await readToast(
      "« foo » est maintenant un mot interdit, action « Bloquer seulement »."
    )
    await expect(field).toHaveValue("")
    await expect(
      page.getByText("1 mot interdit", { exact: true })
    ).toBeVisible()
    await expect(capacity(page)).toHaveText("Capacité1/ 3 000 mots")
    expect(await discord.listAutoModerationRules()).toMatchObject([
      { trigger_metadata: { keyword_filter: ["foo"] } },
    ])
    await checkAccessibility()

    const leaving = page.waitForFunction(animationsByWord, undefined, {
      polling: "raf",
    })
    await page
      .getByRole("listitem")
      .filter({ hasText: "foo" })
      .getByRole("button", { name: "Retirer « foo »" })
      .click()

    expect(await (await leaving).jsonValue()).toEqual({
      "the word removed": ["::view-transition-old opacity 150 ms ease-out"],
    })

    await readToast(
      "« foo » n’est plus un mot interdit, action « Bloquer seulement »."
    )
    await expect(
      page.getByText("Aucun mot interdit pour l’instant.")
    ).toBeVisible()
    await expect(capacity(page)).toHaveText("Capacité0/ 3 000 mots")
    expect(await discord.listAutoModerationRules()).toMatchObject([
      { trigger_metadata: { keyword_filter: [] } },
    ])
    await checkAccessibility()
  })
})

for (const { title, prefersReducedMotion } of [
  {
    title: "under reduced motion, every test's default",
    prefersReducedMotion: true,
  },
  {
    title: "with motion, which a test can ask for",
    prefersReducedMotion: false,
  },
]) {
  test.describe(title, () => {
    if (!prefersReducedMotion) {
      test.use({ reducedMotion: "no-preference" })
    }

    test("a write's toast slides in and out unless motion is reduced, when it only fades", async ({
      page,
      logIn,
      checkAccessibility,
      toast,
      readToast,
    }) => {
      const message =
        "« banane » est maintenant un mot interdit, action « Bloquer seulement »."
      const moves = prefersReducedMotion ? ["opacity"] : ["transform"]

      await logIn(ALDIS)
      await page.goto("/blocked-words")
      await page.waitForLoadState()
      await page.getByLabel("Ajouter un mot ou une expression").fill("banane")
      const entering = page.waitForFunction(toastTransitions, undefined, {
        polling: "raf",
      })
      await page.getByRole("button", { name: "Ajouter" }).click()

      expect(await (await entering).jsonValue()).toEqual(moves)
      await readToast(message)
      await checkAccessibility()
      await toast(message).evaluate((element) =>
        Promise.all(element.getAnimations().map(({ finished }) => finished))
      )

      const leaving = page.waitForFunction(toastTransitions, undefined, {
        polling: "raf",
      })
      await toast(message).getByRole("button", { name: "Fermer" }).click()

      expect(await (await leaving).jsonValue()).toEqual(moves)
      await expect(toast(message)).toHaveCount(0)
    })

    test.describe("with two blocked words already", () => {
      test.use({
        discordState: {
          members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
          autoModerationRules: [
            keywordRule(PANEL_RULE_ID, "Mots interdits du panel", [
              "cerise",
              "abricot",
            ]),
          ],
        },
      })

      test("a blocked word added between the two pushes the next one into the following cell of the grid while the one before stays still, then removed lets it back, each word that moves sliding unless motion is reduced", async ({
        page,
        logIn,
        checkAccessibility,
        readToast,
      }) => {
        const words = page.getByRole("main").getByRole("listitem")
        const slides = ["::view-transition-group transform 250 ms ease-out"]

        await logIn(ALDIS)
        await page.goto("/blocked-words")
        await expect(
          page.getByText("2 mots interdits", { exact: true })
        ).toBeVisible()
        await page.waitForLoadState()
        await page.waitForFunction(() => document.activeViewTransition === null)
        expect(
          await page.evaluate(
            () => matchMedia("(prefers-reduced-motion: reduce)").matches
          )
        ).toBe(prefersReducedMotion)

        await page.getByLabel("Ajouter un mot ou une expression").fill("banane")
        const entering = page.waitForFunction(animationsByWord, undefined, {
          polling: "raf",
        })
        await page.getByRole("button", { name: "Ajouter" }).click()

        expect(await (await entering).jsonValue()).toEqual({
          banane: [
            "::view-transition-new backgroundColor 250 ms ease-out",
            "::view-transition-new opacity 250 ms ease-out",
          ],
          ...(!prefersReducedMotion && { cerise: slides }),
        })
        await readToast(
          "« banane » est maintenant un mot interdit, action « Bloquer seulement »."
        )
        await expect(words).toHaveText([/^abricot/, /^banane/, /^cerise/])
        await checkAccessibility()

        const leaving = page.waitForFunction(animationsByWord, undefined, {
          polling: "raf",
        })
        await words
          .filter({ hasText: "banane" })
          .getByRole("button", { name: "Retirer « banane »" })
          .click()

        expect(await (await leaving).jsonValue()).toEqual({
          "the word removed": ["::view-transition-old opacity 150 ms ease-out"],
          ...(!prefersReducedMotion && { cerise: slides }),
        })
        await readToast(
          "« banane » n’est plus un mot interdit, action « Bloquer seulement »."
        )
        await expect(words).toHaveText([/^abricot/, /^cerise/])
        await checkAccessibility()
      })
    })
  })
}

test("a write's toast stays while the staff member moves to another section, and coming back to the form adds no second toast", async ({
  page,
  logIn,
  checkAccessibility,
  toast,
  readToast,
}) => {
  const added =
    "« foo » est maintenant un mot interdit, action « Bloquer seulement »."
  const sections = page
    .getByRole("complementary")
    .getByRole("navigation", { name: "Sections du panel" })

  await logIn(ALDIS)
  await page.goto("/blocked-words")
  await page.waitForLoadState()
  await page.getByLabel("Ajouter un mot ou une expression").fill("foo")
  await page.getByRole("button", { name: "Ajouter" }).click()
  await readToast(added)
  await checkAccessibility()

  await sections.getByRole("link", { name: "Journal d’audit" }).click()
  await expect(
    page.getByRole("heading", { level: 1, name: "Journal d’audit" })
  ).toBeVisible()
  await readToast(added)
  await checkAccessibility()
  await toast(added).getByRole("button", { name: "Fermer" }).click()
  await expect(toast(added)).toHaveCount(0)

  await sections.getByRole("link", { name: "Mots interdits" }).click()
  await expect(
    page.getByRole("heading", { level: 1, name: "Mots interdits" })
  ).toBeVisible()
  await page.getByLabel("Ajouter un mot ou une expression").fill("bar")
  await page.getByRole("button", { name: "Ajouter" }).click()
  await readToast(
    "« bar » est maintenant un mot interdit, action « Bloquer seulement »."
  )
  await expect(toast()).toHaveCount(1)
})

test("the count beside « Mots interdits » follows each blocked word added and removed, in the sidebar, then in the bar's menu on a 360 px screen", async ({
  page,
  logIn,
  checkAccessibility,
  readToast,
}) => {
  const field = page.getByLabel("Ajouter un mot ou une expression")
  const remove = page.getByRole("button", { name: "Retirer « foo »" })
  const sidebarLink = page
    .getByRole("complementary")
    .getByRole("link", { name: /^Mots interdits/ })
  const openMenu = page
    .getByRole("banner")
    .getByRole("button", { name: "Ouvrir le menu" })
  const menu = page.getByRole("dialog", { name: "Menu" })
  const menuLink = menu.getByRole("link", { name: /^Mots interdits/ })

  await logIn(ALDIS)
  await page.goto("/blocked-words")
  await expect(sidebarLink).toHaveAccessibleName("Mots interdits 0 mot")
  await page.waitForLoadState()

  await field.fill("foo")
  await page.getByRole("button", { name: "Ajouter" }).click()
  await readToast(
    "« foo » est maintenant un mot interdit, action « Bloquer seulement »."
  )
  await expect(sidebarLink).toHaveAccessibleName("Mots interdits 1 mot")
  await expect(sidebarLink).toHaveText("Mots interdits11 mot")
  await checkAccessibility()

  await remove.click()
  await readToast(
    "« foo » n’est plus un mot interdit, action « Bloquer seulement »."
  )
  await expect(sidebarLink).toHaveAccessibleName("Mots interdits 0 mot")

  await page.setViewportSize({ width: 360, height: 760 })
  await openMenu.click()
  await expect(menuLink).toHaveAccessibleName("Mots interdits 0 mot")
  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()

  await field.fill("foo")
  await page.getByRole("button", { name: "Ajouter" }).click()
  await readToast(
    "« foo » est maintenant un mot interdit, action « Bloquer seulement »."
  )
  await openMenu.click()
  await expect(menuLink).toHaveAccessibleName("Mots interdits 1 mot")
  await checkAccessibility()
  await page.keyboard.press("Escape")
  await expect(menu).toBeHidden()

  await remove.click()
  await readToast(
    "« foo » n’est plus un mot interdit, action « Bloquer seulement »."
  )
  await openMenu.click()
  await expect(menuLink).toHaveAccessibleName("Mots interdits 0 mot")
})

test("a refused blocked word stays in the field, which its message describes, and makes no toast", async ({
  page,
  logIn,
  checkAccessibility,
  toast,
  readToast,
}) => {
  const tooLong = "é".repeat(61)
  await logIn(ALDIS)
  await page.goto("/blocked-words")

  const field = page.getByLabel("Ajouter un mot ou une expression")
  await field.fill(tooLong)
  await page.getByRole("button", { name: "Ajouter" }).click()

  await expect(field).toHaveAccessibleDescription(
    "Raccourcis ce mot : AutoMod n’accepte pas plus de 60 caractères."
  )
  await expect(field).toHaveValue(tooLong)
  await checkAccessibility()

  await field.fill("foo")
  await page.getByRole("button", { name: "Ajouter" }).click()
  await readToast(
    "« foo » est maintenant un mot interdit, action « Bloquer seulement »."
  )
  await expect(toast()).toHaveCount(1)
  await checkAccessibility()
})

test.describe("for a staff member who moderates", () => {
  test.use({
    discordState: {
      members: [{ user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] }],
    },
  })

  test("a moderator adds a word with « Exclusion 1 heure », which its tile names and its toast announces, which the Discord server holds in that action's rule, sparing the staff role, then removes it", async ({
    page,
    logIn,
    discord,
    checkAccessibility,
    readToast,
  }) => {
    const action = page.getByLabel("Action", { exact: true })
    const tile = page
      .getByRole("region", { name: "La liste" })
      .getByRole("listitem")
      .filter({ hasText: "foo" })

    await logIn(ALDIS)
    await page.goto("/blocked-words")
    await expect(action.locator("option")).toHaveText([
      "Bloquer seulement",
      "Exclusion 1 heure",
      "Exclusion 1 jour",
    ])
    await expect(action).toHaveValue("block")
    await page.waitForLoadState()

    await page.getByLabel("Ajouter un mot ou une expression").fill("foo")
    await action.selectOption({ label: "Exclusion 1 heure" })
    await page.getByRole("button", { name: "Ajouter" }).click()

    await readToast(
      "« foo » est maintenant un mot interdit, action « Exclusion 1 heure »."
    )
    await expect(tile).toContainText("Exclusion 1 heure")
    await expect(action).toHaveValue("block")
    await expect(capacity(page)).toHaveText("Capacité1/ 3 000 mots")
    expect(await discord.listAutoModerationRules()).toMatchObject([
      {
        name: "Mots interdits du panel · exclusion 1 heure",
        trigger_metadata: { keyword_filter: ["foo"] },
        exempt_roles: [STAFF_ROLE_ID],
        actions: [
          { type: AutoModerationActionType.BlockMessage },
          {
            type: AutoModerationActionType.Timeout,
            metadata: { duration_seconds: 3600 },
          },
        ],
      },
    ])
    await checkAccessibility()

    await tile.getByRole("button", { name: "Retirer « foo »" }).click()

    await readToast(
      "« foo » n’est plus un mot interdit, action « Exclusion 1 heure »."
    )
    await expect(
      page.getByText("Aucun mot interdit pour l’instant.")
    ).toBeVisible()
    await expect(capacity(page)).toHaveText("Capacité0/ 3 000 mots")
    expect(await discord.listAutoModerationRules()).toMatchObject([
      { trigger_metadata: { keyword_filter: [] } },
    ])
    await checkAccessibility()
  })

  test("a refused word stays in the field with its action, whose rule's name the message gives, and makes no toast", async ({
    page,
    logIn,
    checkAccessibility,
    toast,
    readToast,
  }) => {
    const field = page.getByLabel("Ajouter un mot ou une expression")
    const action = page.getByLabel("Action", { exact: true })
    const add = page.getByRole("button", { name: "Ajouter" })

    await logIn(ALDIS)
    await page.goto("/blocked-words")
    await page.waitForLoadState()
    await field.fill("foo")
    await add.click()
    await readToast(
      "« foo » est maintenant un mot interdit, action « Bloquer seulement »."
    )

    await field.fill("FOO")
    await action.selectOption({ label: "Exclusion 1 jour" })
    await add.click()

    await expect(field).toHaveAccessibleDescription(
      "« foo » est déjà un mot interdit, action « Bloquer seulement »."
    )
    await expect(field).toHaveValue("FOO")
    await expect(action).toHaveValue("timeout-1d")
    await expect(toast()).toHaveCount(1)
    await checkAccessibility()
  })
})

function tilesOf(page: Page) {
  return page.getByRole("region", { name: "La liste" }).getByRole("listitem")
}

function pencilOf(page: Page, word: string) {
  return tilesOf(page)
    .filter({ hasText: word })
    .getByRole("button", { name: `Changer l’action de « ${word} »` })
}

function changeDialogOf(page: Page, word: string) {
  return page.getByRole("dialog", { name: `Changer l’action de « ${word} »` })
}

test.describe("for a staff member who moderates, with two words that only block", () => {
  test.use({
    discordState: {
      members: [{ user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] }],
      autoModerationRules: [
        keywordRule(PANEL_RULE_ID, "Mots interdits du panel", ["foo", "bar"]),
      ],
    },
  })

  test("a moderator changes a word's action through the pencil and its dialog, which a toast announces, which the tile names, and which the Discord server holds in the new action's rule alone, while « Annuler » and Escape write nothing", async ({
    page,
    logIn,
    discord,
    checkAccessibility,
    readToast,
  }) => {
    const dialog = changeDialogOf(page, "foo")
    const action = dialog.getByLabel("Action", { exact: true })
    const rules = await discord.listAutoModerationRules()

    await logIn(ALDIS)
    await page.goto("/blocked-words")
    await page.waitForLoadState()
    await expect(
      tilesOf(page).filter({ hasText: "foo" }).getByRole("button")
    ).toHaveText(["Changer l’action de « foo »", "Retirer « foo »"])

    await pencilOf(page, "foo").click()

    await expect(dialog).toBeVisible()
    await expect(action).toHaveValue("block")
    await expect(action.locator("option")).toHaveText([
      "Bloquer seulement",
      "Exclusion 1 heure",
      "Exclusion 1 jour",
    ])
    await expect(dialog.getByRole("button")).toHaveText(["Annuler", "Changer"])
    await checkAccessibility()

    await action.selectOption({ label: "Exclusion 1 jour" })
    await dialog.getByRole("button", { name: "Annuler" }).click()

    await expect(dialog).toHaveCount(0)
    await expect(pencilOf(page, "foo")).toBeFocused()
    await pencilOf(page, "foo").click()
    await expect(dialog).toBeVisible()
    await expect(action).toHaveValue("block")
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
    expect(await discord.listAutoModerationRules()).toEqual(rules)
    expect((await discord.getAuditLog({})).audit_log_entries).toEqual([])

    await pencilOf(page, "foo").click()
    await action.selectOption({ label: "Exclusion 1 jour" })
    await dialog.getByRole("button", { name: "Changer" }).click()

    await expect(dialog).toHaveCount(0)
    await readToast("« foo » passe à « Exclusion 1 jour ».")
    await expect(tilesOf(page)).toHaveText([
      /^barBloquer seulement/,
      /^fooExclusion 1 jour/,
    ])
    expect(await discord.listAutoModerationRules()).toMatchObject([
      {
        name: "Mots interdits du panel",
        trigger_metadata: { keyword_filter: ["bar"] },
      },
      {
        name: "Mots interdits du panel · exclusion 1 jour",
        trigger_metadata: { keyword_filter: ["foo"] },
        exempt_roles: [STAFF_ROLE_ID],
        actions: [
          { type: AutoModerationActionType.BlockMessage },
          {
            type: AutoModerationActionType.Timeout,
            metadata: { duration_seconds: 86400 },
          },
        ],
      },
    ])
    const { audit_log_entries } = await discord.getAuditLog({})
    expect(
      audit_log_entries.map(({ reason }) => reason?.split(": ")[1])
    ).toEqual([
      "« foo » passe de « Bloquer seulement » à « Exclusion 1 jour »",
      "« foo » passe de « Bloquer seulement » à « Exclusion 1 jour »",
    ])
    await checkAccessibility()

    await pencilOf(page, "foo").click()
    await expect(action).toHaveValue("timeout-1d")
    await dialog.getByRole("button", { name: "Annuler" }).click()
    await expect(dialog).toHaveCount(0)

    await page.goto("/audit-log")
    await expect(
      page
        .getByRole("main")
        .getByText(
          "« foo » passe de « Bloquer seulement » à « Exclusion 1 jour »"
        )
    ).toHaveCount(1)
    await checkAccessibility()
  })

  test("the tile of a word whose action changes keeps its place among the others", async ({
    page,
    logIn,
    readToast,
  }) => {
    await logIn(ALDIS)
    await page.goto("/blocked-words")
    await page.waitForLoadState()

    await pencilOf(page, "bar").click()
    await changeDialogOf(page, "bar")
      .getByLabel("Action", { exact: true })
      .selectOption({ label: "Exclusion 1 heure" })
    await changeDialogOf(page, "bar")
      .getByRole("button", { name: "Changer" })
      .click()

    await readToast("« bar » passe à « Exclusion 1 heure ».")
    await expect(tilesOf(page)).toHaveText([
      /^barExclusion 1 heure/,
      /^fooBloquer seulement/,
    ])
  })

  for (const { title, prefersReducedMotion } of [
    {
      title: "under reduced motion, every test's default",
      prefersReducedMotion: true,
    },
    {
      title: "with motion, which a test can ask for",
      prefersReducedMotion: false,
    },
  ]) {
    test.describe(title, () => {
      if (!prefersReducedMotion) {
        test.use({ reducedMotion: "no-preference" })
      }

      test("the dialog that changes an action fades in, and zooms in only with motion", async ({
        page,
        logIn,
        checkAccessibility,
      }) => {
        await logIn(ALDIS)
        await page.goto("/blocked-words")
        await page.waitForLoadState()

        const opening = startOfDialogOpening(page)
        await pencilOf(page, "foo").click()

        expect(await (await opening).jsonValue()).toEqual({
          opacity: "0",
          scale: prefersReducedMotion ? 1 : 0.95,
        })
        await expect(changeDialogOf(page, "foo")).toBeVisible()
        await checkAccessibility()
      })
    })
  }

  test.describe("on a 360 px screen", () => {
    test.use({ viewport: { width: 360, height: 760 } })

    test("the dialog fits the screen, and offers « Annuler », then « Changer » beside it", async ({
      page,
      logIn,
      checkAccessibility,
    }) => {
      const dialog = changeDialogOf(page, "foo")

      await logIn(ALDIS)
      await page.goto("/blocked-words")
      await page.waitForLoadState()
      await pencilOf(page, "foo").click()

      await expect(dialog).toBeVisible()
      await checkAccessibility()
      const box = await dialog.boundingBox()
      const cancel = await dialog
        .getByRole("button", { name: "Annuler" })
        .boundingBox()
      const change = await dialog
        .getByRole("button", { name: "Changer" })
        .boundingBox()
      expect(box?.x).toBeGreaterThanOrEqual(0)
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360)
      expect(change?.y).toBe(cancel?.y)
      expect(change?.x).toBeGreaterThanOrEqual(
        (cancel?.x ?? 0) + (cancel?.width ?? 0)
      )
    })
  })
})

test.describe("for a staff member who moderates, with no room on the Discord server for the rule of another action", () => {
  test.use({
    discordState: {
      members: [{ user: ALDIS, roles: [STAFF_ROLE_ID, MODERATION_ROLE_ID] }],
      autoModerationRules: [
        keywordRule(PANEL_RULE_ID, "Mots interdits du panel", ["foo"]),
        ...[1, 2, 3, 4, 5].map((index) =>
          keywordRule(`150000000000000010${index}`, `Règle ${index}`, ["mot"])
        ),
      ],
    },
  })

  test("a refused change closes the dialog, leaves the tile as it was, and says why in the list's alert region, with no toast", async ({
    page,
    logIn,
    discord,
    checkAccessibility,
    toast,
  }) => {
    const rules = await discord.listAutoModerationRules()

    await logIn(ALDIS)
    await page.goto("/blocked-words")
    await page.waitForLoadState()
    await pencilOf(page, "foo").click()
    await changeDialogOf(page, "foo")
      .getByLabel("Action", { exact: true })
      .selectOption({ label: "Exclusion 1 jour" })
    await changeDialogOf(page, "foo")
      .getByRole("button", { name: "Changer" })
      .click()

    await expect(
      page.getByRole("region", { name: "La liste" }).getByRole("alert")
    ).toHaveText(
      "Le serveur Discord a déjà 6 règles AutoMod de mots-clés : le panel ne peut pas y créer la règle « Exclusion 1 jour ». Supprimes-en une dans Discord, ou choisis une autre action."
    )
    await expect(changeDialogOf(page, "foo")).toHaveCount(0)
    await expect(tilesOf(page)).toHaveText([/^fooBloquer seulement/])
    await expect(toast()).toHaveCount(0)
    expect(await discord.listAutoModerationRules()).toEqual(rules)
    await checkAccessibility()
  })
})

test.describe("for a staff member who does not moderate, with a word that times out already", () => {
  test.use({
    discordState: {
      members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
      autoModerationRules: [
        keywordRule(PANEL_RULE_ID, "Mots interdits du panel", ["abricot"]),
        {
          ...keywordRule(
            "1500000000000000002",
            "Mots interdits du panel · exclusion 1 heure",
            ["cerise"]
          ),
          actions: [
            { type: AutoModerationActionType.BlockMessage },
            {
              type: AutoModerationActionType.Timeout,
              metadata: { duration_seconds: 3600 },
            },
          ],
        },
      ],
    },
  })

  test("the staff member is offered « Bloquer seulement » alone, and sees every word with its action, a cross and no pencil on the word that only blocks and no button on the word that times out", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    const tiles = page
      .getByRole("region", { name: "La liste" })
      .getByRole("listitem")

    await logIn(ALDIS)
    await page.goto("/blocked-words")

    await expect(
      page.getByLabel("Action", { exact: true }).locator("option")
    ).toHaveText(["Bloquer seulement"])
    await expect(tiles).toHaveText([
      /^abricotBloquer seulement/,
      /^ceriseExclusion 1 heure/,
    ])
    await expect(
      tiles.filter({ hasText: "abricot" }).getByRole("button")
    ).toHaveAccessibleName("Retirer « abricot »")
    await expect(
      tiles.filter({ hasText: "cerise" }).getByRole("button")
    ).toHaveCount(0)
    await expect(capacity(page)).toHaveText("Capacité2/ 3 000 mots")
    await expect(
      page.getByRole("button", { name: /^Changer l’action de/ })
    ).toHaveCount(0)
    await page.waitForLoadState()
    await checkAccessibility()
  })
})

test("the page says whom the blocked words spare", async ({
  page,
  logIn,
  checkAccessibility,
}) => {
  await logIn(ALDIS)
  await page.goto("/blocked-words")

  await expect(
    page.getByText(
      "Les mots interdits ne s’appliquent ni au propriétaire du serveur Discord, ni aux membres qui ont la permission « Administrateur » ou « Gérer le serveur »."
    )
  ).toBeVisible()
  await expect(
    page.getByText("Aucun mot interdit pour l’instant.")
  ).toBeVisible()
  await checkAccessibility()
})

test.describe("with sixty blocked words, one of sixty characters, and another AutoMod rule", () => {
  const longWord = "a".repeat(60)

  test.use({
    discordState: {
      members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
      autoModerationRules: [
        keywordRule(PANEL_RULE_ID, "Mots interdits du panel", [
          longWord,
          ...Array.from(
            { length: 59 },
            (_, index) => `mot${String(index).padStart(2, "0")}`
          ),
        ]),
        keywordRule("1500000000000000002", "Liens suspects", [
          "bit.ly/",
          "discord.gg/",
          "gift.steam",
        ]),
      ],
    },
  })

  test("the side column sits beside the list where both fit and sticks there as the page scrolls, then goes under it at 360 px, a rule opens its keywords, and a word too long for its tile is cut on screen while its tile gives it whole", async ({
    page,
    logIn,
    checkAccessibility,
  }) => {
    const list = page.getByRole("region", { name: "La liste" })
    const exceptions = page.getByRole("region", { name: "Exceptions" })

    await logIn(ALDIS)
    await page.goto("/blocked-words")
    await expect(list.getByRole("listitem")).toHaveCount(60)
    await expect(capacity(page)).toHaveText("Capacité60/ 3 000 mots")
    await page.waitForLoadState()

    const listBox = await list.boundingBox()
    const exceptionsBox = await exceptions.boundingBox()
    expect(exceptionsBox?.x).toBeGreaterThan(
      (listBox?.x ?? Infinity) + (listBox?.width ?? 0)
    )
    await page.evaluate(() => {
      window.scrollTo(0, 600)
    })
    await expect.poll(async () => (await exceptions.boundingBox())?.y).toBe(24)

    const rule = page
      .getByRole("listitem")
      .filter({ hasText: "Liens suspects" })
    const summary = rule.locator("summary")
    await expect(summary).toHaveText("Liens suspects3 mots-clés")
    await summary.click()
    await expect(rule.getByRole("listitem")).toHaveText([
      "bit.ly/",
      "discord.gg/",
      "gift.steam",
    ])

    const longTile = list.getByRole("listitem").filter({ hasText: longWord })
    const longText = longTile.getByText(longWord, { exact: true })
    await expect(longTile).toHaveAttribute("title", longWord)
    await expect(longText).toBeVisible()
    expect(
      await longText.evaluate(
        ({ scrollWidth, clientWidth }) => scrollWidth > clientWidth
      )
    ).toBe(true)
    await checkAccessibility()

    await page.setViewportSize({ width: 360, height: 720 })
    const narrowListBox = await list.boundingBox()
    expect((await exceptions.boundingBox())?.y).toBeGreaterThanOrEqual(
      (narrowListBox?.y ?? Infinity) + (narrowListBox?.height ?? 0)
    )
  })
})

test.describe("with four blocked words", () => {
  test.use({
    discordState: {
      members: [{ user: ALDIS, roles: [STAFF_ROLE_ID] }],
      autoModerationRules: [
        keywordRule(PANEL_RULE_ID, "Mots interdits du panel", [
          "abricot",
          "free nitro",
          "Nitro gratuit",
          "steamcommunity.ru",
        ]),
      ],
    },
  })

  test("a staff member filters the list by what a word contains, whatever its case, removes and adds words without losing the filter, a word added that does not pass it staying out of the list, finds none for another text, then shows the whole list again", async ({
    page,
    logIn,
    discord,
    checkAccessibility,
    readToast,
  }) => {
    const list = page.getByRole("region", { name: "La liste" })
    const words = list.getByRole("listitem")
    const field = page.getByLabel("Filtrer la liste")
    const showAll = list.getByRole("link", { name: "Tout afficher" })
    const addField = page.getByLabel("Ajouter un mot ou une expression")
    const add = page.getByRole("button", { name: "Ajouter" })

    await logIn(ALDIS)
    await page.goto("/blocked-words")
    await expect(
      list.getByText("4 mots interdits", { exact: true })
    ).toBeVisible()
    await expect(showAll).toHaveCount(0)
    await page.waitForLoadState()

    await field.fill("NITRO")
    await page.getByRole("button", { name: "Filtrer", exact: true }).click()

    await expect(page).toHaveURL("/blocked-words?query=NITRO")
    await expect(words).toHaveText([/^free nitro/, /^Nitro gratuit/])
    await expect(list.getByText("2 sur 4", { exact: true })).toBeVisible()
    await expect(field).toHaveValue("NITRO")
    await expect(capacity(page)).toHaveText("Capacité4/ 3 000 mots")
    await checkAccessibility()

    await words
      .filter({ hasText: "free nitro" })
      .getByRole("button", { name: "Retirer « free nitro »" })
      .click()

    await readToast(
      "« free nitro » n’est plus un mot interdit, action « Bloquer seulement »."
    )
    await expect(page).toHaveURL("/blocked-words?query=NITRO")
    await expect(words).toHaveText([/^Nitro gratuit/])
    await expect(list.getByText("1 sur 3", { exact: true })).toBeVisible()
    await expect(field).toHaveValue("NITRO")
    expect(await discord.listAutoModerationRules()).toMatchObject([
      {
        trigger_metadata: {
          keyword_filter: ["abricot", "Nitro gratuit", "steamcommunity.ru"],
        },
      },
    ])
    await checkAccessibility()

    await addField.fill("zèbre")
    await add.click()

    await readToast(
      "« zèbre » est maintenant un mot interdit, action « Bloquer seulement »."
    )
    await expect(page).toHaveURL("/blocked-words?query=NITRO")
    await expect(words).toHaveText([/^Nitro gratuit/])
    await expect(list.getByText("1 sur 4", { exact: true })).toBeVisible()
    await expect(capacity(page)).toHaveText("Capacité4/ 3 000 mots")

    await addField.fill("nitro boost")
    await add.click()

    await readToast(
      "« nitro boost » est maintenant un mot interdit, action « Bloquer seulement »."
    )
    await expect(page).toHaveURL("/blocked-words?query=NITRO")
    await expect(words).toHaveText([/^nitro boost/, /^Nitro gratuit/])
    await expect(list.getByText("2 sur 5", { exact: true })).toBeVisible()
    await expect(field).toHaveValue("NITRO")
    await checkAccessibility()

    await field.fill("xyz")
    await page.getByRole("button", { name: "Filtrer", exact: true }).click()

    await expect(page).toHaveURL("/blocked-words?query=xyz")
    await expect(
      list.getByText("Aucun mot interdit ne contient « xyz ».")
    ).toBeVisible()
    await expect(list.getByText("0 sur 5", { exact: true })).toBeVisible()
    await expect(words).toHaveCount(0)
    await checkAccessibility()

    await showAll.click()

    await expect(page).toHaveURL("/blocked-words")
    await expect(words).toHaveText([
      /^abricot/,
      /^nitro boost/,
      /^Nitro gratuit/,
      /^steamcommunity\.ru/,
      /^zèbre/,
    ])
    await expect(
      list.getByText("5 mots interdits", { exact: true })
    ).toBeVisible()
    await expect(field).toHaveValue("")
    await expect(showAll).toHaveCount(0)
    await checkAccessibility()
  })
})
